import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDateRange, formatFootball, formatStatus } from '../../../lib/format';
import type {
  Match,
  NewsItem,
  StandingRow,
  TournamentDetail,
  TournamentStats,
} from '../../../lib/api';
import {
  ApiNotFoundError,
  getTournamentDetail,
  getTournamentStandings,
  getTournamentStats,
  listTournamentMatches,
  listTournamentNews,
} from '../../../lib/api';
import { Topbar } from '../../../components/Topbar';
import { FollowButton } from '../../../components/FollowButton';
import { TournamentTabs } from '../../../components/TournamentTabs';
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

export default async function TournamentDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const session = await getSession();

  let detail: TournamentDetail;
  let standings: StandingRow[] = [];
  let matches: Match[] = [];
  let stats: TournamentStats | null = null;
  let news: NewsItem[] = [];

  try {
    [detail, standings, matches, stats, news] = await Promise.all([
      getTournamentDetail(id, session?.token),
      getTournamentStandings(id).then((result) => result.items),
      listTournamentMatches(id),
      getTournamentStats(id),
      listTournamentNews(id),
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

      <TournamentTabs
        detail={detail}
        standings={standings}
        matches={matches}
        stats={stats}
        news={news}
      />
    </main>
  );
}
