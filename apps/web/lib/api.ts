import type {
  FootballFormat,
  ListTournamentsParams,
  Paginated,
  PublicTournamentCard,
  TournamentStatus,
} from '@football/shared-types';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000/api/v1';

interface ApiTournamentItem {
  id: string;
  name: string;
  format: FootballFormat;
  status: TournamentStatus;
  startDate: string | null;
  endDate: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  organization: { id: string; name: string; slug: string };
}

export interface TournamentDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  format: FootballFormat;
  status: TournamentStatus;
  timezone: string;
  startDate: string | null;
  endDate: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  organization: { id: string; name: string; slug: string };
  _count: { members: number; entries: number; follows: number };
  following: boolean;
}

export interface StandingRow {
  rank: number;
  entryId: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export interface Match {
  id: string;
  scheduledAt: string | null;
  homeScore: number | null;
  awayScore: number | null;
  matchday: { id: string; name: string; sequence: number } | null;
  phase: { id: string; name: string; phaseType: string; sequence: number } | null;
  venue: { id: string; name: string; address: string | null; timezone: string } | null;
  homeTeam: { id: string; team: { id: string; name: string; slug: string; logoUrl: string | null } };
  awayTeam: { id: string; team: { id: string; name: string; slug: string; logoUrl: string | null } };
}

export async function listTournaments(
  params: ListTournamentsParams = {},
): Promise<Paginated<PublicTournamentCard>> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.status) query.set('status', params.status);
  if (params.format) query.set('format', params.format);
  if (params.organizationId) query.set('organizationId', params.organizationId);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  const qs = query.toString();
  const response = await fetch(`${API_BASE_URL}/tournaments${qs ? `?${qs}` : ''}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`La API respondió ${response.status}`);
  }
  const data = (await response.json()) as Paginated<ApiTournamentItem>;
  return {
    ...data,
    items: data.items.map((item) => ({
      id: item.id,
      name: item.name,
      organizationName: item.organization?.name ?? 'Organización',
      format: item.format,
      status: item.status,
      startDate: item.startDate,
      endDate: item.endDate,
      logoUrl: item.logoUrl,
      coverUrl: item.coverUrl,
    })),
  };
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' });
  if (response.status === 404) {
    throw new ApiNotFoundError();
  }
  if (!response.ok) {
    throw new Error(`La API respondió ${response.status}`);
  }
  return (await response.json()) as T;
}

export class ApiNotFoundError extends Error {
  constructor() {
    super('No encontrado');
    this.name = 'ApiNotFoundError';
  }
}

export function getTournamentDetail(id: string): Promise<TournamentDetail> {
  return request<TournamentDetail>(`/tournaments/${id}`);
}

export async function getTournamentStandings(
  id: string,
): Promise<{ items: StandingRow[]; phaseName: string | null }> {
  try {
    const data = (await request(`/tournaments/${id}/standings`)) as {
      phaseName?: string | null;
      items: StandingRow[];
    };
    return { items: data.items ?? [], phaseName: data.phaseName ?? null };
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      return { items: [], phaseName: null };
    }
    throw error;
  }
}

export async function listTournamentMatches(id: string): Promise<Match[]> {
  try {
    return await request<Match[]>(`/tournaments/${id}/matches`);
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      return [];
    }
    throw error;
  }
}