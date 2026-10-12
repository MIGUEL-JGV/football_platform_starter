import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { StatsPlayerRow, StatsTeamRow } from '../api/tournaments';

export const STAT_COLORS = {
  green: '#2f6b3f',
  blue: '#2d6a8f',
  gray: '#a9b6ac',
  yellow: '#e2b93b',
  amber: '#b98a2e',
  red: '#c0392b',
};

const barPct = (value: number, max: number) => (max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0);
const halfPct = (value: number, max: number) => Math.max(4, Math.round((value / max) * 50));

export function DonutChart({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: { label: string; value: number; color: string }[];
  centerValue: number;
  centerLabel: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const size = 150;
  const center = size / 2;
  const radius = 56;
  const stroke = 24;
  const circumference = 2 * Math.PI * radius;
  let acc = 0;
  const slices = segments.filter((s) => s.value > 0);

  return (
    <View style={styles.donutWrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={center} cy={center} r={radius} fill="none" stroke="#edf2ea" strokeWidth={stroke} />
          {slices.map((seg) => {
            const len = total > 0 ? (seg.value / total) * circumference : 0;
            const node = (
              <Circle
                key={seg.label}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${circumference - len}`}
                strokeDashoffset={-acc}
                rotation={-90}
                origin={`${center}, ${center}`}
              />
            );
            acc += len;
            return node;
          })}
        </Svg>
        <View style={styles.donutCenter}>
          <Text style={styles.donutValue}>{centerValue}</Text>
          <Text style={styles.donutLabel}>{centerLabel}</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {segments.map((seg) => (
          <View key={seg.label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendLabel}>{seg.label}</Text>
            <Text style={styles.legendVal}>{seg.value}</Text>
            <Text style={styles.legendPct}>{total > 0 ? Math.round((seg.value / total) * 100) : 0}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function RankingBars({
  rows,
  color,
  valueLabel,
  getValue,
  onPressPlayer,
  onPressTeam,
}: {
  rows: StatsPlayerRow[];
  color: string;
  valueLabel: string;
  getValue: (row: StatsPlayerRow) => number;
  onPressPlayer: (row: StatsPlayerRow) => void;
  onPressTeam: (row: StatsPlayerRow) => void;
}) {
  const max = rows.reduce((biggest, row) => Math.max(biggest, getValue(row)), 1);
  return (
    <View style={styles.list}>
      {rows.map((row, index) => (
        <Pressable key={row.playerId} style={styles.rankRow} onPress={() => onPressPlayer(row)}>
          <Text style={styles.rank}>{index + 1}</Text>
          <View style={styles.rankMain}>
            <View style={styles.rankHead}>
              <Text style={styles.name} numberOfLines={1}>
                {row.playerName}
              </Text>
              <Text style={[styles.rankValue, { color }]}>
                {getValue(row)} <Text style={styles.valueLabel}>{valueLabel}</Text>
              </Text>
            </View>
            <Pressable onPress={() => onPressTeam(row)}>
              <Text style={styles.team} numberOfLines={1}>
                {row.teamName}
              </Text>
            </Pressable>
            <View style={styles.track}>
              <View
                style={[styles.fill, { width: `${barPct(getValue(row), max)}%`, backgroundColor: color }]}
              />
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export function StackedDiscipline({
  rows,
  onPressPlayer,
}: {
  rows: StatsPlayerRow[];
  onPressPlayer: (row: StatsPlayerRow) => void;
}) {
  const segmentsOf = (row: StatsPlayerRow) => [
    { label: 'Amarillas', value: row.yellow, color: STAT_COLORS.yellow },
    { label: '2ª am.', value: row.secondYellow, color: STAT_COLORS.amber },
    { label: 'Rojas', value: row.red, color: STAT_COLORS.red },
  ];
  const max = rows.reduce((biggest, row) => Math.max(biggest, row.yellow + row.secondYellow + row.red), 1);

  return (
    <View style={styles.stackList}>
      {rows.map((row, index) => {
        const segments = segmentsOf(row);
        const cards = segments.filter((s) => s.value > 0);
        return (
          <Pressable key={row.playerId} style={styles.stackRow} onPress={() => onPressPlayer(row)}>
            <View style={styles.stackHead}>
              <Text style={styles.rank}>{index + 1}</Text>
              <Text style={[styles.name, styles.stackName]} numberOfLines={1}>
                {row.playerName}
              </Text>
              {row.foulsCommitted > 0 ? (
                <Text style={styles.fouls}>{row.foulsCommitted} faltas</Text>
              ) : null}
            </View>
            <Text style={styles.team} numberOfLines={1}>
              {row.teamName}
            </Text>
            <View style={styles.stackTrack}>
              {segments
                .filter((s) => s.value > 0)
                .map((seg) => (
                  <View
                    key={seg.label}
                    style={{ width: `${barPct(seg.value, max)}%`, backgroundColor: seg.color }}
                  />
                ))}
            </View>
            {cards.length > 0 ? (
              <View style={styles.chips}>
                {cards.map((seg) => (
                  <View key={seg.label} style={styles.chip}>
                    <View style={[styles.chipDot, { backgroundColor: seg.color }]} />
                    <Text style={styles.chipText}>
                      {seg.label} {seg.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function TeamBalance({
  teams,
  onPressTeam,
}: {
  teams: StatsTeamRow[];
  onPressTeam: (team: StatsTeamRow) => void;
}) {
  const maxGF = teams.reduce((m, t) => Math.max(m, t.gf), 1);
  const maxGA = teams.reduce((m, t) => Math.max(m, t.ga), 1);

  return (
    <View>
      <View style={styles.balanceLegend}>
        <View style={[styles.legendDot, { backgroundColor: STAT_COLORS.green }]} />
        <Text style={styles.balanceLegendText}>A favor</Text>
        <View style={[styles.legendDot, { backgroundColor: STAT_COLORS.red, marginLeft: 14 }]} />
        <Text style={styles.balanceLegendText}>En contra</Text>
      </View>
      <View style={styles.balanceList}>
        {teams.map((team) => (
          <Pressable key={team.entryId} style={styles.balRow} onPress={() => onPressTeam(team)}>
            <Text style={styles.balName} numberOfLines={1}>
              {team.name}
            </Text>
            <View style={styles.balAxis}>
              <View style={[styles.balGa, { width: `${halfPct(team.ga, maxGA)}%` }]} />
              <View style={[styles.balGf, { width: `${halfPct(team.gf, maxGF)}%` }]} />
            </View>
            <Text style={styles.balNums}>
              <Text style={styles.balGfNum}>{team.gf}</Text>
              <Text style={styles.balDot}> · </Text>
              <Text style={styles.balGaNum}>{team.ga}</Text>
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  donutWrap: { flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' },
  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  donutValue: { fontSize: 30, fontWeight: '900', color: '#14241d', letterSpacing: -1 },
  donutLabel: { fontSize: 11, fontWeight: '700', color: '#65736b', marginTop: 2 },
  legend: { flex: 1, minWidth: 130, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  legendDot: { width: 10, height: 10, borderRadius: 999 },
  legendLabel: { flex: 1, color: '#65736b', fontWeight: '600', fontSize: 13 },
  legendVal: { fontWeight: '800', color: '#14241d', fontSize: 13 },
  legendPct: { color: '#65736b', fontSize: 11.5, fontWeight: '600', width: 34, textAlign: 'right' },

  list: { gap: 15 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rank: { width: 20, textAlign: 'center', fontWeight: '900', color: '#65736b', fontSize: 12 },
  rankMain: { flex: 1, minWidth: 0, gap: 5 },
  rankHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: { flex: 1, color: '#14241d', fontWeight: '800', fontSize: 14 },
  rankValue: { fontWeight: '900', fontSize: 15 },
  valueLabel: { color: '#65736b', fontSize: 11, fontWeight: '700' },
  team: { color: '#65736b', fontSize: 12 },
  track: { height: 10, borderRadius: 999, backgroundColor: '#edf2ea', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, minWidth: 5 },

  stackList: { gap: 15 },
  stackRow: { gap: 6 },
  stackHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  stackName: { flex: 0 },
  fouls: { marginLeft: 'auto', color: '#65736b', fontSize: 11.5, fontWeight: '700' },
  stackTrack: { flexDirection: 'row', gap: 3, height: 13, borderRadius: 999, backgroundColor: '#edf2ea', overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dfe6dd', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  chipDot: { width: 8, height: 8, borderRadius: 999 },
  chipText: { color: '#526158', fontSize: 12, fontWeight: '700' },

  balanceLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  balanceLegendText: { color: '#65736b', fontSize: 12, fontWeight: '700' },
  balanceList: { gap: 12 },
  balRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  balName: { width: 104, color: '#14241d', fontWeight: '700', fontSize: 13 },
  balAxis: { flex: 1, height: 12, justifyContent: 'center' },
  balGa: { position: 'absolute', right: '50%', height: 10, borderRadius: 999, backgroundColor: STAT_COLORS.red, minWidth: 5 },
  balGf: { position: 'absolute', left: '50%', height: 10, borderRadius: 999, backgroundColor: STAT_COLORS.green, minWidth: 5 },
  balNums: { width: 58, textAlign: 'right', fontSize: 13, fontWeight: '800' },
  balGfNum: { color: STAT_COLORS.green },
  balGaNum: { color: STAT_COLORS.red },
  balDot: { color: '#65736b', fontWeight: '600' },
});
