import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TournamentAccessService } from '../tournaments/tournament-access.service';
import {
  CreateMatchdayDto,
  CreatePhaseDto,
  UpdateMatchdayDto,
  UpdatePhaseDto,
} from './dto/phase.dto';

@Injectable()
export class PhasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TournamentAccessService,
  ) {}

  async create(tournamentId: string, user: AuthUser, dto: CreatePhaseDto) {
    await this.access.requireManager(tournamentId, user);
    const sequence = await this.nextSequence(tournamentId);
    return this.prisma.phase.create({
      data: {
        tournamentId,
        name: dto.name,
        phaseType: dto.phaseType,
        sequence,
        status: dto.status ?? 'pending',
        startDate: this.toDateOrUndefined(dto.startDate),
        endDate: this.toDateOrUndefined(dto.endDate),
        rulesOverride: dto.rulesOverride !== undefined
          ? (dto.rulesOverride as Prisma.InputJsonValue)
          : undefined,
      },
      include: this.phaseInclude(),
    });
  }

  async list(tournamentId: string, user: AuthUser) {
    await this.access.requireManager(tournamentId, user);
    return this.prisma.phase.findMany({
      where: { tournamentId },
      orderBy: { sequence: 'asc' },
      include: this.phaseInclude(),
    });
  }

  async getById(tournamentId: string, phaseId: string, user: AuthUser) {
    await this.access.requireManager(tournamentId, user);
    return this.requirePhase(tournamentId, phaseId);
  }

  async update(tournamentId: string, phaseId: string, user: AuthUser, dto: UpdatePhaseDto) {
    await this.access.requireManager(tournamentId, user);
    const phase = await this.requirePhase(tournamentId, phaseId);
    if (dto.sequence !== undefined && dto.sequence !== phase.sequence) {
      await this.assertSequenceAvailable(tournamentId, dto.sequence, phaseId);
    }
    return this.prisma.phase.update({
      where: { id: phase.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phaseType !== undefined && { phaseType: dto.phaseType }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.sequence !== undefined && { sequence: dto.sequence }),
        ...(dto.startDate !== undefined && { startDate: this.toDateOrUndefined(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: this.toDateOrUndefined(dto.endDate) }),
        ...(dto.rulesOverride !== undefined && {
          rulesOverride: dto.rulesOverride as Prisma.InputJsonValue,
        }),
      },
      include: this.phaseInclude(),
    });
  }

  async remove(tournamentId: string, phaseId: string, user: AuthUser) {
    const tournament = await this.access.requireManager(tournamentId, user);
    const phase = await this.requirePhase(tournamentId, phaseId);
    await this.access.requireOrgOwnerAdmin(tournament.organizationId, user);
    const [matchdays, matches, groups] = await Promise.all([
      this.prisma.matchday.count({ where: { phaseId } }),
      this.prisma.match.count({ where: { phaseId } }),
      this.prisma.competitionGroup.count({ where: { phaseId } }),
    ]);
    if (matchdays > 0 || matches > 0 || groups > 0) {
      throw new ConflictException(
        'La fase tiene jornadas o partidos asociados y no puede eliminarse.',
      );
    }
    await this.prisma.phase.delete({ where: { id: phase.id } });
    return { removed: true };
  }

  async createMatchday(tournamentId: string, phaseId: string, user: AuthUser, dto: CreateMatchdayDto) {
    await this.access.requireManager(tournamentId, user);
    await this.requirePhase(tournamentId, phaseId);
    const sequence = await this.matchdayNextSequence(phaseId);
    return this.prisma.matchday.create({
      data: {
        phaseId,
        name: dto.name,
        sequence,
        scheduledDate: this.toDateOrUndefined(dto.scheduledDate),
      },
      include: this.matchdayInclude(),
    });
  }

  async listMatchdays(tournamentId: string, phaseId: string, user: AuthUser) {
    await this.access.requireManager(tournamentId, user);
    await this.requirePhase(tournamentId, phaseId);
    return this.prisma.matchday.findMany({
      where: { phaseId },
      orderBy: { sequence: 'asc' },
      include: this.matchdayInclude(),
    });
  }

  async updateMatchday(
    tournamentId: string,
    phaseId: string,
    matchdayId: string,
    user: AuthUser,
    dto: UpdateMatchdayDto,
  ) {
    await this.access.requireManager(tournamentId, user);
    await this.requirePhase(tournamentId, phaseId);
    const matchday = await this.requireMatchday(phaseId, matchdayId);
    if (dto.sequence !== undefined && dto.sequence !== matchday.sequence) {
      await this.assertMatchdaySequenceAvailable(phaseId, dto.sequence, matchdayId);
    }
    return this.prisma.matchday.update({
      where: { id: matchday.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.sequence !== undefined && { sequence: dto.sequence }),
        ...(dto.scheduledDate !== undefined && {
          scheduledDate: this.toDateOrUndefined(dto.scheduledDate),
        }),
      },
      include: this.matchdayInclude(),
    });
  }

  async removeMatchday(tournamentId: string, phaseId: string, matchdayId: string, user: AuthUser) {
    await this.access.requireManager(tournamentId, user);
    await this.requirePhase(tournamentId, phaseId);
    const matchday = await this.requireMatchday(phaseId, matchdayId);
    const matches = await this.prisma.match.count({ where: { matchdayId } });
    if (matches > 0) {
      throw new ConflictException('La jornada tiene partidos asociados y no puede eliminarse.');
    }
    await this.prisma.matchday.delete({ where: { id: matchday.id } });
    return { removed: true };
  }

  private phaseInclude() {
    return {
      _count: { select: { matchdays: true, matches: true, groups: true } },
    } as const;
  }

  private matchdayInclude() {
    return { _count: { select: { matches: true } } } as const;
  }

  private async requirePhase(tournamentId: string, phaseId: string) {
    const phase = await this.prisma.phase.findFirst({
      where: { id: phaseId, tournamentId },
      include: this.phaseInclude(),
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

  private async nextSequence(tournamentId: string): Promise<number> {
    const last = await this.prisma.phase.findFirst({
      where: { tournamentId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    return (last ? last.sequence : 0) + 1;
  }

  private async matchdayNextSequence(phaseId: string): Promise<number> {
    const last = await this.prisma.matchday.findFirst({
      where: { phaseId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    return (last ? last.sequence : 0) + 1;
  }

  private async assertSequenceAvailable(tournamentId: string, sequence: number, phaseId: string) {
    const clash = await this.prisma.phase.findFirst({
      where: { tournamentId, sequence, id: { not: phaseId } },
    });
    if (clash) {
      throw new ConflictException('Ya existe una fase con esa posición.');
    }
  }

  private async assertMatchdaySequenceAvailable(phaseId: string, sequence: number, matchdayId: string) {
    const clash = await this.prisma.matchday.findFirst({
      where: { phaseId, sequence, id: { not: matchdayId } },
    });
    if (clash) {
      throw new ConflictException('Ya existe una jornada con esa posición.');
    }
  }

  private toDateOrUndefined(value: string | undefined): Date | undefined {
    return value === undefined ? undefined : new Date(value);
  }
}