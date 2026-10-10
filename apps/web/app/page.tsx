import Link from 'next/link';
import type { CSSProperties } from 'react';
import { listTournaments } from '../lib/api';
import { formatDateRange, formatFootball, formatStatus } from '../lib/format';
import type { PublicTournamentCard } from '@football/shared-types';

const emptyCatalog: PublicTournamentCard[] = [];

export default async function HomePage() {
  let cards: PublicTournamentCard[] = emptyCatalog;
  try {
    const result = await listTournaments({ pageSize: 6 });
    cards = result.items;
  } catch {
    cards = emptyCatalog;
  }

  return (
    <main className="page">
      <header className="topbar">
        <Link className="brand" href="/">CANCHA<span>+</span></Link>
        <nav><a href="#torneos">Explorar torneos</a><a href="#mis-torneos">Mis torneos</a></nav>
        <Link className="login" href="/login">Iniciar sesión</Link>
      </header>
      <section className="hero">
        <p className="eyebrow">TODO EL FÚTBOL, EN UN SOLO LUGAR</p>
        <h1>Encuentra tu próximo<br/><span>torneo.</span></h1>
        <p className="intro">Consulta calendarios, equipos, resultados y clasificaciones de torneos de fútbol.</p>
        <form className="search" action="/tournaments" method="get">
          <span>⌕</span>
          <input aria-label="Buscar torneos" name="q" placeholder="Busca un torneo, equipo u organización"/>
          <button type="submit">Buscar</button>
        </form>
      </section>
      <section id="torneos" className="section">
        <div className="section-heading"><div><p className="eyebrow">CATÁLOGO</p><h2>Torneos para descubrir</h2></div><Link href="/tournaments">Ver todos ↗</Link></div>
        {cards.length === 0 ? (
          <p className="empty">Aún no hay torneos publicados.</p>
        ) : (
          <div className="cards">
            {cards.map((t, i) => (
              <article className="tournament-card" key={t.id}>
                <div className={`card-art art-${(i % 3) + 1}`} style={backgroundStyle(t)}>
                  <span className="sport-tag">{formatFootball(t.format)}</span>
                  <span className="ball">⚽</span>
                </div>
                <div className="card-body">
                  <span className="status-dot">{formatStatus(t.status)}</span>
                  <h3>{t.name}</h3>
                  <p>{t.organizationName} · {formatDateRange(t.startDate, t.endDate)}</p>
                  <Link href={`/tournaments/${t.id}`}>Ver torneo <span>↗</span></Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section id="mis-torneos" className="personal">
        <div><p className="eyebrow">TU ESPACIO</p><h2>Todos tus torneos,<br/>en un solo lugar.</h2><p>Administra tus competiciones, consulta los torneos en los que participas y sigue tus favoritos.</p></div>
        <Link className="light-button" href="/login">Entrar a mi espacio →</Link>
      </section>
      <footer><Link className="brand" href="/">CANCHA<span>+</span></Link><p>Plataforma de torneos de fútbol · Prototipo inicial</p></footer>
    </main>
  );
}

function backgroundStyle(tournament: PublicTournamentCard): CSSProperties | undefined {
  const url = tournament.coverUrl ?? tournament.logoUrl;
  return url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined;
}