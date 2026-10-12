import { mutate, request, upload } from './api';

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
  submittedAt: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  representativeName: string | null;
  representativeEmail: string | null;
  representativePhone: string | null;
  team: EntryTeam;
  requester: { id: string; displayName: string } | null;
  _count: { roster: number };
}

export function listEntries(token: string, tournamentId: string): Promise<TournamentEntry[]> {
  return request<TournamentEntry[]>(`/tournaments/${tournamentId}/entries`, token);
}

export interface RosterConsent {
  playerId: string;
  granted: boolean;
  scope: string;
  guardianName: string | null;
  guardianRelation: string | null;
}

export interface RosterPlayer {
  id: string;
  tournamentTeamId: string;
  jerseyNumber: number | null;
  position: string | null;
  status: string;
  isMinor: boolean;
  consents: RosterConsent[];
  player: {
    id: string;
    displayName: string;
    dateOfBirth: string | null;
    photoUrl: string | null;
    preferredPosition: string | null;
  };
}

export function listEntryRoster(
  token: string,
  tournamentId: string,
  entryId: string,
): Promise<RosterPlayer[]> {
  return request<RosterPlayer[]>(`/tournaments/${tournamentId}/entries/${entryId}/roster`, token);
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
  reason?: string,
): Promise<TournamentEntry> {
  return mutate<TournamentEntry>(`/tournaments/${tournamentId}/entries/${entryId}/reject`, {
    method: 'POST',
    body: { reason },
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

export type MatchEventType =
  | 'goal'
  | 'own_goal'
  | 'penalty_goal'
  | 'penalty_missed'
  | 'penalty_conceded'
  | 'penalty_saved'
  | 'yellow_card'
  | 'second_yellow'
  | 'red_card'
  | 'substitution'
  | 'assist'
  | 'foul'
  | 'save';

export type MatchEventPeriod =
  | 'regular'
  | 'first_half'
  | 'second_half'
  | 'extra_time'
  | 'penalties';

export type MatchEventStatus = 'valid' | 'voided';

export interface ManagedMatchEvent {
  id: string;
  matchId: string;
  eventType: MatchEventType;
  minute: number | null;
  period: MatchEventPeriod;
  status: MatchEventStatus;
  teamRosterId: string | null;
  secondaryTeamRosterId: string | null;
  player: { id: string; displayName: string } | null;
  jerseyNumber: number | null;
  secondaryPlayer: { id: string; displayName: string } | null;
  secondaryJerseyNumber: number | null;
  recordedBy: string;
}

export interface MatchEventInput {
  eventType?: MatchEventType;
  minute?: number;
  period?: MatchEventPeriod;
  status?: MatchEventStatus;
  teamRosterId?: string;
  secondaryTeamRosterId?: string;
}

export function listMatchEvents(
  token: string,
  tournamentId: string,
  matchId: string,
): Promise<ManagedMatchEvent[]> {
  return request<ManagedMatchEvent[]>(
    `/tournaments/${tournamentId}/matches/${matchId}/events`,
    token,
  );
}

export function createMatchEvent(
  token: string,
  tournamentId: string,
  matchId: string,
  dto: MatchEventInput,
): Promise<ManagedMatchEvent> {
  return mutate<ManagedMatchEvent>(
    `/tournaments/${tournamentId}/matches/${matchId}/events`,
    {
      method: 'POST',
      body: dto,
      token,
    },
  );
}

export function updateMatchEvent(
  token: string,
  tournamentId: string,
  matchId: string,
  eventId: string,
  dto: MatchEventInput,
): Promise<ManagedMatchEvent> {
  return mutate<ManagedMatchEvent>(
    `/tournaments/${tournamentId}/matches/${matchId}/events/${eventId}`,
    { method: 'PATCH', body: dto, token },
  );
}

export function deleteMatchEvent(
  token: string,
  tournamentId: string,
  matchId: string,
  eventId: string,
): Promise<{ removed: boolean }> {
  return mutate<{ removed: boolean }>(
    `/tournaments/${tournamentId}/matches/${matchId}/events/${eventId}`,
    { method: 'DELETE', token },
  );
}

export type NewsStatus = 'draft' | 'published';

export interface ManageNewsPost {
  id: string;
  title: string;
  slug: string;
  status: NewsStatus;
  body?: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; displayName: string };
}

export interface NewsListResult {
  items: ManageNewsPost[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function listManageNews(
  token: string,
  tournamentId: string,
  status?: NewsStatus,
): Promise<NewsListResult> {
  const query = status ? `?status=${status}` : '';
  return request<NewsListResult>(`/tournaments/${tournamentId}/news${query}`, token);
}

export function createNews(
  token: string,
  tournamentId: string,
  dto: { title: string; body: string; status?: NewsStatus },
): Promise<ManageNewsPost> {
  return mutate<ManageNewsPost>(`/tournaments/${tournamentId}/news`, {
    method: 'POST',
    body: dto,
    token,
  });
}

export function updateNews(
  token: string,
  tournamentId: string,
  postId: string,
  dto: { title?: string; body?: string; status?: NewsStatus },
): Promise<ManageNewsPost> {
  return mutate<ManageNewsPost>(`/tournaments/${tournamentId}/news/${postId}`, {
    method: 'PATCH',
    body: dto,
    token,
  });
}

export function deleteNews(
  token: string,
  tournamentId: string,
  postId: string,
): Promise<{ removed: boolean }> {
  return mutate<{ removed: boolean }>(`/tournaments/${tournamentId}/news/${postId}`, {
    method: 'DELETE',
    token,
  });
}

export function publishNews(
  token: string,
  tournamentId: string,
  postId: string,
): Promise<ManageNewsPost> {
  return mutate<ManageNewsPost>(`/tournaments/${tournamentId}/news/${postId}/publish`, {
    method: 'POST',
    token,
  });
}

export function unpublishNews(
  token: string,
  tournamentId: string,
  postId: string,
): Promise<ManageNewsPost> {
  return mutate<ManageNewsPost>(`/tournaments/${tournamentId}/news/${postId}/unpublish`, {
    method: 'POST',
    token,
  });
}

export interface CreateTournamentInput {
  name: string;
  format: string;
  description?: string;
  location?: string;
  categoryLabel?: string;
  competitionFormat?: string;
  maxTeams?: number;
  minAge?: number;
  maxAge?: number;
  visibility?: string;
}

export interface CreatedTournament {
  id: string;
  name: string;
  slug: string;
  format: string;
  status: string;
  organization: { id: string; name: string; slug: string };
}

export function createTournament(
  token: string,
  dto: CreateTournamentInput,
): Promise<CreatedTournament> {
  return mutate<CreatedTournament>('/tournaments', { method: 'POST', body: dto, token });
}

export interface TournamentInvitation {
  id: string;
  label: string | null;
  status: string;
  maxUses: number | null;
  usedCount: number;
  entriesCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreatedInvitation extends TournamentInvitation {
  slug: string;
  token: string;
  joinUrl: string;
  qrDataUrl: string;
}

export interface InvitationEntry {
  id: string;
  registrationStatus: string;
  registeredAt: string;
  team: { id: string; name: string; logoUrl: string | null };
}

export interface ResolvedInvitation {
  valid: boolean;
  reason?: 'not_found' | 'revoked' | 'exhausted' | 'expired';
  label?: string | null;
  remainingUses?: number | null;
  expiresAt?: string | null;
  tournament?: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    format: string;
    location: string | null;
    startDate: string | null;
    maxTeams: number | null;
  };
}

export function listInvitations(token: string, tournamentId: string): Promise<TournamentInvitation[]> {
  return request<TournamentInvitation[]>(`/tournaments/${tournamentId}/invitations`, token);
}

export function createInvitation(
  token: string,
  tournamentId: string,
  dto: { label?: string; maxUses?: number; expiresInDays?: number },
): Promise<CreatedInvitation> {
  return mutate<CreatedInvitation>(`/tournaments/${tournamentId}/invitations`, {
    method: 'POST',
    body: dto,
    token,
  });
}

export function revokeInvitation(
  token: string,
  tournamentId: string,
  invitationId: string,
): Promise<TournamentInvitation> {
  return mutate<TournamentInvitation>(
    `/tournaments/${tournamentId}/invitations/${invitationId}/revoke`,
    { method: 'POST', token },
  );
}

export function regenerateInvitation(
  token: string,
  tournamentId: string,
  invitationId: string,
): Promise<CreatedInvitation> {
  return mutate<CreatedInvitation>(
    `/tournaments/${tournamentId}/invitations/${invitationId}/regenerate`,
    { method: 'POST', token },
  );
}

export function listInvitationEntries(
  token: string,
  tournamentId: string,
  invitationId: string,
): Promise<InvitationEntry[]> {
  return request<InvitationEntry[]>(
    `/tournaments/${tournamentId}/invitations/${invitationId}/entries`,
    token,
  );
}

export function resolveInvitation(token: string): Promise<ResolvedInvitation> {
  return request<ResolvedInvitation>(`/invitations/${token}`);
}

export interface MyTeamSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  _count: { entries: number };
}

export async function listMyTeams(token: string): Promise<MyTeamSummary[]> {
  const data = await request<{ items: MyTeamSummary[] }>('/teams/me?pageSize=50', token);
  return data.items;
}

export interface AppliedEntry {
  id: string;
  registrationStatus: string;
  team: { id: string; name: string; slug: string; logoUrl: string | null };
}

export interface ApplyPlayerConsent {
  guardianName: string;
  guardianRelation?: string;
  guardianDocument?: string;
}

export interface ApplyPlayerInput {
  playerId: string;
  jerseyNumber?: number | null;
  position?: string | null;
  consent?: ApplyPlayerConsent;
}

export function applyEntry(
  token: string,
  tournamentId: string,
  dto: {
    teamId: string;
    invitationToken?: string;
    representativeName?: string;
    representativePhone?: string;
    representativeEmail?: string;
    players?: ApplyPlayerInput[];
  },
): Promise<AppliedEntry> {
  return mutate<AppliedEntry>(`/tournaments/${tournamentId}/entries`, {
    method: 'POST',
    body: dto,
    token,
  });
}

export interface PlayerPhoto {
  id: string;
  playerId: string;
  isPrimary: boolean;
  width: number;
  height: number;
  sizeBytes: number;
  url: string;
  thumbUrl: string;
  createdAt: string;
}

export function listPlayerPhotos(token: string, playerId: string): Promise<PlayerPhoto[]> {
  return request<PlayerPhoto[]>(`/players/${playerId}/photos`, token);
}

export async function uploadPlayerPhoto(
  token: string,
  playerId: string,
  file: File,
): Promise<PlayerPhoto> {
  const formData = new FormData();
  formData.append('file', file);
  return upload<PlayerPhoto>(`/players/${playerId}/photos`, token, formData);
}

export function setPrimaryPlayerPhoto(
  token: string,
  playerId: string,
  photoId: string,
): Promise<PlayerPhoto> {
  return mutate<PlayerPhoto>(`/players/${playerId}/photos/${photoId}/primary`, {
    method: 'POST',
    token,
  });
}

export function deletePlayerPhoto(
  token: string,
  playerId: string,
  photoId: string,
): Promise<{ removed: boolean }> {
  return mutate<{ removed: boolean }>(`/players/${playerId}/photos/${photoId}`, {
    method: 'DELETE',
    token,
  });
}
