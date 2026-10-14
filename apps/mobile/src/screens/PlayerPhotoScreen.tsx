import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat, FlipType } from 'expo-image-manipulator';
import { ErrorBanner, Loading, PrimaryButton } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import {
  deletePlayerPhoto,
  listPlayerPhotos,
  PlayerPhoto,
  setPrimaryPlayerPhoto,
  uploadPlayerPhoto,
} from '../api/players';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerPhoto'>;

const TARGET_ASPECT = 3 / 4;
const OUTPUT_WIDTH = 600;

function cropActions(width: number, height: number): ImagePickerAction[] {
  let cropWidth = width;
  let cropHeight = Math.round(width / TARGET_ASPECT);
  if (cropHeight > height) {
    cropHeight = height;
    cropWidth = Math.round(height * TARGET_ASPECT);
  }
  return [
    {
      crop: {
        originX: Math.max(0, Math.round((width - cropWidth) / 2)),
        originY: Math.max(0, Math.round((height - cropHeight) / 2)),
        width: cropWidth,
        height: cropHeight,
      },
    },
    { resize: { width: OUTPUT_WIDTH } },
  ];
}

type ImagePickerAction =
  | { crop: { originX: number; originY: number; width: number; height: number } }
  | { resize: { width?: number; height?: number } }
  | { rotate: number }
  | { flip: FlipType };

interface Draft {
  uri: string;
  width: number;
  height: number;
  rotation: number;
}

