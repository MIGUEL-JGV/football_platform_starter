import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDateRange, formatFootball, formatStatus } from '../../../lib/format';
import type { Match, StandingRow, TournamentDetail } from '../../../lib/api';
import {
  ApiNotFoundError,
  getTournamentDetail,
  getTournamentStandings,
  listTournamentMatches,
} from '../../../lib/api';
import { Topbar } from '../../../components/Topbar';
import { FollowButton } from '../../../components/FollowButton';
import { getSession } from '../../../lib/auth';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  try {
    const detail = await getTournamentDetail(id);
    return { title: `${detail.name} · CANCHA+` };
  } catch {
    return { title: 'Torneo · CANCHA+' };
  }
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Por definir';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Por definir';
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default async function TournamentDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const session = await getSession();

  let detail: TournamentDetail;
  let standings: StandingRow[] = [];
  let matches: Match[] = [];

  try {
    [detail, standings, matches] = await Promise.all([
      getTournamentDetail(id, session?.token),
      getTournamentStandings(id).then((result) => result.items),
      listTournamentMatches(id),
    ]);
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      notFound();
    }
    return (
      <main className="page">
        <Topbar />
        <p className="empty">No se pudo cargar el torneo. Intenta de nuevo más tarde.</p>
      </main>
    );
  }
  const following = session ? detail.following ?? false : false;

  const homeTeam = (match: Match) => match.homeTeam?.team?.name ?? 'Por definir';
  const awayTeam = (match: Match) => match.awayTeam?.team?.name ?? 'Por definir';
  const isFinished = (match: Match) => match.homeScore !== null && match.awayScore !== null;

  return (
    <main className="page">
      <Topbar />

      <Link className="d-back" href="/tournaments">← Volver a torneos</Link>

      <section className="d-hero">
        <div className="d-pills">
          <span className="d-pill">{formatStatus(detail.status)}</span>
          <span className="d-pill">{formatFootball(detail.format)}</span>
          <span className="d-pill">{detail.organization.name}</span>
        </div>
        <h1 className="d-title">{detail.name}</h1>
        <p className="d-dates">{formatDateRange(detail.startDate, detail.endDate)}</p>
        {detail.description ? <p className="d-desc">{detail.description}</p> : null}
        <p className="d-counts">
          {detail._count.entries} equipos participantes · {detail._count.follows} seguidores
        </p>
        {session ? <FollowButton tournamentId={id} following={following} /> : null}
      </section>

      <section className="d-block">
        <h3>Tabla de posiciones</h3>
        {standings.length === 0 ? (
          <p className="d-note">La tabla se publicará cuando empiecen los partidos.</p>
        ) : (
          <table className="d-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Equipo</th>
                <th className="num">PJ</th>
                <th className="num">DIF</th>
                <th className="num">PTS</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={row.entryId}>
                  <td>{row.rank}</td>
                  <td className="name">{row.name}</td>
                  <td className="num">{row.played}</td>
                  <td className="num">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                  <td className="num pts">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="d-block">
        <h3>Calendario</h3>
        {matches.length === 0 ? (
          <p className="d-note">Todavía no hay partidos publicados.</p>
        ) : (
          matches.map((match) => (
            <div className="d-match" key={match.id}>
              <div className="d-match-rows">
                <div className="d-match-teams">
                  <div className="d-match-team">{homeTeam(match)}</div>
                  <div className="d-match-team">{awayTeam(match)}</div>
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
                {formatDateTime(match.scheduledAt)}
                {match.venue ? ` · ${match.venue.name}` : ''}
              </p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}