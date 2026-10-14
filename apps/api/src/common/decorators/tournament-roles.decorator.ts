import { SetMetadata } from '@nestjs/common';
import { TournamentRole } from '@prisma/client';

export const TOURNAMENT_ROLES_KEY = 'tournamentRoles';

export const TournamentRoles = (...roles: TournamentRole[]) =>
  SetMetadata(TOURNAMENT_ROLES_KEY, roles);