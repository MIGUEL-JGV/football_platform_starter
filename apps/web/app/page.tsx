import Link from 'next/link';

const sampleTournaments = [
  { name: 'Copa Metropolitana', format: 'Fútbol 7', status: 'Inscripciones abiertas', teams: 12 },
  { name: 'Liga Regional', format: 'Fútbol 11', status: 'En preparación', teams: 16 },
  { name: 'Copa Relámpago', format: 'Fútbol 5', status: 'Próximamente', teams: 8 },
];

export default function HomePage() {
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
        <div className="search"><span>⌕</span><input aria-label="Buscar torneos" placeholder="Busca un torneo, equipo u organización"/><button>Buscar</button></div>
      </section>
      <section id="torneos" className="section">
        <div className="section-heading"><div><p className="eyebrow">CATÁLOGO</p><h2>Torneos para descubrir</h2></div><Link href="/tournaments">Ver todos ↗</Link></div>
        <div className="cards">
          {sampleTournaments.map((t, i) => <article className="tournament-card" key={t.name}>
            <div className={`card-art art-${i + 1}`}><span className="sport-tag">{t.format}</span><span className="ball">⚽</span></div>
            <div className="card-body"><span className="status-dot">{t.status}</span><h3>{t.name}</h3><p>{t.teams} equipos · Organizador de ejemplo</p><Link href={`/tournaments/${i + 1}`}>Ver torneo <span>↗</span></Link></div>
          </article>)}
        </div>
      </section>
      <section id="mis-torneos" className="personal">
        <div><p className="eyebrow">TU ESPACIO</p><h2>Todos tus torneos,<br/>en un solo lugar.</h2><p>Administra tus competiciones, consulta los torneos en los que participas y sigue tus favoritos.</p></div>
        <Link className="light-button" href="/login">Entrar a mi espacio →</Link>
      </section>
      <footer><Link className="brand" href="/">CANCHA<span>+</span></Link><p>Plataforma de torneos de fútbol · Prototipo inicial</p></footer>
    </main>
  );
}