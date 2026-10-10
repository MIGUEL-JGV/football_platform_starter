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