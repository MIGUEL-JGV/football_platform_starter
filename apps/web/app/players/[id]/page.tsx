import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPlayerProfile } from '../../../lib/api';
import { getSession } from '../../../lib/auth';
import { listPlayerPhotos } from '../../../lib/manage';
import type { PlayerPhoto } from '../../../lib/manage';
import { Topbar } from '../../../components/Topbar';
import { PlayerPhotoGallery } from '../../../components/PlayerPhotoGallery';
import { formatEvent, formatMatchDateTime } from '../../../lib/format';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const profile = await getPlayerProfile(id);
  return { title: profile ? `${profile.player.displayName} · CANCHA+` : 'Jugador · CANCHA+' };
}

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: 'Portero',
  defender: 'Defensa',
  midfielder: 'Mediocampista',
  forward: 'Delantero',
};

export default async function PlayerProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const profile = await getPlayerProfile(id);
  if (!profile) {
    notFound();
  }
  const { player, teams, stats, recentEvents } = profile;
  const position = player.preferredPosition
    ? POSITION_LABELS[player.preferredPosition] ?? player.preferredPosition
    : 'Posición sin definir';

  const session = await getSession();
  let photos: PlayerPhoto[] = [];
  let canManagePhotos = false;
  if (session) {
    try {
      photos = await listPlayerPhotos(session.token, player.id);
      canManagePhotos = true;
    } catch {
      canManagePhotos = false;
    }
  }

  return (
    <main className="page">
      <Topbar />

      <section className="d-hero">
        <div className="d-pills">
          <span className="d-pill">{position}</span>
        </div>
        <h1 className="d-title">{player.displayName}</h1>
        <p className="d-counts">
          {teams.length > 0
            ? `${teams.length} equipo${teams.length === 1 ? '' : 's'}`
            : 'Sin equipos registrados'}
        </p>
      </section>

      <section className="d-block">
        <h3>Estadísticas</h3>
        <div className="d-stat-grid">
          <div className="d-stat">
            <span className="d-stat-value">{stats.goals}</span>
            <span className="d-stat-label">Goles</span>
          </div>
          <div className="d-stat">
            <span className="d-stat-value">{stats.assists}</span>
            <span className="d-stat-label">Asistencias</span>
          </div>
          <div className="d-stat">
            <span className="d-stat-value">{stats.yellow}</span>
            <span className="d-stat-label">Amarillas</span>
          </div>
          <div className="d-stat">
            <span className="d-stat-value">{stats.red}</span>
            <span className="d-stat-label">Rojas</span>
          </div>
        </div>
      </section>

      <PlayerPhotoGallery
        playerId={player.id}
        initialPhotos={photos}
        canManage={canManagePhotos}
      />

      <section className="d-block">
        <h3>Equipos</h3>
        {teams.length === 0 ? (
          <p className="d-note">Este jugador no está registrado en ninguna convocatoria.</p>
        ) : (
          <ul className="d-news-list">
            {teams.map((entry) => (
              <li key={entry.rosterId}>
                <Link className="d-news-link" href={`/teams/${entry.team.id}`}>
                  <span className="d-news-title">
                    {entry.team.name}
                    {entry.jerseyNumber !== null ? ` · #${entry.jerseyNumber}` : ''}
                  </span>
                  <span className="d-news-meta">{entry.tournament.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="d-block">
        <h3>Últimos eventos</h3>
        {recentEvents.length === 0 ? (
          <p className="d-note">Todavía no hay eventos registrados.</p>
        ) : (
          <ul className="d-timeline">
            {recentEvents.map((event, index) => (
              <li key={index} className="d-timeline-item">
                <span className="d-timeline-minute">
                  {event.minute !== null ? `${event.minute}'` : '—'}
                </span>
                <span className={`d-timeline-badge d-ev-${event.eventType}`}>
                  {formatEvent(event.eventType)}
                </span>
                <span className="d-timeline-body">
                  <Link className="d-news-link" href={`/tournaments/${event.match.tournament.id}`}>
                    <span className="d-timeline-player">{event.match.tournament.name}</span>
                    <span className="d-timeline-secondary">
                      {formatMatchDateTime(event.match.scheduledAt)}
                    </span>
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
