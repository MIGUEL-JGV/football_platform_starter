import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthorizationsService } from '../src/tournaments/authorizations.service';
import { hashToken } from '../src/common/utils/token';
import { ME, TOURNAMENT_ID, tournamentStub } from './helpers';

function makeDeps() {
  const access = { requireTournament: vi.fn(), requireOrgOwner: vi.fn() };
  const config = { get: vi.fn(() => undefined) };
  const prisma = {
    tournamentAuthorization: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(async () => []),
      update: vi.fn(),
    },
  };
  return { access, config, prisma };
}

function authorizationStub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'auth-1',
    tournamentId: TOURNAMENT_ID,
    label: 'Autorización post-inicio',
    maxUses: null,
    usedCount: 0,
    status: 'active',
    expiresAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('AuthorizationsService.create', () => {
  it('solo guarda el hash y exige ser dueño de la organización', async () => {
    const { access, config, prisma } = makeDeps();
    access.requireTournament.mockResolvedValue(tournamentStub());
    access.requireOrgOwner.mockResolvedValue(undefined);
    prisma.tournamentAuthorization.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: 'auth-1', ...data }),
    );
    const service = new AuthorizationsService(prisma as never, access as never, config as never);

    const result = await service.create(TOURNAMENT_ID, ME, { label: 'Post inicio' });
    expect(access.requireOrgOwner).toHaveBeenCalledWith('org-1', ME);
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(result.authorizeUrl).toContain(`/authorize/${result.token}`);
    expect(result.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    const created = (prisma.tournamentAuthorization.create.mock.calls[0][0] as { data: { tokenHash: string } })
      .data;
    expect(created.tokenHash).toBe(hashToken(result.token));
    expect(created.tokenHash).not.toContain(result.token);
  });
});

describe('AuthorizationsService.resolve', () => {
  it('devuelve not_found si el token no existe', async () => {
    const { access, config, prisma } = makeDeps();
    prisma.tournamentAuthorization.findUnique.mockResolvedValue(null);
    const service = new AuthorizationsService(prisma as never, access as never, config as never);

    await expect(service.resolve('no-existe')).resolves.toEqual({ valid: false, reason: 'not_found' });
  });

  it('distingue revocada, vencida y agotada', async () => {
    const { access, config, prisma } = makeDeps();
    prisma.tournamentAuthorization.findUnique.mockImplementation(
      async ({ where }: { where: { tokenHash: string } }) => {
        if (where.tokenHash === hashToken('revoked')) {
          return authorizationStub({ status: 'revoked' });
        }
        if (where.tokenHash === hashToken('expired')) {
          return authorizationStub({ expiresAt: new Date(2020, 1, 1) });
        }
        if (where.tokenHash === hashToken('exhausted')) {
          return authorizationStub({ maxUses: 3, usedCount: 3 });
        }
        return null;
      },
    );
    const service = new AuthorizationsService(prisma as never, access as never, config as never);

    await expect(service.resolve('revoked')).resolves.toMatchObject({ valid: false, reason: 'revoked' });
    await expect(service.resolve('expired')).resolves.toMatchObject({ valid: false, reason: 'expired' });
    await expect(service.resolve('exhausted')).resolves.toMatchObject({ valid: false, reason: 'exhausted' });
  });

  it('resuelve válida y expone el torneo y los usos restantes', async () => {
    const { access, config, prisma } = makeDeps();
    prisma.tournamentAuthorization.findUnique.mockResolvedValue(
      authorizationStub({
        maxUses: 5,
        usedCount: 2,
        tournament: { id: 't-1', name: 'Torneo', slug: 'torneo', status: 'in_progress' },
      }),
    );
    const service = new AuthorizationsService(prisma as never, access as never, config as never);

    const result = await service.resolve('valid-token');
    expect(result).toMatchObject({
      valid: true,
      remainingUses: 3,
      tournament: { name: 'Torneo', status: 'in_progress' },
    });
  });
});

describe('AuthorizationsService.requireUsable', () => {
  it('rechaza una autorización de otro torneo', async () => {
    const { access, config, prisma } = makeDeps();
    prisma.tournamentAuthorization.findUnique.mockResolvedValue(
      authorizationStub({ tournamentId: 'other-tournament' }),
    );
    const service = new AuthorizationsService(prisma as never, access as never, config as never);

    await expect(service.requireUsable('x', TOURNAMENT_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lanza NotFound si no existe', async () => {
    const { access, config, prisma } = makeDeps();
    prisma.tournamentAuthorization.findUnique.mockResolvedValue(null);
    const service = new AuthorizationsService(prisma as never, access as never, config as never);

    await expect(service.requireUsable('missing', TOURNAMENT_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lanza Forbidden si está revocada', async () => {
    const { access, config, prisma } = makeDeps();
    prisma.tournamentAuthorization.findUnique.mockResolvedValue(
      authorizationStub({ status: 'revoked' }),
    );
    const service = new AuthorizationsService(prisma as never, access as never, config as never);

    await expect(service.requireUsable('revoked', TOURNAMENT_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('consume incrementa usos', async () => {
    const { access, config, prisma } = makeDeps();
    prisma.tournamentAuthorization.update.mockResolvedValue({ id: 'auth-1', maxUses: 5, usedCount: 1 });
    const service = new AuthorizationsService(prisma as never, access as never, config as never);

    const result = await service.consume('auth-1');
    expect(result.usedCount).toBe(1);
    expect(prisma.tournamentAuthorization.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usedCount: { increment: 1 } } }),
    );
  });
});
