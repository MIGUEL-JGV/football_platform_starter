import { mutate, request } from './api';

export interface MyOrganization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  status: string;
  myRole: string;
  _count: { members: number; tournaments: number };
}

export interface OrganizationMember {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface EntryTeam {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface TournamentEntry {
  id: string;
  tournamentId: string;
  teamId: string;
  registrationStatus: string;
  requestedBy: string;
  registeredAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  team: EntryTeam;
  requester: { id: string; displayName: string } | null;
  _count: { roster: number };
}

export function listMyOrganizations(token: string): Promise<MyOrganization[]> {
  return request<MyOrganization[]>('/organizations', token);
}

export function listOrganizationMembers(
  token: string,
  organizationId: string,
): Promise<OrganizationMember[]> {
  return request<OrganizationMember[]>(`/organizations/${organizationId}/members`, token);
}

export function listEntries(token: string, tournamentId: string): Promise<TournamentEntry[]> {
  return request<TournamentEntry[]>(`/tournaments/${tournamentId}/entries`, token);
}

export function approveEntry(
  token: string,
  tournamentId: string,
  entryId: string,
): Promise<TournamentEntry> {
  return mutate<TournamentEntry>(`/tournaments/${tournamentId}/entries/${entryId}/approve`, {
    method: 'POST',
    token,
  });
}

export function rejectEntry(
  token: string,
  tournamentId: string,
  entryId: string,
): Promise<TournamentEntry> {
  return mutate<TournamentEntry>(`/tournaments/${tournamentId}/entries/${entryId}/reject`, {
    method: 'POST',
    token,
  });
}

export function withdrawEntry(
  token: string,
  tournamentId: string,
  entryId: string,
): Promise<{ removed: boolean }> {
  return mutate<{ removed: boolean }>(`/tournaments/${tournamentId}/entries/${entryId}`, {
    method: 'DELETE',
    token,
  });
}

export type PhaseType = 'league' | 'group_stage' | 'knockout';

export type MatchStatus =
  | 'scheduled'
  | 'postponed'
  | 'in_progress'
  | 'pending_validation'
  | 'finished'
  | 'cancelled'
  | 'abandoned';

export const PHASE_TYPE_LABELS: Record<PhaseType, string> = {
  league: 'Liga',
  group_stage: 'Fase de grupos',
  knockout: 'Eliminatoria',
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: 'Programado',
  postponed: 'Aplazado',
  in_progress: 'En juego',
  pending_validation: 'Por validar',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
  abandoned: 'Abandonado',
};

export interface Phase {
  id: string;
  tournamentId: string;
  name: string;
  phaseType: PhaseType;
  sequence: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  _count: { matchdays: number; matches: number; groups: number };
}

export interface Matchday {
  id: string;
  phaseId: string;
  name: string;
  sequence: number;
  scheduledDate: string | null;
  _count: { matches: number };
}

export interface ManageMatch {
  id: string;
  status: MatchStatus;
  scheduledAt: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  phase: { id: string; name: string; phaseType: string; sequence: number } | null;
  matchday: { id: string; name: string; sequence: number } | null;
  homeTeam: { id: string; team: EntryTeam };
  awayTeam: { id: string; team: EntryTeam };
  _count: { events: number };
}

export function listPhases(token: string, tournamentId: string): Promise<Phase[]> {
  return request<Phase[]>(`/tournaments/${tournamentId}/phases`, token);
}

export function createPhase(
  token: string,
  tournamentId: string,
  dto: { name: string; phaseType: PhaseType },
): Promise<Phase> {
  return mutate<Phase>(`/tournaments/${tournamentId}/phases`, { method: 'POST', body: dto, token });
}

export function listMatchdays(
  token: string,
  tournamentId: string,
  phaseId: string,
): Promise<Matchday[]> {
  return request<Matchday[]>(`/tournaments/${tournamentId}/phases/${phaseId}/matchdays`, token);
}

export function createMatchday(
  token: string,
  tournamentId: string,
  phaseId: string,
  dto: { name: string },
): Promise<Matchday> {
  return mutate<Matchday>(`/tournaments/${tournamentId}/phases/${phaseId}/matchdays`, {
    method: 'POST',
    body: dto,
    token,
  });
}

export function listManageMatches(token: string, tournamentId: string): Promise<ManageMatch[]> {
  return request<ManageMatch[]>(`/tournaments/${tournamentId}/matches`, token);
}

export function createMatch(
  token: string,
  tournamentId: string,
  dto: {
    phaseId: string;
    matchdayId?: string;
    homeTournamentTeamId: string;
    awayTournamentTeamId: string;
    scheduledAt?: string;
  },
): Promise<ManageMatch> {
  return mutate<ManageMatch>(`/tournaments/${tournamentId}/matches`, {
    method: 'POST',
    body: dto,
    token,
  });
}

export function recordMatchResult(
  token: string,
  tournamentId: string,
  matchId: string,
  dto: { homeScore: number; awayScore: number },
): Promise<ManageMatch> {
  return mutate<ManageMatch>(`/tournaments/${tournamentId}/matches/${matchId}/result`, {
    method: 'POST',
    body: dto,
    token,
  });
}

export function validateMatchResult(
  token: string,
  tournamentId: string,
  matchId: string,
): Promise<ManageMatch> {
  return mutate<ManageMatch>(`/tournaments/${tournamentId}/matches/${matchId}/result/validate`, {
    method: 'POST',
    token,
  });
}

export function clearMatchResult(
  token: string,
  tournamentId: string,
  matchId: string,
): Promise<ManageMatch> {
  return mutate<ManageMatch>(`/tournaments/${tournamentId}/matches/${matchId}/result/clear`, {
    method: 'POST',
    token,
  });
}
