import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MembershipStatus,
  OrganizationRole,
  Tournament,
  TournamentRole,
  TournamentTeam,
  TournamentVisibility,
} from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyEntryDto } from './dto/tournament-entry.dto';
import { AddRosterPlayerDto, UpdateRosterPlayerDto } from './dto/tournament-roster.dto';

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(tournamentId: string, user: AuthUser, dto: ApplyEntryDto) {
    const tournament = await this.requireTournament(tournamentId);
    if (tournament.visibility !== TournamentVisibility.public) {
      throw new ForbiddenException('Solo se aceptan inscripciones en torneos públicos.');
    }
    const team = await this.prisma.team.findUnique({ where: { id: dto.teamId } });
    if (!team) {
      throw new NotFoundException('Equipo no encontrado.');
    }
    if (team.createdBy !== user.userId) {
      throw new ForbiddenException('Solo puedes inscribir equipos propios.');
    }
    const existing = await this.prisma.tournamentTeam.findUnique({
      where: { tournamentId_teamId: { tournamentId, teamId: team.id } },
    });
    if (existing && existing.registrationStatus !== 'rejected') {
      throw new ConflictException('El equipo ya está inscrito en este torneo.');
    }
    if (existing) {
      return this.prisma.tournamentTeam.update({
        where: { tournamentId_teamId: { tournamentId, teamId: team.id } },
        data: {
          registrationStatus: 'pending',
          approvedAt: null,
          approvedBy: null,
          registeredAt: new Date(),
        },
        include: this.entryInclude(),
      });
    }
    return this.prisma.tournamentTeam.create({
      data: {
        tournamentId,
        teamId: team.id,
        registrationStatus: 'pending',
        requestedBy: user.userId,
      },
      include: this.entryInclude(),
    });
  }

  async listEntries(tournamentId: string, user: AuthUser) {
    const tournament = await this.requireTournament(tournamentId);
    const canManage = await this.canManage(tournament.id, tournament.organizationId, user);
    const where =
      canManage
        ? { tournamentId }
        : { tournamentId, requestedBy: user.userId };
    return this.prisma.tournamentTeam.findMany({
      where,
      include: this.entryInclude(),
      orderBy: { registeredAt: 'desc' },
    });
  }

  async approve(tournamentId: string, entryId: string, user: AuthUser) {
    await this.requireManager(tournamentId, user);
    const entry = await this.requireEntry(entryId, tournamentId);
    if (entry.registrationStatus !== 'pending') {
      throw new ConflictException('Solo se pueden aprobar inscripciones pendientes.');
    }
    return this.prisma.tournamentTeam.update({
      where: { id: entry.id },
      data: { registrationStatus: 'approved', approvedAt: new Date(), approvedBy: user.userId },
      include: this.entryInclude(),
    });
  }

  async reject(tournamentId: string, entryId: string, user: AuthUser) {
    await this.requireManager(tournamentId, user);
    const entry = await this.requireEntry(entryId, tournamentId);
    if (entry.registrationStatus !== 'pending') {
      throw new ConflictException('Solo se pueden rechazar inscripciones pendientes.');
    }
    return this.prisma.tournamentTeam.update({
      where: { id: entry.id },
      data: { registrationStatus: 'rejected' },
      include: this.entryInclude(),
    });
  }

  async withdraw(tournamentId: string, entryId: string, user: AuthUser) {
    const tournament = await this.requireTournament(tournamentId);
    const entry = await this.requireEntry(entryId, tournamentId);
    const canManage = await this.canManage(tournament.id, tournament.organizationId, user);
    if (entry.requestedBy !== user.userId && !canManage) {
      throw new ForbiddenException('Acceso denegado.');
    }
    if (entry.registrationStatus !== 'pending') {
      throw new ConflictException('Solo se pueden retirar inscripciones pendientes.');
    }
    await this.prisma.tournamentTeam.delete({ where: { id: entry.id } });
    return { removed: true };
  }

  private entryInclude() {
    return {
      team: { select: { id: true, name: true, slug: true, logoUrl: true } },
      requester: { select: { id: true, displayName: true } },
      _count: { select: { roster: true } },
    } as const;
  }

  private readonly rosterPlayerSelect = {
    id: true,
    displayName: true,
    dateOfBirth: true,
    photoUrl: true,
    preferredPosition: true,
  } as const;

  async listRoster(tournamentId: string, entryId: string, user: AuthUser) {
    const { tournament, entry } = await this.requireEntryContext(tournamentId, entryId);
    await this.assertRosterAccess(tournament, entry, user);
    return this.prisma.teamRoster.findMany({
      where: { tournamentTeamId: entryId },
      include: { player: { select: this.rosterPlayerSelect } },
      orderBy: [{ jerseyNumber: 'asc' }, { player: { displayName: 'asc' } }],
    });
  }

  async addRosterPlayer(
    tournamentId: string,
    entryId: string,
    user: AuthUser,
    dto: AddRosterPlayerDto,
  ) {
    const { tournament, entry } = await this.requireEntryContext(tournamentId, entryId);
    await this.assertRosterAccess(tournament, entry, user);
    if (entry.registrationStatus !== 'approved') {
      throw new ConflictException('Solo se puede registrar convocatoria de inscripciones aprobadas.');
    }
    const team = await this.prisma.team.findUnique({ where: { id: entry.teamId } });
    const player = await this.prisma.player.findUnique({ where: { id: dto.playerId } });
    if (!player) {
      throw new NotFoundException('Jugador no encontrado.');
    }
    if (!team || player.createdBy !== team.createdBy) {
      throw new ForbiddenException('El jugador no pertenece al club del equipo.');
    }
    const existing = await this.prisma.teamRoster.findUnique({
      where: { tournamentTeamId_playerId: { tournamentTeamId: entryId, playerId: player.id } },
    });
    if (existing) {
      throw new ConflictException('El jugador ya forma parte de la convocatoria.');
    }
    return this.prisma.teamRoster.create({
      data: {
        tournamentTeamId: entryId,
        playerId: player.id,
        jerseyNumber: dto.jerseyNumber,
        position: dto.position,
      },
      include: { player: { select: this.rosterPlayerSelect } },
    });
  }

  async updateRosterPlayer(
    tournamentId: string,
    entryId: string,
    rosterId: string,
    user: AuthUser,
    dto: UpdateRosterPlayerDto,
  ) {
    const { tournament, entry } = await this.requireEntryContext(tournamentId, entryId);
    await this.assertRosterAccess(tournament, entry, user);
    const roster = await this.requireRoster(entryId, rosterId);
    return this.prisma.teamRoster.update({
      where: { id: roster.id },
      data: {
        ...(dto.jerseyNumber !== undefined && { jerseyNumber: dto.jerseyNumber }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: { player: { select: this.rosterPlayerSelect } },
    });
  }

  async removeRosterPlayer(
    tournamentId: string,
    entryId: string,
    rosterId: string,
    user: AuthUser,
  ) {
    const { tournament, entry } = await this.requireEntryContext(tournamentId, entryId);
    await this.assertRosterAccess(tournament, entry, user);
    const roster = await this.requireRoster(entryId, rosterId);
    await this.prisma.teamRoster.delete({ where: { id: roster.id } });
    return { removed: true };
  }

  private async requireEntryContext(tournamentId: string, entryId: string) {
    const tournament = await this.requireTournament(tournamentId);
    const entry = await this.requireEntry(entryId, tournamentId);
    return { tournament, entry };
  }

  private async assertRosterAccess(
    tournament: Tournament,
    entry: TournamentTeam,
    user: AuthUser,
  ): Promise<void> {
    const canManage = await this.canManage(tournament.id, tournament.organizationId, user);
    if (canManage || entry.requestedBy === user.userId) {
      return;
    }
    throw new ForbiddenException('Acceso denegado.');
  }

  private async requireRoster(entryId: string, rosterId: string) {
    const roster = await this.prisma.teamRoster.findFirst({
      where: { id: rosterId, tournamentTeamId: entryId },
    });
    if (!roster) {
      throw new NotFoundException('Integrante de convocatoria no encontrado.');
    }
    return roster;
  }

  private async requireManager(tournamentId: string, user: AuthUser) {
    const tournament = await this.requireTournament(tournamentId);
    const canManage = await this.canManage(tournament.id, tournament.organizationId, user);
    if (!canManage) {
      throw new ForbiddenException('Permisos insuficientes para este torneo.');
    }
  }

  private async requireTournament(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado.');
    }
    return tournament;
  }

  private async requireEntry(entryId: string, tournamentId: string) {
    const entry = await this.prisma.tournamentTeam.findFirst({
      where: { id: entryId, tournamentId },
    });
    if (!entry) {
      throw new NotFoundException('Inscripción no encontrada.');
    }
    return entry;
  }

  private async canManage(
    tournamentId: string,
    organizationId: string,
    user: AuthUser,
  ): Promise<boolean> {
    const [tournamentMember, orgMember] = await Promise.all([
      this.prisma.tournamentMember.findUnique({
        where: { tournamentId_userId: { tournamentId, userId: user.userId } },
      }),
      this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: user.userId } },
      }),
    ]);
    if (
      tournamentMember?.status === MembershipStatus.active &&
      tournamentMember.role === TournamentRole.manager
    ) {
      return true;
    }
    const orgRoles: OrganizationRole[] = [OrganizationRole.owner, OrganizationRole.admin];
    return orgMember?.status === MembershipStatus.active && orgRoles.includes(orgMember.role);
  }
}