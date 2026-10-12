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
  form?: string[];
}

export interface StatsPlayerRow {
  rank: number;
  playerId: string;
  playerName: string;
  jerseyNumber: number | null;
  entryId: string;
  teamId: string;
  teamName: string;
  goals: number;
  penaltyGoals: number;
  ownGoals: number;
  assists: number;
  yellow: number;
  secondYellow: number;
  red: number;
  foulsCommitted: number;
  foulsReceived: number;
  saves: number;
}

export interface StatsTeamRow {
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
  cleanSheets: number;
  foulsCommitted: number;
  foulsReceived: number;
  yellow: number;
  red: number;
}

export interface TournamentStats {
  phaseId: string | null;
  phaseName: string | null;
  counts: {
    matchesTotal: number;
    matchesPlayed: number;
    matchesPending: number;
    goalsTotal: number;
    avgGoalsPerMatch: number | null;
    homeWins: number;
    draws: number;
    awayWins: number;
  };
  scorers: StatsPlayerRow[];
  assists: StatsPlayerRow[];
  discipline: StatsPlayerRow[];
  teams: StatsTeamRow[];
}

export interface MatchEvent {
  id: string;
  matchId: string;
  eventType: string;
  minute: number | null;
  period: string;
  status: string;
  player: { id: string; displayName: string; preferredPosition: string | null } | null;
  jerseyNumber: number | null;
  secondaryPlayer: { id: string; displayName: string; preferredPosition: string | null } | null;
  secondaryJerseyNumber: number | null;
}

export interface TeamProfile {
  team: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    createdAt: string;
    creator: { id: string; displayName: string };
  };
  entries: {
    id: string;
    registrationStatus: string;
    tournament: { id: string; name: string; slug: string; status: string };
  }[];
  players: {
    id: string;
    displayName: string;
    photoUrl: string | null;
    preferredPosition: string | null;
    age: number | null;
  }[];
  squads: {
    entryId: string;
    registrationStatus: string;
    tournament: { id: string; name: string; slug: string; status: string };
    players: {
      rosterId: string;
      jerseyNumber: number | null;
      position: string | null;
      status: string;
      playerId: string;
      displayName: string;
      photoUrl: string | null;
      preferredPosition: string | null;
      age: number | null;
    }[];
  }[];
  recentMatches: {
    id: string;
    homeScore: number | null;
    awayScore: number | null;
    scheduledAt: string | null;
    tournament: { id: string; name: string; slug: string };
    homeTeam: { id: string; team: { id: string; name: string } } | null;
    awayTeam: { id: string; team: { id: string; name: string } } | null;
  }[];
  form: { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number };
}

export interface PlayerProfile {
  player: {
    id: string;
    displayName: string;
    dateOfBirth: string | null;
    photoUrl: string | null;
    preferredPosition: string | null;
    createdAt: string;
  };
  teams: {
    rosterId: string;
    jerseyNumber: number | null;
    position: string | null;
    team: { id: string; name: string; slug: string; logoUrl: string | null };
    tournament: { id: string; name: string; slug: string };
  }[];
  stats: {
    goals: number;
    penaltyGoals: number;
    ownGoals: number;
    assists: number;
    yellow: number;
    secondYellow: number;
    red: number;
    foulsCommitted: number;
    foulsReceived: number;
    saves: number;
  };
  recentEvents: {
    eventType: string;
    minute: number | null;
    teamRosterId: string | null;
    secondaryTeamRosterId: string | null;
    match: { id: string; scheduledAt: string | null; tournament: { id: string; name: string; slug: string } };
  }[];
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

export function getTournamentStats(id: string, phaseId?: string): Promise<TournamentStats> {
  return apiRequest<TournamentStats>(`/tournaments/${id}/stats${buildQuery({ phaseId })}`);
}

export function getMatch(id: string, matchId: string): Promise<Match> {
  return apiRequest<Match>(`/tournaments/${id}/matches/${matchId}`);
}

export function listMatchEvents(id: string, matchId: string): Promise<MatchEvent[]> {
  return apiRequest<MatchEvent[]>(`/tournaments/${id}/matches/${matchId}/events`);
}

export function getTeamProfile(id: string): Promise<TeamProfile> {
  return apiRequest<TeamProfile>(`/teams/${id}/profile`);
}

export function getPlayerProfile(id: string): Promise<PlayerProfile> {
  return apiRequest<PlayerProfile>(`/players/${id}/profile`);
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