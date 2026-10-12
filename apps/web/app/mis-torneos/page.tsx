import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Topbar } from '../../components/Topbar';
import { getSession } from '../../lib/auth';
import { listMyTournaments } from '../../lib/api';
import { formatDateRange, formatFootball, formatStatus } from '../../lib/format';
import type { MyTournamentItem } from '../../lib/api';

export default async function MyTournamentsPage() {
  const session = await getSession();
  let items: MyTournamentItem[] = [];

  if (session) {
    try {
      items = await listMyTournaments(session.token);
    } catch {
      items = [];
    }
  }

  return (
    <main className="page">
      <Topbar />
      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">TU ESPACIO</p><h2>Mis torneos</h2></div>
          {session ? <span className="result-count">{items.length} torneos</span> : null}
        </div>

        {!session ? (
          <div>
            <p className="empty">Inicia sesión para ver los torneos que sigues, participas u organizas.</p>
            <div className="account-ctas">
              <Link className="light-button" href="/login">Iniciar sesión</Link>
              <Link className="login" href="/register">Crear cuenta</Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <p className="empty">Aún no sigues ningún torneo. Explora el catálogo y sigue tus favoritos.</p>
        ) : (
          <div className="cards">
            {items.map((t, i) => (
              <article className="tournament-card" key={t.id}>
                <div className={`card-art art-${(i % 3) + 1}`} style={backgroundStyle(t)}>
                  <span className="sport-tag">{formatFootball(t.format)}</span>
                  <span className="ball">⚽</span>
                </div>
                <div className="card-body">
                  <span className="status-dot">{formatStatus(t.status)}</span>
                  <h3>{t.name}</h3>
                  <p>{t.organization.name} · {formatDateRange(t.startDate, t.endDate)}</p>
                  {t.following ? <span className="my-tag">Siguiendo</span> : null}
                  <Link href={`/tournaments/${t.id}`}>Ver torneo <span>↗</span></Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function backgroundStyle(tournament: MyTournamentItem): CSSProperties | undefined {
  const url = tournament.coverUrl ?? tournament.logoUrl;
  return url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined;
}