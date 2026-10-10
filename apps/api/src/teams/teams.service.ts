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