import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ErrorBanner, Loading } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import {
  followTournament,
  getStandings,
  getTournament,
  getTournamentStats,
  listMatches,
  Match,
  StandingRow,
  StatsPlayerRow,
  TournamentDetail,
  TournamentStats,
  unfollowTournament,
} from '../api/tournaments';
import { RootStackParamList } from '../navigation/types';
import { colors, formatDate, formatDateTime, FORMAT_LABELS, STATUS_LABELS } from '../theme';
import {
  DonutChart,
  RankingBars,
  StackedDiscipline,
  STAT_COLORS,
  TeamBalance,
} from '../components/StatCharts';

type Props = NativeStackScreenProps<RootStackParamList, 'TournamentDetail'>;

type Segment = 'resumen' | 'tabla' | 'calendario' | 'resultados' | 'estadisticas';

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'tabla', label: 'Tabla' },
  { key: 'calendario', label: 'Calendario' },
  { key: 'resultados', label: 'Resultados' },
  { key: 'estadisticas', label: 'Estadísticas' },
];

const isFinished = (match: Match) => match.homeScore !== null && match.awayScore !== null;

function FormPills({ form }: { form?: string[] }) {
  if (!form || form.length === 0) {
    return <Text style={styles.formEmpty}>—</Text>;
  }
  return (
    <View style={styles.formRow}>
      {form.map((result, index) => (
        <View
          key={index}
          style={[
            styles.formPill,
            result === 'G' ? styles.formG : result === 'P' ? styles.formP : styles.formE,
          ]}
        >
          <Text style={styles.formPillText}>{result}</Text>
        </View>
      ))}
    </View>
  );
}

function Expandable({ children, label = 'Ver ranking completo' }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOpen((value) => !value)} style={styles.expandToggle}>
        <Text style={styles.expandText}>{open ? 'Ocultar' : label}</Text>
      </Pressable>
      {open ? <View style={styles.expandBody}>{children}</View> : null}
    </View>
  );
}

