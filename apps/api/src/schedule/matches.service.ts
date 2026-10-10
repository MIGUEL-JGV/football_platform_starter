import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TournamentVisibility } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TournamentAccessService } from '../tournaments/tournament-access.service';
import { VenuesService } from '../venues/venues.service';
import { CreateMatchDto, ListMatchesQueryDto, UpdateMatchDto } from './dto/match.dto';

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TournamentAccessService,
    private readonly venues: VenuesService,
  ) {}

  async create(tournamentId: string, user: AuthUser, dto: CreateMatchDto) {
    const tournament = await this.access.requireManager(tournamentId, user);
    const phase = await this.requirePhase(tournamentId, dto.phaseId);
    if (dto.matchdayId) {
      await this.requireMatchday(phase.id, dto.matchdayId);
    }
    if (dto.groupId) {
      await this.requireGroup(phase.id, dto.groupId);
    }
    const home = await this.requireApprovedEntry(tournamentId, dto.homeTournamentTeamId);
    const away = await this.requireApprovedEntry(tournamentId, dto.awayTournamentTeamId);
    if (home.id === away.id) {
      throw new ConflictException('Los equipos de un partido no pueden ser el mismo.');
    }
    if (dto.venueId) {
      await this.venues.requireVenueForOrg(tournament.organizationId, dto.venueId);
    }
    return this.prisma.match.create({
      data: {
        tournamentId,
        phaseId: phase.id,
        matchdayId: dto.matchdayId,
        groupId: dto.groupId,
        homeTournamentTeamId: home.id,
        awayTournamentTeamId: away.id,
        venueId: dto.venueId,
        scheduledAt: this.toDateOrUndefined(dto.scheduledAt),
        status: dto.status ?? 'scheduled',
      },
      include: this.matchInclude(),
    });
  }

  async list(tournamentId: string, user: AuthUser | null, query: ListMatchesQueryDto) {
    const tournament = await this.access.requireTournament(tournamentId);
    await this.assertViewable(tournament, user);
    return this.prisma.match.findMany({
      where: {
        tournamentId,
        ...(query.phaseId !== undefined && { phaseId: query.phaseId }),
        ...(query.matchdayId !== undefined && { matchdayId: query.matchdayId }),
        ...(query.status !== undefined && { status: query.status }),
      },
      include: this.matchInclude(),
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getById(tournamentId: string, matchId: string, user: AuthUser | null) {
    const tournament = await this.access.requireTournament(tournamentId);
    await this.assertViewable(tournament, user);
    return this.requireMatch(tournamentId, matchId);
  }

  async update(tournamentId: string, matchId: string, user: AuthUser, dto: UpdateMatchDto) {
    const tournament = await this.access.requireManager(tournamentId, user);
    const match = await this.requireMatch(tournamentId, matchId);
    const phase = dto.phaseId ? await this.requirePhase(tournamentId, dto.phaseId) : null;
    const matchdayId =
      dto.matchdayId !== undefined
        ? await this.resolveOptionalMatchday(phase ?? match, dto.matchdayId)
        : undefined;
    const groupId =
      dto.groupId !== undefined
        ? await this.resolveOptionalGroup(phase ?? match, dto.groupId)
        : undefined;
    if (dto.homeTournamentTeamId || dto.awayTournamentTeamId) {
      const homeId = dto.homeTournamentTeamId ?? match.homeTournamentTeamId;
      const awayId = dto.awayTournamentTeamId ?? match.awayTournamentTeamId;
      if (homeId === awayId) {
        throw new ConflictException('Los equipos de un partido no pueden ser el mismo.');
      }
    }
    const home = dto.homeTournamentTeamId
      ? await this.requireApprovedEntry(tournamentId, dto.homeTournamentTeamId)
      : undefined;
    const away = dto.awayTournamentTeamId
      ? await this.requireApprovedEntry(tournamentId, dto.awayTournamentTeamId)
      : undefined;
    if (dto.venueId) {
      await this.venues.requireVenueForOrg(tournament.organizationId, dto.venueId);
    }
    return this.prisma.match.update({
      where: { id: match.id },
      data: {
        ...(phase !== null && { phaseId: phase.id }),
        ...(matchdayId !== undefined && { matchdayId }),
        ...(groupId !== undefined && { groupId }),
        ...(home !== undefined && { homeTournamentTeamId: home.id }),
        ...(away !== undefined && { awayTournamentTeamId: away.id }),
        ...(dto.venueId !== undefined && { venueId: dto.venueId }),
        ...(dto.scheduledAt !== undefined && { scheduledAt: this.toDateOrUndefined(dto.scheduledAt) }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: this.matchInclude(),
    });
  }

  async remove(tournamentId: string, matchId: string, user: AuthUser) {
    const tournament = await this.access.requireManager(tournamentId, user);
    const match = await this.requireMatch(tournamentId, matchId);
    await this.access.requireOrgOwnerAdmin(tournament.organizationId, user);
    const events = await this.prisma.matchEvent.count({ where: { matchId } });
    if (events > 0) {
      throw new ConflictException('El partido tiene eventos registrados y no puede eliminarse.');
    }
    await this.prisma.match.delete({ where: { id: match.id } });
    return { removed: true };
  }

  private matchInclude() {
    return {
      phase: { select: { id: true, name: true, phaseType: true, sequence: true } },
      matchday: { select: { id: true, name: true, sequence: true } },
      group: { select: { id: true, name: true } },
      venue: { select: { id: true, name: true, address: true, timezone: true } },
      homeTeam: {
        include: { team: { select: { id: true, name: true, slug: true, logoUrl: true } } },
      },
      awayTeam: {
        include: { team: { select: { id: true, name: true, slug: true, logoUrl: true } } },
      },
      _count: { select: { events: true } },
    } as const;
  }

  private async assertViewable(tournament: { id: string; organizationId: string; visibility: TournamentVisibility }, user: AuthUser | null) {
    if (tournament.visibility === TournamentVisibility.public) {
      return;
    }
    if (!user) {
      throw new NotFoundException('Torneo no encontrado.');
    }
    const canView = await this.access.canView(tournament.id, tournament.organizationId, user);
    if (!canView) {
      throw new NotFoundException('Torneo no encontrado.');
    }
  }

  private async requireMatch(tournamentId: string, matchId: string) {
    const match = await this.prisma.match.findFirst({
      where: { id: matchId, tournamentId },
      include: this.matchInclude(),
    });
    if (!match) {
      throw new NotFoundException('Partido no encontrado.');
    }
    return match;
  }

  private async requirePhase(tournamentId: string, phaseId: string) {
    const phase = await this.prisma.phase.findFirst({
      where: { id: phaseId, tournamentId },
    });
    if (!phase) {
      throw new NotFoundException('Fase no encontrada.');
    }
    return phase;
  }

  private async requireMatchday(phaseId: string, matchdayId: string) {
    const matchday = await this.prisma.matchday.findFirst({
      where: { id: matchdayId, phaseId },
    });
    if (!matchday) {
      throw new NotFoundException('Jornada no encontrada.');
    }
    return matchday;
  }

  private async requireGroup(phaseId: string, groupId: string) {
    const group = await this.prisma.competitionGroup.findFirst({
      where: { id: groupId, phaseId },
    });
    if (!group) {
      throw new NotFoundException('Grupo no encontrado.');
    }
    return group;
  }

  private async resolveOptionalMatchday(
    phase: { id: string },
    matchdayId: string | undefined,
  ): Promise<string | null> {
    if (!matchdayId) {
      return null;
    }
    await this.requireMatchday(phase.id, matchdayId);
    return matchdayId;
  }

  private async resolveOptionalGroup(
    phase: { id: string },
    groupId: string | undefined,
  ): Promise<string | null> {
    if (!groupId) {
      return null;
    }
    await this.requireGroup(phase.id, groupId);
    return groupId;
  }

  private async requireApprovedEntry(tournamentId: string, entryId: string) {
    const entry = await this.prisma.tournamentTeam.findFirst({
      where: { id: entryId, tournamentId, registrationStatus: 'approved' },
    });
    if (!entry) {
      throw new NotFoundException('Inscripción aprobada no encontrada.');
    }
    return entry;
  }

  private toDateOrUndefined(value: string | undefined): Date | undefined {
    return value === undefined ? undefined : new Date(value);
  }
}