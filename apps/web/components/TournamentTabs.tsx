'use client';

import Link from 'next/link';
import { useState } from 'react';
import type {
  Match,
  NewsItem,
  StandingRow,
  StatsPlayerRow,
  TournamentDetail,
  TournamentStats,
} from '../lib/api';
import { formatMatchDateTime } from '../lib/format';
import {
  DonutChart,
  RankingBars,
  StackedDiscipline,
  STAT_COLORS,
  TeamBalance,
} from './stats/stat-charts';

type TabKey =
  | 'resumen'
  | 'clasificacion'
  | 'calendario'
  | 'resultados'
  | 'estadisticas'
  | 'noticias';

interface Props {
  detail: TournamentDetail;
  standings: StandingRow[];
  matches: Match[];
  stats: TournamentStats | null;
  news: NewsItem[];
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'clasificacion', label: 'Clasificación' },
  { key: 'calendario', label: 'Calendario' },
  { key: 'resultados', label: 'Resultados' },
  { key: 'estadisticas', label: 'Estadísticas' },
  { key: 'noticias', label: 'Noticias' },
];

const isFinished = (match: Match) => match.homeScore !== null && match.awayScore !== null;

function FormPills({ form }: { form?: string[] }) {
  if (!form || form.length === 0) {
    return <span className="d-note">Sin partidos</span>;
  }
  return (
    <span className="d-form">
      {form.map((result, index) => (
        <span key={index} className={`d-form-pill d-form-${result.toLowerCase()}`}>
          {result}
        </span>
      ))}
    </span>
  );
}

function MatchRow({ match, tournamentId }: { match: Match; tournamentId: string }) {
  return (
    <Link className="d-match d-match-link" href={`/tournaments/${tournamentId}/matches/${match.id}`}>
      <div className="d-match-rows">
        <div className="d-match-teams">
          <div className="d-match-team">{match.homeTeam?.team?.name ?? 'Por definir'}</div>
          <div className="d-match-team">{match.awayTeam?.team?.name ?? 'Por definir'}</div>
        </div>
        <div className="d-match-score">
          {isFinished(match) ? (
            <>
              {match.homeScore} – {match.awayScore}
            </>
          ) : (
            <span className="d-match-vs">vs</span>
          )}
        </div>
      </div>
      <p className="d-match-meta">
        {match.matchday ? `${match.matchday.name} · ` : ''}
        {formatMatchDateTime(match.scheduledAt)}
        {match.venue ? ` · ${match.venue.name}` : ''}
      </p>
    </Link>
  );
}