export default function TournamentDetailScreen({ route, navigation }: Props) {
  const { tournamentId } = route.params;
  const { token } = useAuth();
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [standingsNote, setStandingsNote] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesNote, setMatchesNote] = useState<string | null>(null);
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<Segment>('resumen');

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [detailResult, standingsResult, matchesResult, statsResult] = await Promise.all([
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
          getTournamentStats(tournamentId).catch(() => null),
        ]);
        setDetail(detailResult);
        setStandings(standingsResult?.items ?? []);
        setMatches(matchesResult);
        setStats(statsResult);
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

  const openMatch = (match: Match) =>
    navigation.navigate('MatchDetail', { tournamentId, matchId: match.id });

  const renderMatchCard = (match: Match) => {
    const home = match.homeTeam?.team?.name ?? 'Por definir';
    const away = match.awayTeam?.team?.name ?? 'Por definir';
    const finished = isFinished(match);
    return (
      <Pressable key={match.id} style={styles.matchCard} onPress={() => openMatch(match)}>
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
      </Pressable>
    );
  };

  const renderPlayerTable = (
    rows: StatsPlayerRow[],
    valueLabel: string,
    value: (row: StatsPlayerRow) => number,
  ) => {
    if (rows.length === 0) {
      return <Text style={styles.note}>Sin datos registrados.</Text>;
    }
    return rows.slice(0, 10).map((row) => (
      <Pressable
        key={row.playerId}
        style={styles.statRow}
        onPress={() =>
          navigation.navigate('PlayerProfile', { playerId: row.playerId, name: row.playerName })
        }
      >
        <Text style={styles.statRank}>{row.rank}</Text>
        <View style={styles.statBody}>
          <Text style={styles.statPlayer} numberOfLines={1}>
            {row.playerName}
          </Text>
          <Pressable
            onPress={() =>
              navigation.navigate('TeamProfile', { teamId: row.teamId, name: row.teamName })
            }
          >
            <Text style={styles.statTeam} numberOfLines={1}>
              {row.teamName}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.statValue}>
          {value(row)} <Text style={styles.statValueLabel}>{valueLabel}</Text>
        </Text>
      </Pressable>
    ));
  };

  const renderResumen = () => {
    const finished = matches.filter(isFinished);
    return (
      <View>
        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{stats?.counts.matchesPlayed ?? finished.length}</Text>
            <Text style={styles.statCardLabel}>Partidos jugados</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{stats?.counts.goalsTotal ?? '—'}</Text>
            <Text style={styles.statCardLabel}>Goles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{stats?.counts.avgGoalsPerMatch ?? '—'}</Text>
            <Text style={styles.statCardLabel}>Goles por partido</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{detail._count.entries}</Text>
            <Text style={styles.statCardLabel}>Equipos</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Últimos resultados</Text>
        {finished.length === 0 ? (
          <Text style={styles.note}>Todavía no hay resultados.</Text>
        ) : (
          finished
            .slice(-3)
            .reverse()
            .map(renderMatchCard)
        )}
      </View>
    );
  };

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
          <Text style={[styles.cell, styles.colForm]}>Forma</Text>
        </View>
        {standings.map((row) => (
          <Pressable
            key={row.entryId}
            style={styles.tableRow}
            onPress={() => navigation.navigate('TeamProfile', { teamId: row.teamId, name: row.name })}
          >
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
            <View style={styles.colForm}>
              <FormPills form={row.form} />
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  const renderCalendar = () => {
    if (matchesNote) {
      return <Text style={styles.note}>{matchesNote}</Text>;
    }
    const upcoming = matches.filter((match) => !isFinished(match)).reverse();
    if (upcoming.length === 0) {
      return <Text style={styles.note}>No hay partidos programados.</Text>;
    }
    return upcoming.map(renderMatchCard);
  };

  const renderResults = () => {
    if (matchesNote) {
      return <Text style={styles.note}>{matchesNote}</Text>;
    }
    const finished = matches.filter(isFinished);
    if (finished.length === 0) {
      return <Text style={styles.note}>Todavía no hay resultados publicados.</Text>;
    }
    return finished
      .slice()
      .reverse()
      .map(renderMatchCard);
  };

  const renderStats = () => {
    if (!stats) {
      return <Text style={styles.note}>Aún no hay estadísticas disponibles.</Text>;
    }
    const counts = stats.counts;
    const openPlayer = (row: StatsPlayerRow) =>
      navigation.navigate('PlayerProfile', { playerId: row.playerId, name: row.playerName });
    const openTeam = (row: { teamId: string; teamName?: string; name?: string }) =>
      navigation.navigate('TeamProfile', { teamId: row.teamId, name: row.teamName ?? row.name ?? '' });

    return (
      <View>
        <Text style={styles.statsHeroTitle}>
          {stats.phaseName ? `Fase: ${stats.phaseName}` : 'Los números del torneo'}
        </Text>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Resultados</Text>
          <Text style={styles.statsSub}>Reparto de local, empate y visita</Text>
          {counts.matchesPlayed === 0 ? (
            <Text style={styles.note}>No hay resultados todavía.</Text>
          ) : (
            <DonutChart
              centerValue={counts.matchesPlayed}
              centerLabel="jugados"
              segments={[
                { label: 'Local', value: counts.homeWins, color: STAT_COLORS.green },
                { label: 'Empate', value: counts.draws, color: STAT_COLORS.gray },
                { label: 'Visita', value: counts.awayWins, color: STAT_COLORS.blue },
              ]}
            />
          )}
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Goleo</Text>
          <Text style={styles.statsSub}>Máximos anotadores del torneo</Text>
          {stats.scorers.length === 0 ? (
            <Text style={styles.note}>Aún no hay goles registrados.</Text>
          ) : (
            <>
              <RankingBars
                rows={stats.scorers.slice(0, 5)}
                color={STAT_COLORS.green}
                valueLabel="goles"
                getValue={(row) => row.goals}
                onPressPlayer={openPlayer}
                onPressTeam={openTeam}
              />
              <Expandable>{renderPlayerTable(stats.scorers, 'goles', (row) => row.goals)}</Expandable>
            </>
          )}
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Asistencias</Text>
          <Text style={styles.statsSub}>Los mejores pasadores</Text>
          {stats.assists.length === 0 ? (
            <Text style={styles.note}>Aún no hay asistencias registradas.</Text>
          ) : (
            <>
              <RankingBars
                rows={stats.assists.slice(0, 5)}
                color={STAT_COLORS.blue}
                valueLabel="asist."
                getValue={(row) => row.assists}
                onPressPlayer={openPlayer}
                onPressTeam={openTeam}
              />
              <Expandable>{renderPlayerTable(stats.assists, 'asist.', (row) => row.assists)}</Expandable>
            </>
          )}
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Disciplina</Text>
          <Text style={styles.statsSub}>Amarillas, doble amarilla y rojas</Text>
          {stats.discipline.length === 0 ? (
            <Text style={styles.note}>Aún no hay incidencias registradas.</Text>
          ) : (
            <>
              <StackedDiscipline rows={stats.discipline.slice(0, 5)} onPressPlayer={openPlayer} />
              <Expandable>{renderPlayerTable(stats.discipline, 'am.', (row) => row.yellow)}</Expandable>
            </>
          )}
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Por equipo</Text>
          <Text style={styles.statsSub}>Balanza de goles por equipo</Text>
          {stats.teams.length === 0 ? (
            <Text style={styles.note}>Sin datos por equipo.</Text>
          ) : (
            <TeamBalance
              teams={stats.teams}
              onPressTeam={(team) => navigation.navigate('TeamProfile', { teamId: team.teamId, name: team.name })}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
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

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.segments}
      >
        {SEGMENTS.map((item) => (
          <Pressable
            key={item.key}
            style={[styles.segment, segment === item.key && styles.segmentActive]}
            onPress={() => setSegment(item.key)}
          >
            <Text style={[styles.segmentText, segment === item.key && styles.segmentTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {segment === 'resumen' ? renderResumen() : null}
      {segment === 'tabla' ? renderStandings() : null}
      {segment === 'calendario' ? renderCalendar() : null}
      {segment === 'resultados' ? renderResults() : null}
      {segment === 'estadisticas' ? renderStats() : null}
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
  segments: { flexDirection: 'row', gap: 8, paddingVertical: 18 },
  segment: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentActive: { backgroundColor: colors.green, borderColor: colors.green },
  segmentText: { color: colors.muted, fontWeight: '800', fontSize: 13.5 },
  segmentTextActive: { color: colors.white },
  note: { color: colors.muted, lineHeight: 20, paddingVertical: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, marginTop: 20, marginBottom: 10 },
  statsHeroTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, marginBottom: 12 },
  statsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  statsTitle: { fontSize: 16, fontWeight: '900', color: colors.ink },
  statsSub: { color: colors.muted, fontSize: 12.5, marginTop: 2, marginBottom: 14 },
  expandToggle: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  expandText: { color: colors.green, fontWeight: '800', fontSize: 13 },
  expandBody: { marginTop: 12 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
  },
  statCardValue: { fontSize: 24, fontWeight: '900', color: colors.ink, letterSpacing: -0.5 },
  statCardLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 4 },
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
    alignItems: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  cell: { fontSize: 13, color: colors.muted },
  cellBold: { fontWeight: '800', color: colors.ink },
  colRank: { width: 24 },
  colName: { flex: 1 },
  colNum: { width: 34, textAlign: 'right' },
  colPts: { width: 40, textAlign: 'right' },
  colForm: { width: 78, marginLeft: 4 },
  formRow: { flexDirection: 'row', gap: 3 },
  formEmpty: { color: colors.muted, fontSize: 12 },
  formPill: {
    width: 19,
    height: 19,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formG: { backgroundColor: '#2f9e5f' },
  formE: { backgroundColor: '#c99a2e' },
  formP: { backgroundColor: '#c0504a' },
  formPillText: { color: colors.white, fontSize: 11, fontWeight: '900' },
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
  statRow: {
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
  statRank: { width: 22, fontWeight: '900', color: colors.muted, textAlign: 'center' },
  statBody: { flex: 1, minWidth: 0 },
  statPlayer: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  statTeam: { color: colors.muted, fontSize: 12, marginTop: 2 },
  statValue: { color: colors.green, fontWeight: '900', fontSize: 16 },
  statValueLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
});
