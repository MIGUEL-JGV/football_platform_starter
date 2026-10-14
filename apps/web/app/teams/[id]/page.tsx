import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTeamProfile } from '../../../lib/api';
import { Topbar } from '../../../components/Topbar';
import { formatMatchDateTime, formatStatus } from '../../../lib/format';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const profile = await getTeamProfile(id);
  return { title: profile ? `${profile.team.name} · CANCHA+` : 'Equipo · CANCHA+' };
}

export default async function TeamProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const profile = await getTeamProfile(id);
  if (!profile) {
    notFound();
  }
  const { team, entries, players, squads, recentMatches, form } = profile;

  const initials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

  const avatar = (photoUrl: string | null, name: string) =>
    photoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="d-avatar" src={photoUrl} alt={name} />
    ) : (
      <span className="d-avatar d-avatar-fallback">{initials(name)}</span>
    );

  return (
    <main className="page">
      <Topbar />

      <section className="d-hero">
        <div className="d-pills">
          <span className="d-pill">Equipo</span>
        </div>
        <h1 className="d-title">{team.name}</h1>
        <p className="d-counts">Fundado por {team.creator.displayName}</p>
        {team.description ? <p className="d-desc">{team.description}</p> : null}
      </section>

      <section className="d-block">
        <h3>Rendimiento reciente</h3>
        <div className="d-stat-grid">
          <div className="d-stat">
            <span className="d-stat-value">{form.played}</span>
            <span className="d-stat-label">Partidos</span>
          </div>
          <div className="d-stat">
            <span className="d-stat-value">
              {form.won}-{form.drawn}-{form.lost}
            </span>
            <span className="d-stat-label">G-E-P</span>
          </div>
          <div className="d-stat">
            <span className="d-stat-value">{form.gf}</span>
            <span className="d-stat-label">Goles a favor</span>
          </div>
          <div className="d-stat">
            <span className="d-stat-value">{form.gd > 0 ? `+${form.gd}` : form.gd}</span>
            <span className="d-stat-label">Diferencia</span>
          </div>
        </div>
      </section>

      <section className="d-block">
        <h3>Torneos</h3>
        {entries.length === 0 ? (
          <p className="d-note">Este equipo todavía no participa en ningún torneo.</p>
        ) : (
          <ul className="d-news-list">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Link className="d-news-link" href={`/tournaments/${entry.tournament.id}`}>
                  <span className="d-news-title">{entry.tournament.name}</span>
                  <span className="d-news-meta">{formatStatus(entry.tournament.status as never)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="d-block">
        <h3>Integrantes</h3>
        {squads.length === 0 && players.length === 0 ? (
          <p className="d-note">Este equipo todavía no tiene integrantes registrados.</p>
        ) : squads.length > 0 ? (
          squads.map((squad) => (
            <div className="d-roster-group" key={squad.entryId}>
              <Link className="d-roster-group-title" href={`/tournaments/${squad.tournament.id}`}>
                {squad.tournament.name}
              </Link>
              <ul className="d-roster">
                {squad.players.map((player) => (
                  <li className="d-roster-row" key={player.rosterId}>
                    <span className="d-roster-num">{player.jerseyNumber ?? '–'}</span>
                    {avatar(player.photoUrl, player.displayName)}
                    <Link className="d-roster-name" href={`/players/${player.playerId}`}>
                      {player.displayName}
                    </Link>
                    <span className="d-roster-pos">
                      {player.position ?? player.preferredPosition ?? ''}
                      {player.age != null ? ` · ${player.age} años` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <ul className="d-roster">
            {players.map((player) => (
              <li className="d-roster-row" key={player.id}>
                <span className="d-roster-num">–</span>
                {avatar(player.photoUrl, player.displayName)}
                <Link className="d-roster-name" href={`/players/${player.id}`}>
                  {player.displayName}
                </Link>
                <span className="d-roster-pos">
                  {player.preferredPosition ?? ''}
                  {player.age != null ? ` · ${player.age} años` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="d-block">
        <h3>Últimos partidos</h3>
        {recentMatches.length === 0 ? (
          <p className="d-note">Todavía no hay partidos jugados.</p>
        ) : (
          recentMatches.map((match) => {
            const isHome = match.homeTeam?.team?.id === team.id;
            const scored = (isHome ? match.homeScore : match.awayScore) ?? 0;
            const conceded = (isHome ? match.awayScore : match.homeScore) ?? 0;
            return (
              <div className="d-match" key={match.id}>
                <div className="d-match-rows">
                  <div className="d-match-teams">
                    <div className="d-match-team">{match.homeTeam?.team?.name ?? 'Por definir'}</div>
                    <div className="d-match-team">{match.awayTeam?.team?.name ?? 'Por definir'}</div>
                  </div>
                  <div className="d-match-score">
                    {match.homeScore} – {match.awayScore}
                  </div>
                </div>
                <p className="d-match-meta">
                  {match.tournament.name} · {formatMatchDateTime(match.scheduledAt)}
                  {scored > conceded ? ' · Victoria' : scored < conceded ? ' · Derrota' : ' · Empate'}
                </p>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
