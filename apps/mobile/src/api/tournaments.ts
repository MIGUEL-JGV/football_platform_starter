import {
  FootballFormat,
  Paginated,
  TournamentStatus,
  TournamentVisibility,
} from '@football/shared-types';
import { apiRequest } from './client';

export interface OrganizationRef {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface TournamentCounts {
  members: number;
  entries: number;
  follows: number;
}

export interface TournamentListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  format: FootballFormat;
  visibility: TournamentVisibility;
  status: TournamentStatus;
  timezone: string;
  startDate: string | null;
  endDate: string | null;
  registrationOpenAt: string | null;
  registrationCloseAt: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  organization: OrganizationRef;
  _count: TournamentCounts;
}

export interface TournamentDetail extends TournamentListItem {
  myRole?: string | null;
  following: boolean;
}

export interface ListTournamentsParams {
  q?: string;
  status?: TournamentStatus;
  format?: FootballFormat;
  organizationId?: string;
  page?: number;
  pageSize?: number;
}

export interface StandingRow {
  rank: number;
  entryId: string;
  teamId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export interface StandingsResponse {
  tournamentId: string;
  phaseId: string;
  phaseName: string;
  phaseType: string;
  items: StandingRow[];
}

export interface MatchTeam {
  id: string;
  team: { id: string; name: string; slug: string; logoUrl: string | null };
}

export interface Match {
  id: string;
  tournamentId: string;
  status: string;
  scheduledAt: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  phase: { id: string; name: string; phaseType: string; sequence: number } | null;
  matchday: { id: string; name: string; sequence: number } | null;
  venue: { id: string; name: string; address: string | null; timezone: string } | null;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
}

export interface MyTournamentsResponse {
  items: TournamentDetail[];
  total: number;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export function listTournaments(
  params: ListTournamentsParams = {},
): Promise<Paginated<TournamentListItem>> {
  return apiRequest<Paginated<TournamentListItem>>(
    `/tournaments${buildQuery(params as Record<string, string | number | undefined>)}`,
  );
}

export function getTournament(id: string, token: string | null): Promise<TournamentDetail> {
  return apiRequest<TournamentDetail>(`/tournaments/${id}`, { token });
}

export function getStandings(id: string, phaseId?: string): Promise<StandingsResponse> {
  return apiRequest<StandingsResponse>(`/tournaments/${id}/standings${buildQuery({ phaseId })}`);
}

export function listMatches(id: string): Promise<Match[]> {
  return apiRequest<Match[]>(`/tournaments/${id}/matches`);
}

export function myTournaments(token: string): Promise<MyTournamentsResponse> {
  return apiRequest<MyTournamentsResponse>('/tournaments/me/tournaments', { token });
}

export function followTournament(id: string, token: string): Promise<{ following: boolean }> {
  return apiRequest<{ following: boolean }>(`/tournaments/${id}/follow`, {
    method: 'POST',
    token,
  });
}

export function unfollowTournament(id: string, token: string): Promise<{ following: boolean }> {
  return apiRequest<{ following: boolean }>(`/tournaments/${id}/follow`, {
    method: 'DELETE',
    token,
  });
}