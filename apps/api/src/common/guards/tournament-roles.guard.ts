import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipStatus, TournamentRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../decorators/current-user.decorator';
import { TOURNAMENT_ROLES_KEY } from '../decorators/tournament-roles.decorator';

@Injectable()
export class TournamentRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<TournamentRole[]>(
      TOURNAMENT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    const tournamentId: string | undefined =
      request.params.tournamentId ?? request.params.id;

    if (!user || !tournamentId) {
      throw new ForbiddenException('Acceso denegado.');
    }

    const membership = await this.prisma.tournamentMember.findUnique({
      where: {
        tournamentId_userId: { tournamentId, userId: user.userId },
      },
    });

    if (!membership || membership.status !== MembershipStatus.active) {
      throw new ForbiddenException('Acceso denegado.');
    }
    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Permisos insuficientes para este torneo.');
    }

    request.tournamentMembership = membership;
    return true;
  }
}