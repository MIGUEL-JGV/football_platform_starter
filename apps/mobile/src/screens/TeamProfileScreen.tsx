import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ErrorBanner, Loading } from '../components/ui';
import { getTeamProfile, TeamProfile } from '../api/tournaments';
import { RootStackParamList } from '../navigation/types';
import { colors, formatDateTime, STATUS_LABELS } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamProfile'>;

export default function TeamProfileScreen({ route, navigation }: Props) {
  const { teamId } = route.params;
  const [profile, setProfile] = useState<TeamProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await getTeamProfile(teamId);
        setProfile(result);
        navigation.setOptions({ title: result.team.name });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el equipo.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [teamId, navigation],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Loading label="Cargando equipo…" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <ErrorBanner message={error ?? 'Equipo no disponible.'} />
      </View>
    );
  }

  const { team, entries, players, squads, recentMatches, form } = profile;

  const initials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

  const renderAvatar = (photoUrl: string | null, name: string) =>
    photoUrl ? (
      <Image style={styles.avatar} source={{ uri: photoUrl }} />
    ) : (
      <View style={[styles.avatar, styles.avatarFallback]}>
        <Text style={styles.avatarText}>{initials(name)}</Text>
      </View>
    );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
    >
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.hero}>
        <Text style={styles.pill}>Equipo</Text>
        <Text style={styles.title}>{team.name}</Text>
        <Text style={styles.subtitle}>Fundado por {team.creator.displayName}</Text>
        {team.description ? <Text style={styles.description}>{team.description}</Text> : null}
      </View>

      <Text style={styles.sectionTitle}>Rendimiento reciente</Text>
      <View style={styles.statGrid}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{form.played}</Text>
          <Text style={styles.statLabel}>Partidos</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {form.won}-{form.drawn}-{form.lost}
          </Text>
          <Text style={styles.statLabel}>G-E-P</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{form.gf}</Text>
          <Text style={styles.statLabel}>Goles a favor</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{form.gd > 0 ? `+${form.gd}` : form.gd}</Text>
          <Text style={styles.statLabel}>Diferencia</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Torneos</Text>
      {entries.length === 0 ? (
        <Text style={styles.note}>Este equipo todavía no participa en ningún torneo.</Text>
      ) : (
        entries.map((entry) => (
          <Pressable
            key={entry.id}
            style={styles.card}
            onPress={() =>
              navigation.navigate('TournamentDetail', {
                tournamentId: entry.tournament.id,
                name: entry.tournament.name,
              })
            }
          >
            <Text style={styles.cardTitle}>{entry.tournament.name}</Text>
            <Text style={styles.cardMeta}>
              {STATUS_LABELS[entry.tournament.status as keyof typeof STATUS_LABELS] ??
                entry.tournament.status}
            </Text>
          </Pressable>
        ))
      )}

      <Text style={styles.sectionTitle}>Integrantes</Text>
      {squads.length === 0 && players.length === 0 ? (
        <Text style={styles.note}>Este equipo todavía no tiene integrantes registrados.</Text>
      ) : squads.length > 0 ? (
        squads.map((squad) => (
          <View key={squad.entryId} style={styles.rosterGroup}>
            <Text
              style={styles.rosterGroupTitle}
              onPress={() =>
                navigation.navigate('TournamentDetail', {
                  tournamentId: squad.tournament.id,
                  name: squad.tournament.name,
                })
              }
            >
              {squad.tournament.name}
            </Text>
            {squad.players.map((player) => (
              <Pressable
                key={player.rosterId}
                style={styles.rosterRow}
                onPress={() =>
                  navigation.navigate('PlayerProfile', {
                    playerId: player.playerId,
                    name: player.displayName,
                  })
                }
              >
                <Text style={styles.rosterNum}>{player.jerseyNumber ?? '–'}</Text>
                {renderAvatar(player.photoUrl, player.displayName)}
                <Text style={styles.rosterName} numberOfLines={1}>
                  {player.displayName}
                </Text>
                <Text style={styles.rosterPos} numberOfLines={1}>
                  {player.position ?? player.preferredPosition ?? ''}
                  {player.age != null ? ` · ${player.age}a` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        ))
      ) : (
        players.map((player) => (
          <Pressable
            key={player.id}
            style={styles.rosterRow}
            onPress={() =>
              navigation.navigate('PlayerProfile', {
                playerId: player.id,
                name: player.displayName,
              })
            }
          >
            <Text style={styles.rosterNum}>–</Text>
            {renderAvatar(player.photoUrl, player.displayName)}
            <Text style={styles.rosterName} numberOfLines={1}>
              {player.displayName}
            </Text>
            <Text style={styles.rosterPos} numberOfLines={1}>
              {player.preferredPosition ?? ''}
              {player.age != null ? ` · ${player.age}a` : ''}
            </Text>
          </Pressable>
        ))
      )}

      <Text style={styles.sectionTitle}>Últimos partidos</Text>
      {recentMatches.length === 0 ? (
        <Text style={styles.note}>Todavía no hay partidos jugados.</Text>
      ) : (
        recentMatches.map((match) => {
          const isHome = match.homeTeam?.team?.id === team.id;
          const scored = (isHome ? match.homeScore : match.awayScore) ?? 0;
          const conceded = (isHome ? match.awayScore : match.homeScore) ?? 0;
          const result = scored > conceded ? 'Victoria' : scored < conceded ? 'Derrota' : 'Empate';
          return (
            <View key={match.id} style={styles.card}>
              <View style={styles.matchRow}>
                <Text style={styles.matchTeam} numberOfLines={1}>
                  {match.homeTeam?.team?.name ?? 'Por definir'}
                </Text>
                <Text style={styles.matchScore}>
                  {match.homeScore} - {match.awayScore}
                </Text>
                <Text style={styles.matchTeam} numberOfLines={1}>
                  {match.awayTeam?.team?.name ?? 'Por definir'}
                </Text>
              </View>
              <Text style={styles.cardMeta}>
                {match.tournament.name} · {formatDateTime(match.scheduledAt)} · {result}
              </Text>
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
  title: { color: colors.white, fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 14 },
  subtitle: { color: '#cfdcd3', marginTop: 8, fontWeight: '600' },
  description: { color: '#e8efea', lineHeight: 20, marginTop: 10 },
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
  rosterGroup: { marginBottom: 16 },
  rosterGroupTitle: { color: colors.art, fontWeight: '800', fontSize: 14, marginBottom: 6 },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rosterNum: { width: 26, textAlign: 'center', fontWeight: '900', color: colors.muted },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { backgroundColor: colors.art, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  rosterName: { flex: 1, color: colors.ink, fontWeight: '700' },
  rosterPos: { color: colors.muted, fontSize: 12, maxWidth: 130, textAlign: 'right' },
  matchRow: { flexDirection: 'row', alignItems: 'center' },
  matchTeam: { flex: 1, color: colors.ink, fontWeight: '800', fontSize: 14 },
  matchScore: { paddingHorizontal: 10, color: colors.ink, fontWeight: '900', fontSize: 16 },
});
