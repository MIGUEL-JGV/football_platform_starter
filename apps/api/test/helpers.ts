import type { AuthUser } from '../src/common/decorators/current-user.decorator';

export const ME: AuthUser = { userId: 'u-1', email: 'owner@club.test', status: 'active' };
export const OTHER: AuthUser = { userId: 'u-2', email: 'other@club.test', status: 'active' };

export const ORG_ID = 'org-1';
export const TOURNAMENT_ID = 't-1';

export interface TournamentStub {
  id: string;
  organizationId: string;
  visibility: string;
  maxTeams?: number | null;
  [key: string]: unknown;
}

export const tournamentStub = (overrides: Partial<TournamentStub> = {}): TournamentStub => ({
  id: TOURNAMENT_ID,
  organizationId: ORG_ID,
  visibility: 'public',
  maxTeams: null,
  ...overrides,
});

export const memberActive = (role: string) => ({ status: 'active', role });