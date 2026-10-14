import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ErrorBanner, Loading, PrimaryButton, TextField } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { applyEntry, listMyTeams, MyTeamSummary } from '../api/tournaments';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ApplyEntry'>;

function parseInvitationToken(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const marker = '/join/';
  const index = trimmed.indexOf(marker);
  const raw = index >= 0 ? trimmed.slice(index + marker.length) : trimmed;
  const token = raw.split(/[?#/]/)[0].trim();
  return token.length > 0 ? token : undefined;
}

export default function ApplyEntryScreen({ route, navigation }: Props) {
  const { tournamentId, tournamentName, requiresInvitation } = route.params;
  const { token } = useAuth();
  const [teams, setTeams] = useState<MyTeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [invitation, setInvitation] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: `Inscribir en ${tournamentName}` });
  }, [navigation, tournamentName]);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listMyTeams(token);
      setTeams(result);
      if (result.length === 1) setSelectedTeamId(result[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus equipos.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!token) return;
    if (!selectedTeamId) {
      setError('Selecciona un equipo.');
      return;
    }
    const invitationToken = parseInvitationToken(invitation);
    if (requiresInvitation && !invitationToken) {
      setError('Este torneo requiere un enlace de invitación.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await applyEntry(token, tournamentId, {
        teamId: selectedTeamId,
        invitationToken,
      });
      setSuccess(result.team.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo inscribir el equipo.');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <View style={styles.center}>
        <Text style={styles.note}>Inicia sesión para inscribir un equipo.</Text>
      </View>
    );
  }

  if (success) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>Solicitud enviada</Text>
          <Text style={styles.successText}>
            {success} quedó registrado para {tournamentName}. El organizador debe aprobar la
            inscripción.
          </Text>
        </View>
        <PrimaryButton title="Volver al torneo" onPress={() => navigation.goBack()} />
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Loading label="Cargando tus equipos…" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {error ? <ErrorBanner message={error} /> : null}

      <Text style={styles.heading}>Elige tu equipo</Text>
      {teams.length === 0 ? (
        <Text style={styles.note}>
          No tienes equipos todavía. Crea un equipo desde la web para poder inscribirte.
        </Text>
      ) : (
        teams.map((team) => {
          const active = selectedTeamId === team.id;
          return (
            <Pressable
              key={team.id}
              style={[styles.teamRow, active && styles.teamRowActive]}
              onPress={() => setSelectedTeamId(team.id)}
            >
              <View style={styles.teamInfo}>
                <Text style={[styles.teamName, active && styles.teamNameActive]}>{team.name}</Text>
                <Text style={styles.teamMeta}>{team._count.entries} inscripciones</Text>
              </View>
              <View style={[styles.radio, active && styles.radioActive]} />
            </Pressable>
          );
        })
      )}

      <TextField
        label={requiresInvitation ? 'Enlace de invitación (obligatorio)' : 'Enlace de invitación (opcional)'}
        placeholder="https://…/join/…"
        autoCapitalize="none"
        value={invitation}
        onChangeText={setInvitation}
      />
      {requiresInvitation ? (
        <Text style={styles.hint}>
          Este torneo es privado: pide al organizador el enlace de invitación.
        </Text>
      ) : null}

      <View style={styles.submit}>
        <PrimaryButton
          title="Inscribir equipo"
          loading={busy}
          disabled={teams.length === 0}
          onPress={submit}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingTop: 16, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 24 },
  successCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
  },
  successTitle: { fontSize: 20, fontWeight: '900', color: colors.green, marginBottom: 8 },
  successText: { color: colors.ink, lineHeight: 21 },
  heading: { fontSize: 18, fontWeight: '900', color: colors.ink, marginBottom: 4 },
  note: { color: colors.muted, lineHeight: 20 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: -6, marginBottom: 6 },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  teamRowActive: { borderColor: colors.green, backgroundColor: '#eef5e9' },
  teamInfo: { flex: 1 },
  teamName: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  teamNameActive: { color: colors.green },
  teamMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioActive: { borderColor: colors.green, backgroundColor: colors.green },
  submit: { marginTop: 8 },
});
