import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlayerDto, ListPlayersQueryDto, UpdatePlayerDto } from './dto/player.dto';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  create(user: AuthUser, dto: CreatePlayerDto) {
    return this.prisma.player.create({
      data: {
        displayName: dto.displayName,
        dateOfBirth: this.toDateOrUndefined(dto.dateOfBirth),
        photoUrl: dto.photoUrl,
        preferredPosition: dto.preferredPosition,
        createdBy: user.userId,
      },
    });
  }

  async listMine(user: AuthUser, query: ListPlayersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 12, 50);
    const where: Prisma.PlayerWhereInput = {
      createdBy: user.userId,
      ...(query.q !== undefined && { displayName: { contains: query.q, mode: 'insensitive' } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.player.findMany({
        where,
        include: { _count: { select: { rosters: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.player.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(user: AuthUser, id: string) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      include: { _count: { select: { rosters: true } } },
    });
    if (!player) {
      throw new NotFoundException('Jugador no encontrado.');
    }
    if (player.createdBy !== user.userId) {
      throw new ForbiddenException('Acceso denegado.');
    }
    return player;
  }

  async getPublicProfile(id: string) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        dateOfBirth: true,
        photoUrl: true,
        preferredPosition: true,
        createdAt: true,
      },
    });
    if (!player) {
      throw new NotFoundException('Jugador no encontrado.');
    }

    const rosters = await this.prisma.teamRoster.findMany({
      where: { playerId: id },
      select: {
        id: true,
        jerseyNumber: true,
        position: true,
        tournamentTeam: {
          select: {
            id: true,
            team: { select: { id: true, name: true, slug: true, logoUrl: true } },
            tournament: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    const rosterIds = rosters.map((roster) => roster.id);

    const events =
      rosterIds.length > 0
        ? await this.prisma.matchEvent.findMany({
            where: {
              status: 'valid',
              OR: [
                { teamRosterId: { in: rosterIds } },
                { secondaryTeamRosterId: { in: rosterIds } },
              ],
            },
            select: {
              eventType: true,
              minute: true,
              teamRosterId: true,
              secondaryTeamRosterId: true,
              match: {
                select: {
                  id: true,
                  scheduledAt: true,
                  tournament: { select: { id: true, name: true, slug: true } },
                },
              },
            },
            orderBy: [{ match: { scheduledAt: 'desc' } }, { minute: 'desc' }],
            take: 20,
          })
        : [];

    const rosterSet = new Set(rosterIds);
    const stats = {
      goals: 0,
      penaltyGoals: 0,
      ownGoals: 0,
      assists: 0,
      yellow: 0,
      secondYellow: 0,
      red: 0,
      foulsCommitted: 0,
      foulsReceived: 0,
      saves: 0,
    };
    for (const event of events) {
      const isPrimary = event.teamRosterId !== null && rosterSet.has(event.teamRosterId);
      const isSecondary =
        event.secondaryTeamRosterId !== null && rosterSet.has(event.secondaryTeamRosterId);
      if (isPrimary) {
        if (event.eventType === 'goal') stats.goals += 1;
        if (event.eventType === 'penalty_goal') {
          stats.goals += 1;
          stats.penaltyGoals += 1;
        }
        if (event.eventType === 'own_goal') stats.ownGoals += 1;
        if (event.eventType === 'assist') stats.assists += 1;
        if (event.eventType === 'yellow_card') stats.yellow += 1;
        if (event.eventType === 'second_yellow') stats.secondYellow += 1;
        if (event.eventType === 'red_card') stats.red += 1;
        if (event.eventType === 'foul') stats.foulsCommitted += 1;
        if (event.eventType === 'save' || event.eventType === 'penalty_saved') stats.saves += 1;
      }
      if (isSecondary) {
        if (event.eventType === 'goal') stats.assists += 1;
        if (event.eventType === 'foul') stats.foulsReceived += 1;
      }
    }

    return {
      player,
      teams: rosters.map((roster) => ({
        rosterId: roster.id,
        jerseyNumber: roster.jerseyNumber,
        position: roster.position,
        team: roster.tournamentTeam.team,
        tournament: roster.tournamentTeam.tournament,
      })),
      stats,
      recentEvents: events,
    };
  }

  async update(user: AuthUser, id: string, dto: UpdatePlayerDto) {
    const player = await this.requireOwned(id, user.userId);
    return this.prisma.player.update({
      where: { id: player.id },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.dateOfBirth !== undefined && { dateOfBirth: this.toDateOrUndefined(dto.dateOfBirth) }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
        ...(dto.preferredPosition !== undefined && { preferredPosition: dto.preferredPosition }),
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const player = await this.requireOwned(id, user.userId);
    const rosters = await this.prisma.teamRoster.count({ where: { playerId: id } });
    if (rosters > 0) {
      throw new ConflictException('El jugador forma parte de una convocatoria y no puede eliminarse.');
    }
    await this.prisma.player.delete({ where: { id: player.id } });
    return { removed: true };
  }

  private async requireOwned(id: string, userId: string) {
    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) {
      throw new NotFoundException('Jugador no encontrado.');
    }
    if (player.createdBy !== userId) {
      throw new ForbiddenException('Acceso denegado.');
    }
    return player;
  }

  private toDateOrUndefined(value: string | undefined): Date | undefined {
    return value === undefined ? undefined : new Date(value);
  }
}