import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { Paginated, PublicTournamentCard, TournamentStatus } from '@football/shared-types';
import { listTournaments } from '../../lib/api';
import { formatDateRange, formatFootball, formatStatus } from '../../lib/format';
import { Topbar } from '../../components/Topbar';

const STATUS_OPTIONS: { value: TournamentStatus; label: string }[] = [
  { value: 'registration', label: 'Inscripciones abiertas' },
  { value: 'upcoming', label: 'Próximamente' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'completed', label: 'Finalizado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const PAGE_SIZE = 9;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildQuery(params: { q?: string; status?: string; page?: number }): string {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.status) query.set('status', params.status);
  if (params.page && params.page > 1) query.set('page', String(params.page));
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export default async function TournamentsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = first(sp.q);
  const status = first(sp.status) as TournamentStatus | undefined;
  const page = Math.max(1, Number(first(sp.page) ?? '1') || 1);

  let result: Paginated<PublicTournamentCard>;
  try {
    result = await listTournaments({ q, status, page, pageSize: PAGE_SIZE });
  } catch {
    result = { items: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 0 };
  }

  return (
    <main className="page">
      <Topbar />

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">CATÁLOGO</p><h2>Torneos</h2></div>
          <span className="result-count">{result.total} torneos</span>
        </div>

        <form className="catalog-filters" action="/tournaments" method="get">
          <input aria-label="Buscar torneos" name="q" defaultValue={q ?? ''} placeholder="Busca un torneo u organización"/>
          <select aria-label="Estado" name="status" defaultValue={status ?? ''}>
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button type="submit">Filtrar</button>
        </form>

        {result.items.length === 0 ? (
          <p className="empty">No se encontraron torneos con esos criterios.</p>
        ) : (
          <div className="cards">
            {result.items.map((t, i) => (
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

        {result.totalPages > 1 && (
          <nav className="pagination">
            {page > 1 && (
              <Link href={`/tournaments${buildQuery({ q, status, page: page - 1 })}`}>← Anterior</Link>
            )}
            <span>Página {page} de {result.totalPages}</span>
            {page < result.totalPages && (
              <Link href={`/tournaments${buildQuery({ q, status, page: page + 1 })}`}>Siguiente →</Link>
            )}
          </nav>
        )}
      </section>
    </main>
  );
}

function backgroundStyle(tournament: PublicTournamentCard): CSSProperties | undefined {
  const url = tournament.coverUrl ?? tournament.logoUrl;
  return url ? { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined;
}