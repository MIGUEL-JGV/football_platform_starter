import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { NewsService } from '../src/news/news.service';
import { ME, TOURNAMENT_ID, tournamentStub } from './helpers';

function makeDeps() {
  const access = {
    requireManager: vi.fn(),
    requireViewable: vi.fn(async () => tournamentStub()),
    canManage: vi.fn(async () => false),
  };
  const prisma = {
    tournament: { findUnique: vi.fn() },
    newsPost: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      count: vi.fn(async () => 0),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(async (items: Promise<unknown>[]) => Promise.all(items)),
  };
  return { access, prisma };
}

describe('NewsService', () => {
  it('crea un slug único cuando el título ya existe', async () => {
    const { access, prisma } = makeDeps();
    access.requireManager.mockResolvedValue(tournamentStub());
    prisma.newsPost.findFirst.mockImplementation(async ({ where }: { where: { tournamentId: string; slug: string } }) =>
      where.slug === 'nuevo-titulo' ? { id: 'other' } : null,
    );
    prisma.newsPost.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'n-1', ...data }),
    );
    const service = new NewsService(prisma as never, access as never);

    const result = await service.create(TOURNAMENT_ID, ME, {
      title: 'Nuevo título',
      body: 'Contenido',
      status: 'draft',
    });
    expect(result.slug).toBe('nuevo-titulo-2');
    expect(prisma.newsPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'draft', publishedAt: null }),
      }),
    );
  });

  it('publica de inmediato si status es published', async () => {
    const { access, prisma } = makeDeps();
    access.requireManager.mockResolvedValue(tournamentStub());
    prisma.newsPost.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'n-1', ...data }),
    );
    const service = new NewsService(prisma as never, access as never);

    const result = await service.create(TOURNAMENT_ID, ME, {
      title: 'Noticia',
      body: 'Cuerpo',
      status: 'published',
    });
    expect(result.status).toBe('published');
    expect(result.publishedAt).toBeInstanceOf(Date);
  });

  it('un manager ve borradores y listado incluye status', async () => {
    const { access, prisma } = makeDeps();
    access.canManage.mockResolvedValue(true);
    prisma.newsPost.findMany.mockResolvedValue([
      { id: 'n-1', title: 'Beta', status: 'draft', publishedAt: null },
    ]);
    prisma.newsPost.count.mockResolvedValue(1);
    const service = new NewsService(prisma as never, access as never);

    const result = await service.list(TOURNAMENT_ID, { page: 1, pageSize: 12, status: 'draft' }, ME);
    expect(result.total).toBe(1);
    expect(prisma.newsPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'draft' }) }),
    );
  });

  it('el público solo ve noticias publicadas', async () => {
    const { access, prisma } = makeDeps();
    prisma.newsPost.findMany.mockResolvedValue([]);
    prisma.newsPost.count.mockResolvedValue(0);
    const service = new NewsService(prisma as never, access as never);

    await service.list(TOURNAMENT_ID, { page: 1, pageSize: 12 }, null);
    expect(prisma.newsPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'published' }) }),
    );
  });

  it('un borrador no es visible para el público (no manager)', async () => {
    const { access, prisma } = makeDeps();
    prisma.newsPost.findFirst.mockResolvedValue({
      id: 'n-1',
      status: 'draft',
      title: 'Borrador',
    });
    const service = new NewsService(prisma as never, access as never);

    await expect(service.getBySlug(TOURNAMENT_ID, 'borrador', null)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('no permite publicar lo ya publicado', async () => {
    const { access, prisma } = makeDeps();
    access.requireManager.mockResolvedValue(tournamentStub());
    prisma.newsPost.findFirst.mockResolvedValue({ id: 'n-1', status: 'published' });
    const service = new NewsService(prisma as never, access as never);

    await expect(service.publish(TOURNAMENT_ID, 'n-1', ME)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('no permite despublicar un borrador', async () => {
    const { access, prisma } = makeDeps();
    access.requireManager.mockResolvedValue(tournamentStub());
    prisma.newsPost.findFirst.mockResolvedValue({ id: 'n-1', status: 'draft' });
    const service = new NewsService(prisma as never, access as never);

    await expect(service.unpublish(TOURNAMENT_ID, 'n-1', ME)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});