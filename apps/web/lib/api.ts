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