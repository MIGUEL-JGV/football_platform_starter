import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { slugify } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto, ListTeamsQueryDto, UpdateTeamDto } from './dto/team.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateTeamDto) {
    const slug = await this.reserveUniqueSlug(dto.name);
    return this.prisma.team.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        logoUrl: dto.logoUrl,
        createdBy: user.userId,
      },
    });
  }

  async listPublic(query: ListTeamsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 12, 50);
    const where: Prisma.TeamWhereInput = {
      ...(query.q !== undefined && { name: { contains: query.q, mode: 'insensitive' } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.team.findMany({
        where,
        include: {
          creator: { select: { id: true, displayName: true } },
          _count: { select: { entries: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.team.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async listMine(user: AuthUser, query: ListTeamsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 12, 50);
    const where: Prisma.TeamWhereInput = {
      createdBy: user.userId,
      ...(query.q !== undefined && { name: { contains: query.q, mode: 'insensitive' } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.team.findMany({
        where,
        include: { _count: { select: { entries: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.team.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, displayName: true } },
        _count: { select: { entries: true } },
      },
    });
    if (!team) {
      throw new NotFoundException('Equipo no encontrado.');
    }
    return team;
  }

  async getPublicProfile(id: string) {
    const team = await this.getById(id);
    const entries = await this.prisma.tournamentTeam.findMany({
      where: { teamId: id },
      select: {
        id: true,
        registrationStatus: true,
        tournament: { select: { id: true, name: true, slug: true, status: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });
    const entryIds = entries.map((entry) => entry.id);
    const [players, rosters] = await Promise.all([
      this.prisma.player.findMany({
        where: { createdBy: team.createdBy },
        select: {
          id: true,
          displayName: true,
          photoUrl: true,
          preferredPosition: true,
          dateOfBirth: true,
        },
        orderBy: { displayName: 'asc' },
      }),
      entryIds.length > 0
        ? this.prisma.teamRoster.findMany({
            where: { tournamentTeamId: { in: entryIds } },
            select: {
              id: true,
              tournamentTeamId: true,
              jerseyNumber: true,
              position: true,
              status: true,
              player: {
                select: {
                  id: true,
                  displayName: true,
                  photoUrl: true,
                  preferredPosition: true,
                  dateOfBirth: true,
                },
              },
            },
            orderBy: [{ jerseyNumber: 'asc' }, { player: { displayName: 'asc' } }],
          })
        : [],
    ]);

    const age = (dateOfBirth: Date | null): number | null =>
      dateOfBirth ? Math.floor((Date.now() - dateOfBirth.getTime()) / 31557600000) : null;

    const squads = entries
      .map((entry) => ({
        entryId: entry.id,
        registrationStatus: entry.registrationStatus,
        tournament: entry.tournament,
        players: rosters
          .filter((roster) => roster.tournamentTeamId === entry.id)
          .map((roster) => ({
            rosterId: roster.id,
            jerseyNumber: roster.jerseyNumber,
            position: roster.position,
            status: roster.status,
            playerId: roster.player.id,
            displayName: roster.player.displayName,
            photoUrl: roster.player.photoUrl,
            preferredPosition: roster.player.preferredPosition,
            age: age(roster.player.dateOfBirth),
          })),
      }))
      .filter((squad) => squad.players.length > 0);

    const matches =
      entryIds.length > 0
        ? await this.prisma.match.findMany({
            where: {
              status: 'finished',
              OR: [
                { homeTournamentTeamId: { in: entryIds } },
                { awayTournamentTeamId: { in: entryIds } },
              ],
            },
            select: {
              id: true,
              homeScore: true,
              awayScore: true,
              scheduledAt: true,
              tournament: { select: { id: true, name: true, slug: true } },
              homeTeam: { select: { id: true, team: { select: { id: true, name: true } } } },
              awayTeam: { select: { id: true, team: { select: { id: true, name: true } } } },
            },
            orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
            take: 8,
          })
        : [];

    let played = 0;
    let won = 0;
    let drawn = 0;
    let lost = 0;
    let gf = 0;
    let ga = 0;
    for (const match of matches) {
      const isHome = match.homeTeam?.team?.id === team.id;
      const scored = (isHome ? match.homeScore : match.awayScore) ?? 0;
      const conceded = (isHome ? match.awayScore : match.homeScore) ?? 0;
      played += 1;
      gf += scored;
      ga += conceded;
      if (scored > conceded) won += 1;
      else if (scored < conceded) lost += 1;
      else drawn += 1;
    }

    return {
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        logoUrl: team.logoUrl,
        createdAt: team.createdAt,
        creator: team.creator,
      },
      entries,
      players: players.map((player) => ({
        id: player.id,
        displayName: player.displayName,
        photoUrl: player.photoUrl,
        preferredPosition: player.preferredPosition,
        age: age(player.dateOfBirth),
      })),
      squads,
      recentMatches: matches,
      form: { played, won, drawn, lost, gf, ga, gd: gf - ga },
    };
  }

  async update(user: AuthUser, id: string, dto: UpdateTeamDto) {
    const team = await this.requireOwned(id, user.userId);
    return this.prisma.team.update({
      where: { id: team.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.requireOwned(id, user.userId);
    const entries = await this.prisma.tournamentTeam.count({ where: { teamId: id } });
    if (entries > 0) {
      throw new ConflictException('El equipo tiene inscripciones en torneos y no puede eliminarse.');
    }
    await this.prisma.team.delete({ where: { id } });
    return { removed: true };
  }

  private async requireOwned(id: string, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) {
      throw new NotFoundException('Equipo no encontrado.');
    }
    if (team.createdBy !== userId) {
      throw new ForbiddenException('Acceso denegado.');
    }
    return team;
  }

  private async reserveUniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'equipo';
    let candidate = base;
    let suffix = 1;
    while (
      await this.prisma.team.findUnique({
        where: { slug: candidate },
      })
    ) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }
}