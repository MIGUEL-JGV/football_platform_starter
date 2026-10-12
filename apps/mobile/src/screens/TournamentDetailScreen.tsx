import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ErrorBanner, Loading } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import {
  followTournament,
  getStandings,
  getTournament,
  listMatches,
  Match,
  StandingRow,
  TournamentDetail,
  unfollowTournament,
} from '../api/tournaments';
import { RootStackParamList } from '../navigation/types';
import { colors, FORMAT_LABELS, formatDate, STATUS_LABELS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TournamentDetail'>;

type Segment = 'tabla' | 'calendario';

function formatDateTime(value: string | null): string {
  if (!value) return 'Por definir';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Por definir';
  return date.toLocaleString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TournamentDetailScreen({ route, navigation }: Props) {
  const { tournamentId } = route.params;
  const { token } = useAuth();
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [standingsNote, setStandingsNote] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesNote, setMatchesNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<Segment>('tabla');

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [detailResult, standingsResult, matchesResult] = await Promise.all([
          getTournament(tournamentId, token),
          getStandings(tournamentId).catch((err) => {
            setStandingsNote(
              err instanceof Error ? err.message : 'No hay tabla de posiciones.',
            );
            return null;
          }),
          listMatches(tournamentId).catch((err) => {
            setMatchesNote(err instanceof Error ? err.message : 'No hay calendario.');
            return [];
          }),
        ]);
        setDetail(detailResult);
        setStandings(standingsResult?.items ?? []);
        setMatches(matchesResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el torneo.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tournamentId, token],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    navigation.setOptions({ title: detail?.name ?? route.params.name ?? 'Torneo' });
  }, [detail, navigation, route.params.name]);

  const toggleFollow = async () => {
    if (!detail) return;
    if (!token) {
      navigation.navigate('Login');
      return;
    }
    setFollowBusy(true);
    setError(null);
    try {
      const result = detail.following
        ? await unfollowTournament(detail.id, token)
        : await followTournament(detail.id, token);
      setDetail({ ...detail, following: result.following });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el seguimiento.');
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Loading label="Cargando torneo…" />
      </View>
    );
  }

  if (error && !detail) {
    return (
      <View style={styles.center}>
        <ErrorBanner message={error} />
      </View>
    );
  }

  if (!detail) {
    return null;
  }

  const renderStandings = () => {
    if (standingsNote) {
      return <Text style={styles.note}>{standingsNote}</Text>;
    }
    if (standings.length === 0) {
      return <Text style={styles.note}>La tabla se publicará cuando empiecen los partidos.</Text>;
    }
    return (
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.cell, styles.colRank]}>#</Text>
          <Text style={[styles.cell, styles.colName]}>Equipo</Text>
          <Text style={[styles.cell, styles.colNum]}>PJ</Text>
          <Text style={[styles.cell, styles.colNum]}>DIF</Text>
          <Text style={[styles.cell, styles.colNum, styles.colPts]}>PTS</Text>
        </View>
        {standings.map((row) => (
          <View key={row.entryId} style={styles.tableRow}>
            <Text style={[styles.cell, styles.colRank, styles.cellBold]}>{row.rank}</Text>
            <Text style={[styles.cell, styles.colName, styles.cellBold]} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={[styles.cell, styles.colNum]}>{row.played}</Text>
            <Text style={[styles.cell, styles.colNum]}>
              {row.gd > 0 ? `+${row.gd}` : row.gd}
            </Text>
            <Text style={[styles.cell, styles.colNum, styles.colPts, styles.cellBold]}>
              {row.points}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderMatches = () => {
    if (matchesNote) {
      return <Text style={styles.note}>{matchesNote}</Text>;
    }
    if (matches.length === 0) {
      return <Text style={styles.note}>Todavía no hay partidos publicados.</Text>;
    }
    return matches.map((match) => {
      const home = match.homeTeam?.team?.name ?? 'Por definir';
      const away = match.awayTeam?.team?.name ?? 'Por definir';
      const finished = match.homeScore !== null && match.awayScore !== null;
      return (
        <View key={match.id} style={styles.matchCard}>
          <View style={styles.matchRow}>
            <Text style={styles.matchTeam} numberOfLines={1}>
              {home}
            </Text>
            <View style={styles.matchScore}>
              {finished ? (
                <Text style={styles.matchScoreText}>
                  {match.homeScore} - {match.awayScore}
                </Text>
              ) : (
                <Text style={styles.matchVs}>vs</Text>
              )}
            </View>
            <Text style={styles.matchTeam} numberOfLines={1}>
              {away}
            </Text>
          </View>
          <Text style={styles.matchMeta}>
            {match.matchday ? `${match.matchday.name} · ` : ''}
            {formatDateTime(match.scheduledAt)}
            {match.venue ? ` · ${match.venue.name}` : ''}
          </Text>
        </View>
      );
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />
      }
    >
      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.hero}>
        <View style={styles.pills}>
          <Text style={styles.pill}>{STATUS_LABELS[detail.status]}</Text>
          <Text style={styles.pill}>{FORMAT_LABELS[detail.format]}</Text>
          <Text style={styles.pill}>{detail.organization.name}</Text>
        </View>
        <Text style={styles.title}>{detail.name}</Text>
        <Text style={styles.dates}>
          {formatDate(detail.startDate)} → {formatDate(detail.endDate)}
        </Text>
        {detail.description ? <Text style={styles.description}>{detail.description}</Text> : null}
        <Text style={styles.counts}>
          {detail._count.entries} equipos participantes · {detail._count.follows} seguidores
        </Text>
        <Pressable
          onPress={toggleFollow}
          disabled={followBusy}
          style={({ pressed }) => [
            styles.followButton,
            detail.following && styles.followButtonActive,
            pressed && styles.followPressed,
          ]}
        >
          {followBusy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.followText}>
              {detail.following ? 'Dejar de seguir' : 'Seguir torneo'}
            </Text>
          )}
        </Pressable>
      </View>

      <View style={styles.segments}>
        <Pressable
          style={[styles.segment, segment === 'tabla' && styles.segmentActive]}
          onPress={() => setSegment('tabla')}
        >
          <Text style={[styles.segmentText, segment === 'tabla' && styles.segmentTextActive]}>
            Tabla
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segment, segment === 'calendario' && styles.segmentActive]}
          onPress={() => setSegment('calendario')}
        >
          <Text style={[styles.segmentText, segment === 'calendario' && styles.segmentTextActive]}>
            Calendario
          </Text>
        </Pressable>
      </View>

      {segment === 'tabla' ? renderStandings() : renderMatches()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  hero: {
    backgroundColor: colors.art,
    borderRadius: 18,
    padding: 20,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    backgroundColor: colors.overlay,
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    overflow: 'hidden',
  },
  title: { color: colors.white, fontSize: 30, fontWeight: '900', letterSpacing: -0.5, marginTop: 14 },
  dates: { color: '#cfdcd3', marginTop: 8, fontWeight: '600' },
  description: { color: '#e8efea', lineHeight: 20, marginTop: 10 },
  counts: { color: '#b9c9bf', fontSize: 12, marginTop: 10, fontWeight: '600' },
  followButton: {
    marginTop: 16,
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  followButtonActive: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.white },
  followPressed: { opacity: 0.85 },
  followText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  segments: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginVertical: 18,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.green },
  segmentText: { color: colors.muted, fontWeight: '800', fontSize: 14 },
  segmentTextActive: { color: colors.white },
  note: { color: colors.muted, lineHeight: 20, paddingVertical: 8 },
  table: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.pillBg,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableRow: { flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.border },
  cell: { fontSize: 13, color: colors.muted },
  cellBold: { fontWeight: '800', color: colors.ink },
  colRank: { width: 26 },
  colName: { flex: 1 },
  colNum: { width: 40, textAlign: 'right' },
  colPts: { width: 48, textAlign: 'right' },
  matchCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  matchRow: { flexDirection: 'row', alignItems: 'center' },
  matchTeam: { flex: 1, color: colors.ink, fontWeight: '800', fontSize: 14 },
  matchScore: { paddingHorizontal: 10 },
  matchScoreText: { color: colors.ink, fontWeight: '900', fontSize: 17 },
  matchVs: { color: colors.muted, fontWeight: '800' },
  matchMeta: { color: colors.muted, fontSize: 12, marginTop: 8 },
});