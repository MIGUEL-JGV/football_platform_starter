import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { slugify } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import { TournamentAccessService } from '../tournaments/tournament-access.service';
import { CreateNewsDto, ListNewsQueryDto, UpdateNewsDto } from './dto/news.dto';

const authorSelect = {
  id: true,
  displayName: true,
} as const;

@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TournamentAccessService,
  ) {}

  async list(tournamentId: string, query: ListNewsQueryDto, user: AuthUser | null) {
    const tournament = await this.access.requireViewable(tournamentId, user);
    const canManage = user
      ? await this.access.canManage(tournament.id, tournament.organizationId, user)
      : false;
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 12, 50);
    const where: Prisma.NewsPostWhereInput = {
      tournamentId: tournament.id,
      ...(query.q !== undefined && {
        OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { body: { contains: query.q, mode: 'insensitive' } }],
      }),
      ...(!canManage && { status: 'published' }),
      ...(canManage && query.status !== undefined && { status: query.status }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.newsPost.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          author: { select: authorSelect },
        },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.newsPost.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getBySlug(tournamentId: string, slug: string, user: AuthUser | null) {
    const tournament = await this.access.requireViewable(tournamentId, user);
    const post = await this.prisma.newsPost.findFirst({
      where: { tournamentId: tournament.id, slug },
      include: { author: { select: authorSelect } },
    });
    if (!post) {
      throw new NotFoundException('Noticia no encontrada.');
    }
    if (post.status === 'draft') {
      const canManage = user
        ? await this.access.canManage(tournament.id, tournament.organizationId, user)
        : false;
      if (!canManage) {
        throw new NotFoundException('Noticia no encontrada.');
      }
    }
    return post;
  }

  async create(tournamentId: string, user: AuthUser, dto: CreateNewsDto) {
    const tournament = await this.access.requireManager(tournamentId, user);
    const slug = await this.reserveUniqueSlug(tournament.id, dto.title);
    const isPublished = dto.status === 'published';
    return this.prisma.newsPost.create({
      data: {
        tournamentId: tournament.id,
        authorId: user.userId,
        title: dto.title,
        slug,
        body: dto.body,
        status: isPublished ? 'published' : 'draft',
        publishedAt: isPublished ? new Date() : null,
      },
      include: { author: { select: authorSelect } },
    });
  }

  async update(tournamentId: string, postId: string, user: AuthUser, dto: UpdateNewsDto) {
    const tournament = await this.access.requireManager(tournamentId, user);
    const post = await this.requirePost(tournament.id, postId);
    const slug =
      dto.title !== undefined ? await this.reserveUniqueSlug(tournament.id, dto.title, post.id) : undefined;
    const isPublishing = dto.status === 'published';
    const isDrafting = dto.status === 'draft';
    return this.prisma.newsPost.update({
      where: { id: post.id },
      data: {
        ...(dto.title !== undefined && { title: dto.title, ...(slug && { slug }) }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.status !== undefined && {
          status: dto.status,
          ...(isPublishing && { publishedAt: post.publishedAt ?? new Date() }),
          ...(isDrafting && { publishedAt: null }),
        }),
      },
      include: { author: { select: authorSelect } },
    });
  }

  async remove(tournamentId: string, postId: string, user: AuthUser) {
    const tournament = await this.access.requireManager(tournamentId, user);
    const post = await this.requirePost(tournament.id, postId);
    await this.prisma.newsPost.delete({ where: { id: post.id } });
    return { removed: true };
  }

  async publish(tournamentId: string, postId: string, user: AuthUser) {
    const tournament = await this.access.requireManager(tournamentId, user);
    const post = await this.requirePost(tournament.id, postId);
    if (post.status === 'published') {
      throw new ConflictException('La noticia ya está publicada.');
    }
    return this.prisma.newsPost.update({
      where: { id: post.id },
      data: { status: 'published', publishedAt: new Date() },
      include: { author: { select: authorSelect } },
    });
  }

  async unpublish(tournamentId: string, postId: string, user: AuthUser) {
    const tournament = await this.access.requireManager(tournamentId, user);
    const post = await this.requirePost(tournament.id, postId);
    if (post.status === 'draft') {
      throw new ConflictException('La noticia ya está en borrador.');
    }
    return this.prisma.newsPost.update({
      where: { id: post.id },
      data: { status: 'draft', publishedAt: null },
      include: { author: { select: authorSelect } },
    });
  }

  private async requirePost(tournamentId: string, postId: string) {
    const post = await this.prisma.newsPost.findFirst({
      where: { id: postId, tournamentId },
    });
    if (!post) {
      throw new NotFoundException('Noticia no encontrada.');
    }
    return post;
  }

  private async reserveUniqueSlug(tournamentId: string, title: string, excludeId?: string) {
    const base = slugify(title) || 'noticia';
    let candidate = base;
    let suffix = 1;
    while (
      await this.prisma.newsPost.findFirst({
        where: { tournamentId, slug: candidate, ...(excludeId && { id: { not: excludeId } }) },
      })
    ) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }
}