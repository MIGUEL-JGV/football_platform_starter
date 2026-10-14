import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FootballFormat } from '@football/shared-types';
import { ErrorBanner, PrimaryButton, TextField } from '../components/ui';
import { createTournament } from '../api/tournaments';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { FORMAT_LABELS, colors } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FORMATS: FootballFormat[] = ['football_11', 'football_7', 'football_5'];

export default function CreateTournamentScreen() {
  const navigation = useNavigation<Nav>();
  const { status, token } = useAuth();
  const [name, setName] = useState('');
  const [format, setFormat] = useState<FootballFormat>('football_11');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [location, setLocation] = useState('');
  const [maxTeams, setMaxTeams] = useState('16');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (status !== 'authenticated') {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.guest}>
          <Text style={styles.eyebrow}>NUEVO TORNEO</Text>
          <Text style={styles.title}>Inicia sesión</Text>
          <Text style={styles.subtitle}>
            Necesitas una cuenta para organizar y crear torneos.
          </Text>
          <PrimaryButton title="Iniciar sesión" onPress={() => navigation.navigate('Login')} />
        </View>
      </SafeAreaView>
    );
  }

  const submit = async () => {
    if (!token || name.trim().length < 2) {
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const created = await createTournament(token, {
        name: name.trim(),
        format,
        categoryLabel: categoryLabel.trim() || undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        maxTeams: maxTeams ? Number(maxTeams) : undefined,
      });
      navigation.replace('TournamentDetail', { tournamentId: created.id, name: created.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el torneo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>NUEVO TORNEO</Text>
          <Text style={styles.title}>Crear torneo</Text>
          <Text style={styles.subtitle}>Define el formato y los datos básicos de tu competencia.</Text>

          {error ? <ErrorBanner message={error} /> : null}

          <TextField
            label="Nombre del torneo"
            placeholder="Ej. Copa Fútbol 7 2026"
            autoCapitalize="sentences"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.fieldLabel}>Formato</Text>
          <View style={styles.formats}>
            {FORMATS.map((option) => {
              const active = option === format;
              return (
                <Pressable
                  key={option}
                  onPress={() => setFormat(option)}
                  style={[styles.formatPill, active && styles.formatPillActive]}
                >
                  <Text style={[styles.formatText, active && styles.formatTextActive]}>
                    {FORMAT_LABELS[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextField
            label="Categoría"
            placeholder="Ej. Libre, Sub-17"
            autoCapitalize="sentences"
            value={categoryLabel}
            onChangeText={setCategoryLabel}
          />
          <TextField
            label="Sede / ubicación"
            placeholder="Ej. Ciudad de México"
            autoCapitalize="sentences"
            value={location}
            onChangeText={setLocation}
          />
          <TextField
            label="Cupo de equipos"
            placeholder="16"
            keyboardType="number-pad"
            value={maxTeams}
            onChangeText={(text) => setMaxTeams(text.replace(/\D/g, ''))}
          />
          <TextField
            label="Descripción"
            placeholder="Reglas, premiación, horarios…"
            autoCapitalize="sentences"
            multiline
            style={styles.textarea}
            value={description}
            onChangeText={setDescription}
          />

          <PrimaryButton
            title={saving ? 'Creando…' : 'Crear torneo'}
            onPress={submit}
            loading={saving}
            disabled={name.trim().length < 2}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  guest: { flex: 1, padding: 24, justifyContent: 'center', gap: 10 },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  title: { fontSize: 30, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  subtitle: { color: colors.muted, lineHeight: 21, marginBottom: 8 },
  fieldLabel: { color: colors.muted, fontWeight: '700', fontSize: 12, marginBottom: 6 },
  formats: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  formatPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  formatPillActive: { backgroundColor: colors.green, borderColor: colors.green },
  formatText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  formatTextActive: { color: colors.white },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
});
