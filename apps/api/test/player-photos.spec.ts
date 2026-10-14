import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlayerPhotosService } from '../src/players/player-photos.service';
import { ME, OTHER } from './helpers';

// PNG 1x1 válido para probar el procesamiento real con sharp (sin tocar disco).
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function makeDeps() {
  const values: Record<string, string | undefined> = {
    PUBLIC_API_URL: 'http://api.test',
    MEDIA_URL_SECRET: 'test-media-secret',
  };
  const config = { get: vi.fn((key: string) => values[key]) };
  const storage = {
    save: vi.fn(async () => ({ storageKey: 'k', sizeBytes: 1 })),
    remove: vi.fn(async () => {}),
    exists: vi.fn(async () => true),
    read: vi.fn(),
  };
  const access = { canManage: vi.fn(async () => false) };
  const prisma = {
    player: {
      findUnique: vi.fn(async () => ({ id: 'p-1', createdBy: ME.userId, dateOfBirth: null })),
      update: vi.fn(async () => ({})),
    },
    playerPhoto: {
      count: vi.fn(async () => 0),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ createdAt: new Date(), ...data })),
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => null),
      updateMany: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
      delete: vi.fn(async () => ({})),
    },
    teamRoster: { findMany: vi.fn(async () => []) },
    consentRecord: { findFirst: vi.fn(async () => null) },
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(prisma)),
  };
  return { config, storage, access, prisma };
}

function photoStub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'photo-1',
    playerId: 'p-1',
    storageKey: 'players/p-1/photo-1.webp',
    thumbKey: 'players/p-1/photo-1_thumb.webp',
    credentialKey: 'players/p-1/photo-1_credential.webp',
    mimeType: 'image/webp',
    width: 300,
    height: 400,
    sizeBytes: 100,
    visibility: 'private',
    isPrimary: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeService() {
  const deps = makeDeps();
  const service = new PlayerPhotosService(
    deps.prisma as never,
    deps.storage as never,
    deps.access as never,
    deps.config as never,
  );
  return { service, ...deps };
}

describe('PlayerPhotosService.upload', () => {
  const file = { buffer: PNG_1X1, mimetype: 'image/png', size: PNG_1X1.length };

  it('rechaza un formato no permitido', async () => {
    const { service } = makeService();
    await expect(
      service.upload('p-1', ME, { ...file, mimetype: 'application/pdf' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza archivos que superan el límite', async () => {
    const { service } = makeService();
    await expect(
      service.upload('p-1', ME, { ...file, size: 9 * 1024 * 1024 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('guarda versión normalizada, miniatura y credencial con visibilidad privada', async () => {
    const { service, prisma, storage } = makeService();
    const photo = await service.upload('p-1', ME, file);
    expect(storage.save).toHaveBeenCalledTimes(3);
    const data = (prisma.playerPhoto.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.visibility).toBe('private');
    expect(data.thumbKey).toBeTruthy();
    expect(data.credentialKey).toBeTruthy();
    expect(photo.visibility).toBe('private');
  });

  it('no publica sin consentimiento cuando el jugador es menor', async () => {
    const { service, prisma } = makeService();
    prisma.player.findUnique.mockResolvedValue({
      id: 'p-1',
      createdBy: ME.userId,
      dateOfBirth: new Date(new Date().getFullYear() - 12, 0, 1),
    });
    await expect(service.upload('p-1', ME, file, true)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('publica cuando existe consentimiento de publicación', async () => {
    const { service, prisma } = makeService();
    prisma.consentRecord.findFirst.mockResolvedValue({ id: 'c-1' });
    const photo = await service.upload('p-1', ME, file);
    expect(photo.visibility).toBe('public');
  });
});

describe('PlayerPhotosService privacidad de URLs', () => {
  it('firma las URLs de fotografías privadas', async () => {
    const { service, prisma } = makeService();
    prisma.playerPhoto.findMany.mockResolvedValue([photoStub({ visibility: 'private' })]);
    const [view] = await service.list('p-1', ME);
    expect(view.url).toContain('exp=');
    expect(view.url).toContain('sig=');
  });

  it('expone URLs directas de fotografías públicas', async () => {
    const { service, prisma } = makeService();
    prisma.playerPhoto.findMany.mockResolvedValue([photoStub({ visibility: 'public' })]);
    const [view] = await service.list('p-1', ME);
    expect(view.url).toBe('http://api.test/api/v1/media/photos/photo-1');
    expect(view.credentialUrl).toBe('http://api.test/api/v1/media/photos/photo-1/credential');
  });

  it('valida firmas y rechaza valores manipulados o vencidos', () => {
    const { service } = makeService();
    const exp = Math.floor(Date.now() / 1000) + 60;
    const valid = (service as unknown as { sign: (id: string, kind: string, exp: number) => string }).sign(
      'photo-1',
      'full',
      exp,
    );
    expect(service.verifySignature('photo-1', 'full', exp, valid)).toBe(true);
    expect(service.verifySignature('photo-1', 'full', exp, 'deadbeef')).toBe(false);
    expect(service.verifySignature('photo-1', 'full', Math.floor(Date.now() / 1000) - 10, valid)).toBe(false);
  });

  it('deniega el acceso a un usuario sin permisos', async () => {
    const { service, prisma } = makeService();
    prisma.player.findUnique.mockResolvedValue({ id: 'p-1', createdBy: ME.userId });
    await expect(service.list('p-1', OTHER)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('PlayerPhotosService.resolveFile', () => {
  it('resuelve la versión de credencial', async () => {
    const { service, prisma } = makeService();
    prisma.playerPhoto.findUnique.mockResolvedValue(photoStub());
    const file = await service.resolveFile('photo-1', 'credential');
    expect(file.storageKey).toBe('players/p-1/photo-1_credential.webp');
    expect(file.visibility).toBe('private');
  });

  it('lanza NotFound si la fotografía no existe', async () => {
    const { service, prisma } = makeService();
    prisma.playerPhoto.findUnique.mockResolvedValue(null);
    await expect(service.resolveFile('missing', 'full')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PlayerPhotosService.remove', () => {
  it('elimina también la versión de credencial', async () => {
    const { service, prisma, storage } = makeService();
    prisma.playerPhoto.findFirst.mockResolvedValue(photoStub());
    prisma.playerPhoto.findFirst.mockResolvedValueOnce(photoStub());
    await service.remove('p-1', 'photo-1', ME);
    expect(storage.remove).toHaveBeenCalledWith('players/p-1/photo-1_credential.webp');
  });
});