export default function PlayerPhotoScreen({ route, navigation }: Props) {
  const { playerId, playerName, playerAge } = route.params;
  const { token } = useAuth();
  const [photos, setPhotos] = useState<PlayerPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [makePublic, setMakePublic] = useState(false);

  const canPublish = playerAge == null || playerAge >= 18;

  useEffect(() => {
    navigation.setOptions({ title: playerName ? `Fotos de ${playerName}` : 'Fotografías' });
  }, [navigation, playerName]);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await listPlayerPhotos(token, playerId);
        setPhotos(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las fotografías.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [playerId, token],
  );

  useEffect(() => {
    load();
  }, [load]);

  const applyAsset = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    setDraft({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      rotation: 0,
    });
  }, []);

  const takePhoto = useCallback(async () => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Sin permiso de cámara no puedes tomar la fotografía. Puedes elegir una de la galería.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      applyAsset(result.assets[0]);
    }
  }, [applyAsset]);

  const pickFromGallery = useCallback(async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Sin permiso de galería no puedes seleccionar la imagen. Puedes tomar una foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      applyAsset(result.assets[0]);
    }
  }, [applyAsset]);

  const rotateDraft = useCallback(() => {
    setDraft((current) => (current ? { ...current, rotation: (current.rotation + 90) % 360 } : current));
  }, []);

  const save = useCallback(async () => {
    if (!token || !draft) return;
    setBusy(true);
    setError(null);
    try {
      const swap = draft.rotation % 180 !== 0;
      const rotatedWidth = swap ? draft.height : draft.width;
      const rotatedHeight = swap ? draft.width : draft.height;
      const actions: ImagePickerAction[] = [];
      if (draft.rotation !== 0) actions.push({ rotate: draft.rotation });
      actions.push(...cropActions(rotatedWidth, rotatedHeight));
      const processed = await manipulateAsync(draft.uri, actions, {
        compress: 0.85,
        format: SaveFormat.JPEG,
      });
      await uploadPlayerPhoto(
        token,
        playerId,
        { uri: processed.uri, name: 'photo.jpg', type: 'image/jpeg' },
        makePublic,
      );
      setDraft(null);
      await load('refresh');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la fotografía.');
    } finally {
      setBusy(false);
    }
  }, [draft, load, makePublic, playerId, token]);

  const setPrimary = useCallback(
    async (photoId: string) => {
      if (!token) return;
      setBusy(true);
      try {
        await setPrimaryPlayerPhoto(token, playerId, photoId);
        await load('refresh');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo actualizar la portada.');
      } finally {
        setBusy(false);
      }
    },
    [load, playerId, token],
  );

  const remove = useCallback(
    async (photoId: string) => {
      if (!token) return;
      setBusy(true);
      try {
        await deletePlayerPhoto(token, playerId, photoId);
        await load('refresh');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo eliminar la fotografía.');
      } finally {
        setBusy(false);
      }
    },
    [load, playerId, token],
  );

  if (!token) {
    return (
      <View style={styles.center}>
        <ErrorBanner message="Inicia sesión para gestionar fotografías." />
      </View>
    );
  }

  if (loading) {
    return <Loading label="Cargando fotografías…" />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
    >
      {error ? <ErrorBanner message={error} /> : null}

      {draft ? (
        <View style={styles.editor}>
          <Text style={styles.editorTitle}>Ajusta la fotografía</Text>
          <Image
            source={{ uri: draft.uri }}
            style={[
              styles.editorImage,
              { transform: [{ rotate: `${draft.rotation}deg` }] },
            ]}
            resizeMode="cover"
          />
          <Text style={styles.editorHint}>
            Encuadre 3:4. Usa girar si la orientación no es la correcta.
          </Text>
          {canPublish ? (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Publicar en el perfil</Text>
              <Switch value={makePublic} onValueChange={setMakePublic} trackColor={{ true: colors.green }} />
            </View>
          ) : (
            <Text style={styles.editorHint}>Se guardará como privada (menor de edad).</Text>
          )}
          <View style={styles.editorActions}>
            <PrimaryButton title="Girar" variant="outline" onPress={rotateDraft} disabled={busy} />
            <PrimaryButton
              title="Guardar fotografía"
              onPress={save}
              loading={busy}
            />
          </View>
          <PrimaryButton title="Cancelar" variant="outline" onPress={() => setDraft(null)} disabled={busy} />
        </View>
      ) : (
        <View style={styles.actions}>
          <PrimaryButton title="Tomar foto" onPress={takePhoto} disabled={busy} />
          <PrimaryButton title="Elegir de galería" variant="outline" onPress={pickFromGallery} disabled={busy} />
        </View>
      )}

      <Text style={styles.sectionTitle}>Galería</Text>
      {photos.length === 0 ? (
        <Text style={styles.empty}>Aún no hay fotografías.</Text>
      ) : (
        <View style={styles.grid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.card}>
              <Image source={{ uri: photo.thumbUrl }} style={styles.cardImage} />
              <View style={styles.cardBadges}>
                {photo.isPrimary ? <Text style={styles.badgePrimary}>Principal</Text> : null}
                <Text style={[styles.badge, photo.visibility === 'public' ? styles.badgePublic : styles.badgePrivate]}>
                  {photo.visibility === 'public' ? 'Pública' : 'Privada'}
                </Text>
              </View>
              <View style={styles.cardActions}>
                {!photo.isPrimary ? (
                  <Pressable style={styles.cardButton} disabled={busy} onPress={() => setPrimary(photo.id)}>
                    <Text style={styles.cardButtonText}>Portada</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.cardButton, styles.cardButtonDanger]}
                  disabled={busy}
                  onPress={() => remove(photo.id)}
                >
                  <Text style={styles.cardButtonDangerText}>Eliminar</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  actions: { gap: 10, marginBottom: 20 },
  sectionTitle: { fontWeight: '800', fontSize: 16, color: colors.ink, marginBottom: 10 },
  empty: { color: colors.muted },
  editor: { gap: 12, marginBottom: 20 },
  editorTitle: { fontWeight: '800', fontSize: 16, color: colors.ink },
  editorImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 14,
    backgroundColor: '#eef0f0',
  },
  editorHint: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
  editorActions: { gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.card,
    padding: 8,
  },
  cardImage: { width: '100%', aspectRatio: 3 / 4, borderRadius: 10, backgroundColor: '#eef0f0' },
  cardBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge: { fontSize: 10, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  badgePrimary: { fontSize: 10, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.green, color: colors.white, overflow: 'hidden' },
  badgePublic: { backgroundColor: '#dcefe2', color: colors.green },
  badgePrivate: { backgroundColor: '#f2e7d6', color: '#8a5a00' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  cardButton: { flex: 1, backgroundColor: colors.green, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  cardButtonText: { color: colors.white, fontWeight: '800', fontSize: 11 },
  cardButtonDanger: { backgroundColor: '#fdecea', borderWidth: 1, borderColor: '#f5c6c1' },
  cardButtonDangerText: { color: colors.danger, fontWeight: '800', fontSize: 11 },
});
