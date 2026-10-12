import {
  BadRequestException,
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
import { InvitationsService } from './invitations.service';

const CONSENT_SCOPE = 'registration';
const ADULT_AGE = 18;

function isMinor(dateOfBirth: Date, today = new Date()): boolean {
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age < ADULT_AGE;
}

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitations: InvitationsService,
  ) {}

  async apply(tournamentId: string, user: AuthUser, dto: ApplyEntryDto) {
    const tournament = await this.requireTournament(tournamentId);
    const invitation = dto.invitationToken
      ? await this.invitations.requireUsable(dto.invitationToken, tournamentId)
      : null;
    if (!invitation && tournament.visibility !== TournamentVisibility.public) {
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

    const pendingRoster = dto.players && dto.players.length > 0 ? await this.validateRoster(team, dto) : [];

    const entry = await this.prisma.$transaction(async (tx) => {
      const created = existing
        ? await tx.tournamentTeam.update({
            where: { tournamentId_teamId: { tournamentId, teamId: team.id } },
            data: {
              registrationStatus: 'pending',
              approvedAt: null,
              approvedBy: null,
              registeredAt: new Date(),
              submittedAt: new Date(),
              reviewNote: null,
              reviewedAt: null,
              reviewedBy: null,
              representativeName: dto.representativeName,
              representativeEmail: dto.representativeEmail,
              representativePhone: dto.representativePhone,
              ...(invitation && { invitationId: invitation.id }),
            },
            include: this.entryInclude(),
          })
        : await tx.tournamentTeam.create({
            data: {
              tournamentId,
              teamId: team.id,
              registrationStatus: 'pending',
              requestedBy: user.userId,
              submittedAt: new Date(),
              representativeName: dto.representativeName,
              representativeEmail: dto.representativeEmail,
              representativePhone: dto.representativePhone,
              ...(invitation && { invitationId: invitation.id }),
            },
            include: this.entryInclude(),
          });
      if (pendingRoster.length > 0) {
        await tx.teamRoster.deleteMany({ where: { tournamentTeamId: created.id } });
        await tx.consentRecord.deleteMany({
          where: { tournamentTeamId: created.id },
        });
        const rosterData = pendingRoster.map((item) => ({
          tournamentTeamId: created.id,
          playerId: item.playerId,
          jerseyNumber: item.jerseyNumber,
          position: item.position,
        }));
        await tx.teamRoster.createMany({ data: rosterData });
        const minorConsents = pendingRoster
          .filter((item) => item.isMinor)
          .map((item) => ({
            tournamentTeamId: created.id,
            playerId: item.playerId,
            scope: CONSENT_SCOPE,
            granted: true,
            guardianName: item.consent!.guardianName,
            guardianRelation: item.consent!.guardianRelation,
            guardianDocument: item.consent!.guardianDocument,
            effectiveAt: new Date(),
          }));
        if (minorConsents.length > 0) {
          await tx.consentRecord.createMany({ data: minorConsents });
        }
      }
      return created;
    });

    if (invitation) {
      await this.invitations.consume(invitation.id);
    }
    return this.prisma.tournamentTeam.findUnique({
      where: { id: entry.id },
      include: this.entryInclude(),
    });
  }

  private async validateRoster(team: { id: string; createdBy: string }, dto: ApplyEntryDto) {
    const clubPlayerIds = new Set(
      (
        await this.prisma.player.findMany({
          where: { createdBy: team.createdBy, id: { in: dto.players!.map((p) => p.playerId) } },
          select: { id: true },
        })
      ).map((player) => player.id),
    );
    const players = await this.prisma.player.findMany({
      where: { id: { in: dto.players!.map((p) => p.playerId) } },
      select: { id: true, displayName: true, dateOfBirth: true },
    });
    if (players.length !== dto.players!.length || dto.players!.some((p) => !clubPlayerIds.has(p.playerId))) {
      throw new BadRequestException('Todos los jugadores deben pertenecer al club del equipo.');
    }
    const seenNumbers = new Set<number>();
    const seenPlayers = new Set<string>();
    const norm = [];
    for (const submitted of dto.players!) {
      if (seenPlayers.has(submitted.playerId)) {
        throw new ConflictException('Un jugador no se puede repetir en la plantilla.');
      }
      seenPlayers.add(submitted.playerId);
      if (submitted.jerseyNumber != null) {
        if (seenNumbers.has(submitted.jerseyNumber)) {
          throw new ConflictException('No se puede repetir el número de dorsal.');
        }
        seenNumbers.add(submitted.jerseyNumber);
      }
      const player = players.find((p) => p.id === submitted.playerId)!;
      const minor = player.dateOfBirth ? isMinor(player.dateOfBirth) : false;
      if (minor && !submitted.consent?.guardianName) {
        throw new BadRequestException(
          `${player.displayName} es menor de edad: se requiere el consentimiento del tutor.`,
        );
      }
      norm.push({
        playerId: player.id,
        jerseyNumber: submitted.jerseyNumber,
        position: submitted.position,
        isMinor: minor,
        consent: submitted.consent,
      });
    }
    return norm;
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

  async getEntryDetail(tournamentId: string, entryId: string, user: AuthUser) {
    const tournament = await this.requireTournament(tournamentId);
    const canManage = await this.canManage(tournament.id, tournament.organizationId, user);
    const entry = await this.requireEntry(entryId, tournamentId);
    if (!canManage && entry.requestedBy !== user.userId) {
      throw new ForbiddenException('Acceso denegado.');
    }
    return this.prisma.tournamentTeam.findUnique({
      where: { id: entry.id },
      include: {
        team: { select: { id: true, name: true, slug: true, logoUrl: true } },
        requester: { select: { id: true, displayName: true } },
        invitation: { select: { id: true, label: true } },
        _count: { select: { roster: true, consents: true, documents: true } },
      },
    });
  }

  async approve(tournamentId: string, entryId: string, user: AuthUser) {
    const tournament = await this.requireManager(tournamentId, user);
    const entry = await this.requireEntry(entryId, tournamentId);
    if (entry.registrationStatus !== 'pending') {
      throw new ConflictException('Solo se pueden aprobar inscripciones pendientes.');
    }
    if (tournament.maxTeams != null) {
      const approved = await this.prisma.tournamentTeam.count({
        where: { tournamentId, registrationStatus: 'approved' },
      });
      if (approved >= tournament.maxTeams) {
        throw new ConflictException(
          `El torneo alcanzó el cupo máximo de ${tournament.maxTeams} equipos.`,
        );
      }
    }
    return this.prisma.tournamentTeam.update({
      where: { id: entry.id },
      data: {
        registrationStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: user.userId,
        reviewNote: null,
        reviewedAt: new Date(),
        reviewedBy: user.userId,
      },
      include: this.entryInclude(),
    });
  }

  async reject(tournamentId: string, entryId: string, user: AuthUser, reason?: string) {
    await this.requireManager(tournamentId, user);
    const entry = await this.requireEntry(entryId, tournamentId);
    if (entry.registrationStatus !== 'pending') {
      throw new ConflictException('Solo se pueden rechazar inscripciones pendientes.');
    }
    return this.prisma.tournamentTeam.update({
      where: { id: entry.id },
      data: {
        registrationStatus: 'rejected',
        reviewNote: reason ?? null,
        reviewedAt: new Date(),
        reviewedBy: user.userId,
      },
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
    const rosters = await this.prisma.teamRoster.findMany({
      where: { tournamentTeamId: entryId },
      include: { player: { select: this.rosterPlayerSelect } },
      orderBy: [{ jerseyNumber: 'asc' }, { player: { displayName: 'asc' } }],
    });
    const [consents, minors] = await Promise.all([
      this.prisma.consentRecord.findMany({
        where: { tournamentTeamId: entryId },
        select: { playerId: true, granted: true, guardianName: true, guardianRelation: true, scope: true },
      }),
      this.minorsOf(rosters.map((r) => r.playerId)),
    ]);
    const consentByPlayer = new Map(consents.map((c) => [c.playerId, c]));
    return rosters.map((row) => ({
      ...row,
      isMinor: minors.get(row.playerId) ?? false,
      consents: consentByPlayer.get(row.playerId) ? [consentByPlayer.get(row.playerId)!] : [],
    }));
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

  private async minorsOf(playerIds: string[]): Promise<Map<string, boolean>> {
    if (playerIds.length === 0) {
      return new Map();
    }
    const players = await this.prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, dateOfBirth: true },
    });
    return new Map(
      players.map((player) => [player.id, player.dateOfBirth ? isMinor(player.dateOfBirth) : false]),
    );
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
    const team = await this.prisma.team.findUnique({
      where: { id: entry.teamId },
      select: { createdBy: true },
    });
    if (team?.createdBy === user.userId) {
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
    return tournament;
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