function PlayerStatTable({
  rows,
  columns,
  emptyLabel,
}: {
  rows: StatsPlayerRow[];
  columns: { key: keyof StatsPlayerRow; label: string }[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="d-note">{emptyLabel}</p>;
  }
  return (
    <table className="d-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Jugador</th>
          <th>Equipo</th>
          {columns.map((column) => (
            <th key={String(column.key)} className="num">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.playerId}-${row.rank}`}>
            <td>{row.rank}</td>
            <td className="name">
              <Link className="d-inline-link" href={`/players/${row.playerId}`}>
                {row.playerName}
              </Link>
            </td>
            <td>
              <Link className="d-inline-link" href={`/teams/${row.teamId}`}>
                {row.teamName}
              </Link>
            </td>
            {columns.map((column) => (
              <td key={String(column.key)} className="num">
                {row[column.key] as number}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TournamentTabs({ detail, standings, matches, stats, news }: Props) {
  const [active, setActive] = useState<TabKey>('resumen');

  const finished = matches.filter(isFinished);
  const upcoming = matches.filter((match) => !isFinished(match)).reverse();
  const topScorers = stats?.scorers.slice(0, 5) ?? [];

  return (
    <div className="d-tabs-wrap">
      <nav className="d-tabs" aria-label="Secciones del torneo">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`d-tab${active === tab.key ? ' d-tab-active' : ''}`}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {active === 'resumen' ? (
        <section className="d-block">
          <div className="d-stat-grid">
            <div className="d-stat">
              <span className="d-stat-value">{stats?.counts.matchesPlayed ?? finished.length}</span>
              <span className="d-stat-label">Partidos jugados</span>
            </div>
            <div className="d-stat">
              <span className="d-stat-value">{stats?.counts.goalsTotal ?? '—'}</span>
              <span className="d-stat-label">Goles</span>
            </div>
            <div className="d-stat">
              <span className="d-stat-value">
                {stats?.counts.avgGoalsPerMatch ?? '—'}
              </span>
              <span className="d-stat-label">Goles por partido</span>
            </div>
            <div className="d-stat">
              <span className="d-stat-value">{detail._count.entries}</span>
              <span className="d-stat-label">Equipos</span>
            </div>
          </div>

          <h3>Últimos resultados</h3>
          {finished.length === 0 ? (
            <p className="d-note">Todavía no hay resultados.</p>
          ) : (
            finished
              .slice(-3)
              .reverse()
              .map((match) => <MatchRow key={match.id} match={match} tournamentId={detail.id} />)
          )}

          <h3>Líderes de goleo</h3>
          {topScorers.length === 0 ? (
            <p className="d-note">Aún no hay goles registrados.</p>
          ) : (
            <ul className="d-lead-list">
              {topScorers.map((row) => (
                <li key={row.playerId}>
                  <span className="d-lead-name">
                    <Link className="d-inline-link" href={`/players/${row.playerId}`}>
                      {row.playerName}
                    </Link>{' '}
                    <span className="d-lead-team">· {row.teamName}</span>
                  </span>
                  <span className="d-lead-value">{row.goals} goles</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {active === 'clasificacion' ? (
        <section className="d-block">
          <h3>Tabla de posiciones</h3>
          {standings.length === 0 ? (
            <p className="d-note">La tabla se publicará cuando empiecen los partidos.</p>
          ) : (
            <div className="d-table-scroll">
              <table className="d-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Equipo</th>
                    <th className="num">PJ</th>
                    <th className="num">G</th>
                    <th className="num">E</th>
                    <th className="num">P</th>
                    <th className="num">GF</th>
                    <th className="num">GC</th>
                    <th className="num">DIF</th>
                    <th className="num">PTS</th>
                    <th>Forma</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr key={row.entryId}>
                      <td>{row.rank}</td>
                      <td className="name">
                        <Link className="d-inline-link" href={`/teams/${row.teamId}`}>
                          {row.name}
                        </Link>
                      </td>
                      <td className="num">{row.played}</td>
                      <td className="num">{row.won}</td>
                      <td className="num">{row.drawn}</td>
                      <td className="num">{row.lost}</td>
                      <td className="num">{row.gf}</td>
                      <td className="num">{row.ga}</td>
                      <td className="num">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                      <td className="num pts">{row.points}</td>
                      <td>
                        <FormPills form={row.form} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {active === 'calendario' ? (
        <section className="d-block">
          <h3>Próximos partidos</h3>
          {upcoming.length === 0 ? (
            <p className="d-note">No hay partidos programados.</p>
          ) : (
            upcoming.map((match) => (
              <MatchRow key={match.id} match={match} tournamentId={detail.id} />
            ))
          )}
        </section>
      ) : null}

      {active === 'resultados' ? (
        <section className="d-block">
          <h3>Resultados</h3>
          {finished.length === 0 ? (
            <p className="d-note">Todavía no hay resultados publicados.</p>
          ) : (
            finished
              .slice()
              .reverse()
              .map((match) => <MatchRow key={match.id} match={match} tournamentId={detail.id} />)
          )}
        </section>
      ) : null}

      {active === 'estadisticas' ? (
        <section className="st-section">
          <header className="st-head">
            <p className="st-eyebrow">Estadísticas</p>
            <h3>{stats?.phaseName ? `Fase: ${stats.phaseName}` : 'Los números del torneo'}</h3>
          </header>

          <div className="st-grid">
            <div className="st-card">
              <h4>Resultados</h4>
              <p className="st-sub">Reparto de local, empate y visita entre los partidos jugados</p>
              {!stats || stats.counts.matchesPlayed === 0 ? (
                <p className="d-note">No hay resultados todavía.</p>
              ) : (
                <DonutChart
                  centerValue={stats.counts.matchesPlayed}
                  centerLabel="jugados"
                  segments={[
                    { label: 'Local', value: stats.counts.homeWins, color: STAT_COLORS.green },
                    { label: 'Empate', value: stats.counts.draws, color: STAT_COLORS.gray },
                    { label: 'Visita', value: stats.counts.awayWins, color: STAT_COLORS.blue },
                  ]}
                />
              )}
            </div>

            <div className="st-card">
              <h4>Goleo</h4>
              <p className="st-sub">Máximos anotadores del torneo</p>
              {!stats || stats.scorers.length === 0 ? (
                <p className="d-note">Aún no hay goles registrados.</p>
              ) : (
                <>
                  <RankingBars
                    items={stats.scorers.slice(0, 5)}
                    color={STAT_COLORS.green}
                    getValue={(row) => row.goals}
                  />
                  <details className="st-more">
                    <summary>Ranking completo de goleo</summary>
                    <PlayerStatTable
                      rows={stats.scorers}
                      columns={[
                        { key: 'goals', label: 'Goles' },
                        { key: 'penaltyGoals', label: 'Penal' },
                      ]}
                      emptyLabel="Aún no hay goles registrados."
                    />
                  </details>
                </>
              )}
            </div>
          </div>

          <div className="st-grid">
            <div className="st-card">
              <h4>Asistencias</h4>
              <p className="st-sub">Los mejores pasadores / creadores de juego</p>
              {!stats || stats.assists.length === 0 ? (
                <p className="d-note">Aún no hay asistencias registradas.</p>
              ) : (
                <>
                  <RankingBars
                    items={stats.assists.slice(0, 5)}
                    color={STAT_COLORS.blue}
                    getValue={(row) => row.assists}
                  />
                  <details className="st-more">
                    <summary>Ranking completo de asistencias</summary>
                    <PlayerStatTable
                      rows={stats.assists}
                      columns={[{ key: 'assists', label: 'Asist.' }]}
                      emptyLabel="Aún no hay asistencias registradas."
                    />
                  </details>
                </>
              )}
            </div>

            <div className="st-card">
              <h4>Disciplina</h4>
              <p className="st-sub">Amarillas, doble amarilla y rojas de los más sancionados</p>
              {!stats || stats.discipline.length === 0 ? (
                <p className="d-note">Aún no hay incidencias registradas.</p>
              ) : (
                <>
                  <StackedDiscipline items={stats.discipline.slice(0, 5)} />
                  <details className="st-more">
                    <summary>Detalle completo de disciplina</summary>
                    <PlayerStatTable
                      rows={stats.discipline}
                      columns={[
                        { key: 'yellow', label: 'Amarillas' },
                        { key: 'secondYellow', label: '2ª am.' },
                        { key: 'red', label: 'Rojas' },
                        { key: 'foulsCommitted', label: 'Faltas' },
                      ]}
                      emptyLabel="Aún no hay incidencias registradas."
                    />
                  </details>
                </>
              )}
            </div>
          </div>

          <div className="st-card">
            <h4>Por equipo</h4>
            <p className="st-sub">Balanza de goles: a favor (verde) y en contra (rojo)</p>
            {!stats || stats.teams.length === 0 ? (
              <p className="d-note">Sin datos por equipo.</p>
            ) : (
              <>
                <TeamBalance teams={stats.teams} />
                <details className="st-more">
                  <summary>Tabla completa de equipos</summary>
                  <div className="d-table-scroll">
                    <table className="d-table">
                      <thead>
                        <tr>
                          <th>Equipo</th>
                          <th className="num">PJ</th>
                          <th className="num">GF</th>
                          <th className="num">GC</th>
                          <th className="num">VI</th>
                          <th className="num">A</th>
                          <th className="num">R</th>
                          <th className="num">Faltas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.teams.map((team) => (
                          <tr key={team.entryId}>
                            <td className="name">
                              <Link className="d-inline-link" href={`/teams/${team.teamId}`}>
                                {team.name}
                              </Link>
                            </td>
                            <td className="num">{team.played}</td>
                            <td className="num">{team.gf}</td>
                            <td className="num">{team.ga}</td>
                            <td className="num">{team.cleanSheets}</td>
                            <td className="num">{team.yellow}</td>
                            <td className="num">{team.red}</td>
                            <td className="num">{team.foulsCommitted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
          </div>
        </section>
      ) : null}

      {active === 'noticias' ? (
        <section className="d-block">
          <h3>Noticias</h3>
          {news.length === 0 ? (
            <p className="d-note">Todavía no hay noticias publicadas.</p>
          ) : (
            <ul className="d-news-list">
              {news.map((post) => (
                <li key={post.id}>
                  <Link
                    className="d-news-link"
                    href={`/tournaments/${detail.id}/news/${post.slug}`}
                  >
                    <span className="d-news-title">{post.title}</span>
                    <span className="d-news-meta">
                      {post.author.displayName}
                      {post.publishedAt
                        ? ` · ${formatMatchDateTime(post.publishedAt)}`
                        : ' · Borrador'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
