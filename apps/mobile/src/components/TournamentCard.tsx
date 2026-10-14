import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TournamentListItem } from '../api/tournaments';
import { colors, FORMAT_LABELS, STATUS_LABELS } from '../theme';

interface TournamentCardProps {
  tournament: TournamentListItem;
  onPress: () => void;
  badge?: string;
}

export function TournamentCard({ tournament, onPress, badge }: TournamentCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.art}>
        <Text style={styles.ball}>⚽</Text>
        <Text style={styles.format}>{FORMAT_LABELS[tournament.format]}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.status}>{STATUS_LABELS[tournament.status]}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text style={styles.title}>{tournament.name}</Text>
        <Text style={styles.org}>{tournament.organization.name}</Text>
        <Text style={styles.meta}>
          {tournament._count.entries} equipos · {tournament._count.follows} seguidores
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderColor: colors.border,
    borderWidth: 1,
  },
  pressed: { opacity: 0.9 },
  art: { height: 110, backgroundColor: colors.art, justifyContent: 'center', alignItems: 'center' },
  ball: { fontSize: 42 },
  format: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.overlay,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 11,
    fontWeight: '800',
    color: colors.ink,
  },
  body: { padding: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { color: colors.green, fontSize: 11, fontWeight: '800' },
  badge: {
    color: colors.greenDarkText,
    backgroundColor: colors.pillBg,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: 8 },
  org: { color: colors.muted, marginTop: 4, fontWeight: '600' },
  meta: { color: colors.muted, marginTop: 8, fontSize: 12 },
});