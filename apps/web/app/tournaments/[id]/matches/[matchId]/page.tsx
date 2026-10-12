import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Match, MatchEvent } from '../../../../../lib/api';
import {
  ApiNotFoundError,
  getMatch,
  getTournamentDetail,
  listMatchEvents,
} from '../../../../../lib/api';
import { Topbar } from '../../../../../components/Topbar';
import { formatEvent, formatMatchDateTime } from '../../../../../lib/format';

type Params = Promise<{ id: string; matchId: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id, matchId } = await params;
  try {
    const [detail, match] = await Promise.all([getTournamentDetail(id), getMatch(id, matchId)]);
    const home = match.homeTeam?.team?.name ?? 'Local';
    const away = match.awayTeam?.team?.name ?? 'Visitante';
    return { title: `${home} vs ${away} · ${detail.name} · CANCHA+` };
  } catch {
    return { title: 'Partido · CANCHA+' };
  }
}

export default async function MatchDetailPage({ params }: { params: Params }) {
  const { id, matchId } = await params;

  let detail;
  let match: Match;
  let events: MatchEvent[] = [];

  try {
    [detail, match, events] = await Promise.all([
      getTournamentDetail(id),
      getMatch(id, matchId),
      listMatchEvents(id, matchId),
    ]);
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      notFound();
    }
    return (
      <main className="page">
        <Topbar />
        <p className="empty">No se pudo cargar el partido. Intenta de nuevo más tarde.</p>
      </main>
    );
  }

  const home = match.homeTeam?.team?.name ?? 'Por definir';
  const away = match.awayTeam?.team?.name ?? 'Por definir';
  const finished = match.homeScore !== null && match.awayScore !== null;

  return (
    <main className="page">
      <Topbar />

      <Link className="d-back" href={`/tournaments/${id}`}>
        ← Volver a {detail.name}
      </Link>

      <section className="d-hero">
        <div className="d-pills">
          {match.matchday ? <span className="d-pill">{match.matchday.name}</span> : null}
          {match.phase ? <span className="d-pill">{match.phase.name}</span> : null}
        </div>
        <div className="d-scoreboard">
          <div className="d-scoreboard-team">{home}</div>
          <div className="d-scoreboard-score">
            {finished ? `${match.homeScore} – ${match.awayScore}` : 'vs'}
          </div>
          <div className="d-scoreboard-team">{away}</div>
        </div>
        <p className="d-dates">
          {formatMatchDateTime(match.scheduledAt)}
          {match.venue ? ` · ${match.venue.name}` : ''}
        </p>
      </section>

      <section className="d-block">
        <h3>Cronología</h3>
        {events.length === 0 ? (
          <p className="d-note">Todavía no hay eventos registrados para este partido.</p>
        ) : (
          <ul className="d-timeline">
            {events.map((event) => (
              <li key={event.id} className="d-timeline-item">
                <span className="d-timeline-minute">
                  {event.minute !== null ? `${event.minute}'` : '—'}
                </span>
                <span className={`d-timeline-badge d-ev-${event.eventType}`}>
                  {formatEvent(event.eventType)}
                </span>
                <span className="d-timeline-body">
                  <span className="d-timeline-player">
                    {event.player ? event.player.displayName : 'Equipo'}
                    {event.jerseyNumber !== null ? ` (#${event.jerseyNumber})` : ''}
                  </span>
                  {event.secondaryPlayer ? (
                    <span className="d-timeline-secondary">
                      {event.eventType === 'substitution' ? 'entra ' : 'asistencia de '}
                      {event.secondaryPlayer.displayName}
                    </span>
                  ) : null}
                </span>
                {event.status === 'voided' ? (
                  <span className="d-timeline-voided">anulado</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
