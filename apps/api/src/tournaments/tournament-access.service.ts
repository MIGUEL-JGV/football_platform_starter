import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  MembershipStatus,
  OrganizationRole,
  Tournament,
  TournamentRole,
  TournamentVisibility,
} from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from './../prisma/prisma.service';

@Injectable()
export class TournamentAccessService {
  constructor(private readonly prisma: PrismaService) {}

  canManage(tournamentId: string, organizationId: string, user: AuthUser): Promise<boolean> {
    return this.hasAnyRole(tournamentId, organizationId, user, [
      { role: TournamentRole.manager, tourney: true },
      { role: OrganizationRole.owner, tourney: false },
      { role: OrganizationRole.admin, tourney: false },
    ]);
  }

  canView(tournamentId: string, organizationId: string, user: AuthUser): Promise<boolean> {
    return this.hasAnyRole(tournamentId, organizationId, user, [
      { role: TournamentRole.manager, tourney: true },
      { role: TournamentRole.scorekeeper, tourney: true },
      { role: TournamentRole.viewer, tourney: true },
      { role: OrganizationRole.owner, tourney: false },
      { role: OrganizationRole.admin, tourney: false },
      { role: OrganizationRole.editor, tourney: false },
    ]);
  }

  async canRecord(tournamentId: string, organizationId: string, user: AuthUser): Promise<boolean> {
    if (await this.canManage(tournamentId, organizationId, user)) {
      return true;
    }
    const member = await this.prisma.tournamentMember.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: user.userId } },
    });
    return member?.status === MembershipStatus.active && member.role === TournamentRole.scorekeeper;
  }

  async requireManager(tournamentId: string, user: AuthUser): Promise<Tournament> {
    const tournament = await this.requireTournament(tournamentId);
    const canManage = await this.canManage(tournament.id, tournament.organizationId, user);
    if (!canManage) {
      throw new ForbiddenException('Permisos insuficientes para este torneo.');
    }
    return tournament;
  }

  async requireView(tournamentId: string, user: AuthUser): Promise<Tournament> {
    const tournament = await this.requireTournament(tournamentId);
    const canView = await this.canView(tournament.id, tournament.organizationId, user);
    if (!canView) {
      throw new NotFoundException('Torneo no encontrado.');
    }
    return tournament;
  }

  async requireViewable(tournamentId: string, user: AuthUser | null): Promise<Tournament> {
    const tournament = await this.requireTournament(tournamentId);
    if (tournament.visibility === TournamentVisibility.public) {
      return tournament;
    }
    if (user && (await this.canView(tournament.id, tournament.organizationId, user))) {
      return tournament;
    }
    throw new NotFoundException('Torneo no encontrado.');
  }

  async requireOrgOwnerAdmin(organizationId: string, user: AuthUser): Promise<void> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: user.userId } },
    });
    const roles: OrganizationRole[] = [OrganizationRole.owner, OrganizationRole.admin];
    if (!membership || membership.status !== MembershipStatus.active || !roles.includes(membership.role)) {
      throw new ForbiddenException('Acceso denegado.');
    }
  }

  async requireTournament(tournamentId: string): Promise<Tournament> {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado.');
    }
    return tournament;
  }

  private async hasAnyRole(
    tournamentId: string,
    organizationId: string,
    user: AuthUser,
    required: Array<{ role: string; tourney: boolean }>,
  ): Promise<boolean> {
    const [tournamentMember, orgMember] = await Promise.all([
      this.prisma.tournamentMember.findUnique({
        where: { tournamentId_userId: { tournamentId, userId: user.userId } },
      }),
      this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: user.userId } },
      }),
    ]);
    const tourneyOk =
      tournamentMember?.status === MembershipStatus.active &&
      required.some((r) => r.tourney && r.role === tournamentMember.role);
    const orgOk =
      orgMember?.status === MembershipStatus.active &&
      required.some((r) => !r.tourney && r.role === orgMember.role);
    return tourneyOk || orgOk;
  }
}