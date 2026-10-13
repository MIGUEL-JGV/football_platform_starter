import { TournamentStatus } from '@prisma/client';

const LOCKED_STATUSES: ReadonlySet<TournamentStatus> = new Set([
  TournamentStatus.in_progress,
  TournamentStatus.completed,
  TournamentStatus.cancelled,
]);

export function isTournamentLocked(status: TournamentStatus): boolean {
  return LOCKED_STATUSES.has(status);
}
