import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ErrorBanner, Loading } from '../components/ui';
import { getPlayerProfile, PlayerProfile } from '../api/tournaments';
import { RootStackParamList } from '../navigation/types';
import { colors, formatDateTime, formatEvent } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerProfile'>;

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: 'Portero',
  defender: 'Defensa',
  midfielder: 'Mediocampista',
  forward: 'Delantero',
};

export default function PlayerProfileScreen({ route, navigation }: Props) {
  const { playerId } = route.params;
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await getPlayerProfile(playerId);
        setProfile(result);
        navigation.setOptions({ title: result.player.displayName });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el jugador.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [playerId, navigation],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Loading label="Cargando jugador…" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <ErrorBanner message={error ?? 'Jugador no disponible.'} />
      </View>
    );
  }

  const { player, teams, stats, recentEvents } = profile;
  const position = player.preferredPosition
    ? POSITION_LABELS[player.preferredPosition] ?? player.preferredPosition
    : 'Posición sin definir';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
    >
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.hero}>
        <Text style={styles.pill}>{position}</Text>
        <Text style={styles.title}>{player.displayName}</Text>
        <Text style={styles.subtitle}>
          {teams.length > 0
            ? `${teams.length} equipo${teams.length === 1 ? '' : 's'}`
            : 'Sin equipos registrados'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Estadísticas</Text>
      <View style={styles.statGrid}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.goals}</Text>
          <Text style={styles.statLabel}>Goles</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.assists}</Text>
          <Text style={styles.statLabel}>Asistencias</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.yellow}</Text>
          <Text style={styles.statLabel}>Amarillas</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.red}</Text>
          <Text style={styles.statLabel}>Rojas</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Equipos</Text>
      {teams.length === 0 ? (
        <Text style={styles.note}>Este jugador no está registrado en ninguna convocatoria.</Text>
      ) : (
        teams.map((entry) => (
          <Pressable
            key={entry.rosterId}
            style={styles.card}
            onPress={() =>
              navigation.navigate('TeamProfile', { teamId: entry.team.id, name: entry.team.name })
            }
          >
            <Text style={styles.cardTitle}>
              {entry.team.name}
              {entry.jerseyNumber !== null ? ` · #${entry.jerseyNumber}` : ''}
            </Text>
            <Text style={styles.cardMeta}>{entry.tournament.name}</Text>
          </Pressable>
        ))
      )}

      <Text style={styles.sectionTitle}>Últimos eventos</Text>
      {recentEvents.length === 0 ? (
        <Text style={styles.note}>Todavía no hay eventos registrados.</Text>
      ) : (
        recentEvents.map((event, index) => (
          <View key={index} style={styles.eventRow}>
            <Text style={styles.eventMinute}>
              {event.minute !== null ? `${event.minute}'` : '—'}
            </Text>
            <Text style={styles.eventBadge}>{formatEvent(event.eventType)}</Text>
            <View style={styles.eventBody}>
              <Text style={styles.eventPlayer} numberOfLines={1}>
                {event.match.tournament.name}
              </Text>
              <Text style={styles.eventSecondary} numberOfLines={1}>
                {formatDateTime(event.match.scheduledAt)}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  hero: { backgroundColor: colors.art, borderRadius: 18, padding: 20 },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.overlay,
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    overflow: 'hidden',
  },
  title: { color: colors.white, fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 14 },
  subtitle: { color: '#cfdcd3', marginTop: 8, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, marginTop: 22, marginBottom: 10 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
  },
  statValue: { fontSize: 24, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 4 },
  note: { color: colors.muted, lineHeight: 20 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  cardMeta: { color: colors.muted, fontSize: 12.5, marginTop: 6 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  eventMinute: { width: 38, fontWeight: '900', color: colors.muted, fontVariant: ['tabular-nums'] },
  eventBadge: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.pillBg,
    color: colors.ink,
    overflow: 'hidden',
  },
  eventBody: { flex: 1, minWidth: 0 },
  eventPlayer: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  eventSecondary: { color: colors.muted, fontSize: 12 },
});
