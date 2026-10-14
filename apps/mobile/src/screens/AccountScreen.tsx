import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ErrorBanner, Loading, PrimaryButton, TextField } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { extractAuthorizationToken } from '../api/authorization';
import { resolveAuthorization } from '../api/tournaments';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const AUTH_REASON_MESSAGES: Record<string, string> = {
  not_found: 'El enlace de autorización no existe o no es válido.',
  revoked: 'Este enlace de autorización fue revocado.',
  exhausted: 'Este enlace de autorización alcanzó su límite de usos.',
  expired: 'Este enlace de autorización ha vencido.',
};

export default function AccountScreen() {
  const navigation = useNavigation<Nav>();
  const { status, user, signOut, authorizationToken, activateAuthorization, clearAuthorization } =
    useAuth();
  const [authInput, setAuthInput] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNote, setAuthNote] = useState<string | null>(null);

  const submitAuthorization = async () => {
    const parsed = extractAuthorizationToken(authInput);
    if (!parsed) {
      setAuthError('Pega el enlace o token de autorización.');
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    setAuthNote(null);
    try {
      const resolved = await resolveAuthorization(parsed);
      if (!resolved.valid || !resolved.tournament) {
        setAuthError(AUTH_REASON_MESSAGES[resolved.reason ?? 'not_found']);
        return;
      }
      await activateAuthorization(parsed);
      setAuthInput('');
      setAuthNote(`Autorización activa para ${resolved.tournament.name}.`);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'El enlace no es válido o fue revocado.');
    } finally {
      setAuthBusy(false);
    }
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (status !== 'authenticated' || !user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.guest}>
          <Text style={styles.eyebrow}>CUENTA</Text>
          <Text style={styles.title}>Únete a Cancha+</Text>
          <Text style={styles.subtitle}>
            Solo te tomará un minuto. Podrás seguir torneos desde el primer ingreso.
          </Text>
          <PrimaryButton title="Iniciar sesión" onPress={() => navigation.navigate('Login')} />
          <PrimaryButton
            title="Crear una cuenta"
            variant="outline"
            onPress={() => navigation.navigate('Register')}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>CUENTA</Text>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.displayName.trim().charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user.displayName}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Estado de cuenta</Text>
          <Text style={styles.cardValue}>Activa · Sesión iniciada</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Autorización de cambios</Text>
          {authorizationToken ? (
            <>
              <Text style={styles.cardValue}>
                Enlace activo · podrás inscribir o editar tu equipo aunque el torneo ya haya
                iniciado.
              </Text>
              <View style={styles.cardAction}>
                <PrimaryButton
                  title="Quitar autorización"
                  variant="outline"
                  onPress={() => {
                    setAuthNote(null);
                    setAuthError(null);
                    clearAuthorization();
                  }}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.cardHelp}>
                Si un organizador te compartió un enlace de autorización, actívalo aquí.
              </Text>
              {authError ? <ErrorBanner message={authError} /> : null}
              {authNote ? <Text style={styles.cardNote}>{authNote}</Text> : null}
              <TextField
                label="Enlace o token"
                placeholder="https://…/authorize/…"
                autoCapitalize="none"
                value={authInput}
                onChangeText={setAuthInput}
              />
              <PrimaryButton
                title="Activar autorización"
                loading={authBusy}
                onPress={submitAuthorization}
              />
            </>
          )}
        </View>

        <PrimaryButton title="Cerrar sesión" variant="outline" onPress={() => signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingTop: 16, gap: 14 },
  guest: { padding: 20, paddingTop: 24, gap: 12 },
  eyebrow: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: { fontSize: 30, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  subtitle: { color: colors.muted, lineHeight: 21, marginBottom: 8 },
  profile: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.art,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 24, fontWeight: '900' },
  profileInfo: { marginLeft: 14, flex: 1 },
  name: { fontSize: 22, fontWeight: '800', color: colors.ink },
  email: { color: colors.muted, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  cardValue: { color: colors.ink, fontSize: 15, fontWeight: '700', marginTop: 4 },
  cardHelp: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 12 },
  cardNote: { color: colors.green, fontWeight: '700', fontSize: 13, marginBottom: 10 },
  cardAction: { marginTop: 12 },
});