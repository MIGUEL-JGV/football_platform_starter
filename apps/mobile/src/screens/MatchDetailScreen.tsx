import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ErrorBanner, Loading } from '../components/ui';
import { getMatch, listMatchEvents, Match, MatchEvent } from '../api/tournaments';
import { RootStackParamList } from '../navigation/types';
import { colors, formatDateTime, formatEvent } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MatchDetail'>;

const GOAL_EVENTS = new Set(['goal', 'penalty_goal']);
const CARD_EVENTS = new Set(['yellow_card', 'second_yellow', 'red_card']);

function badgeColor(eventType: string): { bg: string; text: string } {
  if (GOAL_EVENTS.has(eventType)) return { bg: '#dff0d0', text: '#2f5c1f' };
  if (eventType === 'own_goal') return { bg: '#fdecea', text: '#b3261e' };
  if (CARD_EVENTS.has(eventType)) return { bg: '#fdf5cf', text: '#8a6d00' };
  return { bg: colors.pillBg, text: colors.ink };
}

export default function MatchDetailScreen({ route, navigation }: Props) {
  const { tournamentId, matchId } = route.params;
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [matchResult, eventsResult] = await Promise.all([
          getMatch(tournamentId, matchId),
          listMatchEvents(tournamentId, matchId),
        ]);
        setMatch(matchResult);
        setEvents(eventsResult);
        const home = matchResult.homeTeam?.team?.name ?? 'Local';
        const away = matchResult.awayTeam?.team?.name ?? 'Visitante';
        navigation.setOptions({ title: `${home} vs ${away}` });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el partido.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tournamentId, matchId, navigation],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Loading label="Cargando partido…" />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.center}>
        <ErrorBanner message={error ?? 'Partido no disponible.'} />
      </View>
    );
  }

  const home = match.homeTeam?.team?.name ?? 'Por definir';
  const away = match.awayTeam?.team?.name ?? 'Por definir';
  const finished = match.homeScore !== null && match.awayScore !== null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
    >
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.hero}>
        {match.matchday ? <Text style={styles.pill}>{match.matchday.name}</Text> : null}
        <View style={styles.scoreboard}>
          <Text style={styles.scoreboardTeam}>{home}</Text>
          <Text style={styles.scoreboardScore}>
            {finished ? `${match.homeScore} - ${match.awayScore}` : 'vs'}
          </Text>
          <Text style={styles.scoreboardTeam}>{away}</Text>
        </View>
        <Text style={styles.meta}>
          {formatDateTime(match.scheduledAt)}
          {match.venue ? ` · ${match.venue.name}` : ''}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Cronología</Text>
      {events.length === 0 ? (
        <Text style={styles.note}>Todavía no hay eventos registrados para este partido.</Text>
      ) : (
        events.map((event) => {
          const badge = badgeColor(event.eventType);
          return (
            <View key={event.id} style={styles.eventRow}>
              <Text style={styles.eventMinute}>
                {event.minute !== null ? `${event.minute}'` : '—'}
              </Text>
              <Text style={[styles.eventBadge, { backgroundColor: badge.bg, color: badge.text }]}>
                {formatEvent(event.eventType)}
              </Text>
              <View style={styles.eventBody}>
                <Text style={styles.eventPlayer} numberOfLines={1}>
                  {event.player ? event.player.displayName : 'Equipo'}
                  {event.jerseyNumber !== null ? ` (#${event.jerseyNumber})` : ''}
                </Text>
                {event.secondaryPlayer ? (
                  <Text style={styles.eventSecondary} numberOfLines={1}>
                    {event.eventType === 'substitution' ? 'entra ' : 'asistencia de '}
                    {event.secondaryPlayer.displayName}
                  </Text>
                ) : null}
              </View>
              {event.status === 'voided' ? <Text style={styles.eventVoided}>anulado</Text> : null}
            </View>
          );
        })
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
  scoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 20,
  },
  scoreboardTeam: { flex: 1, color: colors.white, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  scoreboardScore: { color: colors.green, fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  meta: { color: '#cfdcd3', marginTop: 16, fontWeight: '600', fontSize: 13, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, marginTop: 22, marginBottom: 8 },
  note: { color: colors.muted, lineHeight: 20 },
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
    overflow: 'hidden',
  },
  eventBody: { flex: 1, minWidth: 0 },
  eventPlayer: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  eventSecondary: { color: colors.muted, fontSize: 12 },
  eventVoided: { color: colors.muted, fontSize: 11, fontWeight: '700' },
});
