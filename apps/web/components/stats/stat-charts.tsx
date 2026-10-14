import Link from 'next/link';
import type { StatsPlayerRow, StatsTeamRow } from '../../lib/api';

export const STAT_COLORS = {
  deep: '#193b2b',
  green: '#2f6b3f',
  lime: '#8fae63',
  blue: '#2d6a8f',
  red: '#c0392b',
  amber: '#b98a2e',
  yellow: '#e2b93b',
  gray: '#a9b6ac',
};

function pct(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(6, Math.round((value / max) * 100));
}

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
  const C = 2 * Math.PI * 44;
  let acc = 0;
  const slices = segments.filter((s) => s.value > 0);

  return (
    <div className="st-donut-wrap">
      <div className="st-donut">
        <svg viewBox="0 0 120 120" width="150" height="150" role="img" aria-label="Distribución de resultados">
          <circle cx="60" cy="60" r="44" fill="none" stroke="#edf2ea" strokeWidth="24" />
          {slices.map((seg) => {
            const len = (seg.value / total) * C;
            const el = (
              <circle
                key={seg.label}
                cx="60"
                cy="60"
                r="44"
                fill="none"
                stroke={seg.color}
                strokeWidth="24"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-acc}
                transform="rotate(-90 60 60)"
              />
            );
            acc += len;
            return el;
          })}
        </svg>
        <div className="st-donut-center">
          <span className="st-donut-value">{centerValue}</span>
          <span className="st-donut-label">{centerLabel}</span>
        </div>
      </div>
      <ul className="st-legend">
        {segments.map((seg) => (
          <li key={seg.label}>
            <span className="st-legend-dot" style={{ background: seg.color }} />
            <span className="st-legend-label">{seg.label}</span>
            <span className="st-legend-val">{seg.value}</span>
            <span className="st-legend-pct">{total > 0 ? Math.round((seg.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RankingBars({
  items,
  color,
  getValue,
}: {
  items: StatsPlayerRow[];
  color: string;
  getValue: (item: StatsPlayerRow) => number;
}) {
  const max = items.reduce((biggest, item) => {
    const v = getValue(item);
    return v > biggest ? v : biggest;
  }, 1);

  return (
    <ol className="st-bars">
      {items.map((item, index) => (
        <li key={item.playerId} className="st-bar-row">
          <span className="st-rank">{index + 1}</span>
          <div className="st-bar-main">
            <div className="st-bar-head">
              <Link className="st-name" href={`/players/${item.playerId}`}>
                {item.playerName}
              </Link>
              <span className="st-team">· {item.teamName}</span>
              <span className="st-val">{getValue(item)}</span>
            </div>
            <div className="st-track">
              <span className="st-fill" style={{ width: `${pct(getValue(item), max)}%`, background: color }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function StackedDiscipline({ items }: { items: StatsPlayerRow[] }) {
  const segmentsOf = (row: StatsPlayerRow) => [
    { label: 'Amarillas', value: row.yellow, color: STAT_COLORS.yellow },
    { label: '2ª am.', value: row.secondYellow, color: STAT_COLORS.amber },
    { label: 'Rojas', value: row.red, color: STAT_COLORS.red },
  ];
  const max = items.reduce((biggest, row) => {
    const sum = row.yellow + row.secondYellow + row.red;
    return sum > biggest ? sum : biggest;
  }, 1);

  return (
    <ol className="st-stacks">
      {items.map((row, index) => {
        const segments = segmentsOf(row);
        const cards = segments.filter((s) => s.value > 0);
        return (
          <li key={row.playerId} className="st-stack-row">
            <div className="st-stack-head">
              <span className="st-rank">{index + 1}</span>
              <Link className="st-name" href={`/players/${row.playerId}`}>
                {row.playerName}
              </Link>
              <span className="st-team">· {row.teamName}</span>
              {row.foulsCommitted > 0 ? <span className="st-stack-fouls">{row.foulsCommitted} faltas</span> : null}
            </div>
            <div className="st-stack-track">
              {segments.map((seg) => (
                <span key={seg.label} style={{ width: `${pct(seg.value, max)}%`, background: seg.color }} title={`${seg.label}: ${seg.value}`} />
              ))}
            </div>
            {cards.length > 0 ? (
              <div className="st-stack-chips">
                {cards.map((seg) => (
                  <span key={seg.label} className="st-chip">
                    <i style={{ background: seg.color }} />
                    {seg.label} {seg.value}
                  </span>
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function TeamBalance({ teams }: { teams: StatsTeamRow[] }) {
  const maxGF = teams.reduce((m, t) => (t.gf > m ? t.gf : m), 1);
  const maxGA = teams.reduce((m, t) => (t.ga > m ? t.ga : m), 1);
  const halfPct = (value: number, max: number) => Math.max(4, Math.round((value / max) * 50));

  return (
    <ul className="st-balance">
      {teams.map((team) => (
        <li key={team.entryId} className="st-bal-row">
          <Link className="st-name" href={`/teams/${team.teamId}`}>
            {team.name}
          </Link>
          <div className="st-bal-axis">
            <span
              className="st-bal-ga"
              style={{ width: `${halfPct(team.ga, maxGA)}%` }}
              title={`Goles en contra: ${team.ga}`}
            />
            <span
              className="st-bal-gf"
              style={{ width: `${halfPct(team.gf, maxGF)}%` }}
              title={`Goles a favor: ${team.gf}`}
            />
          </div>
          <span className="st-bal-nums">
            <b className="st-bal-gf-num">{team.gf}</b>
            <i>·</i>
            <b className="st-bal-ga-num">{team.ga}</b>
          </span>
        </li>
      ))}
    </ul>
  );
}