import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvitationsService } from '../src/tournaments/invitations.service';
import { hashToken } from '../src/common/utils/token';
import { ME, TOURNAMENT_ID, tournamentStub } from './helpers';

function makeDeps() {
  const access = { requireManager: vi.fn() };
  const config = { get: vi.fn(() => undefined) };
  const prisma = {
    tournamentInvitation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(async () => []),
      update: vi.fn(),
    },
    tournamentTeam: { findMany: vi.fn(async () => []) },
  };
  return { access, config, prisma };
}

function invitationStub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    tournamentId: TOURNAMENT_ID,
    label: 'Compañeros',
    maxUses: null,
    usedCount: 0,
    status: 'active',
    expiresAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('InvitationsService.resolve', () => {
  it('devuelve not_found si el token no existe', async () => {
    const { access, config, prisma } = makeDeps();
    prisma.tournamentInvitation.findUnique.mockResolvedValue(null);
    const service = new InvitationsService(prisma as never, access as never, config as never);

    await expect(service.resolve('no-existe')).resolves.toEqual({ valid: false, reason: 'not_found' });
  });

  it('distingue revocada, vencida y agotada', async () => {
    const { access, config, prisma } = makeDeps();
    prisma.tournamentInvitation.findUnique.mockImplementation(
      async ({ where }: { where: { tokenHash: string } }) => {
        if (where.tokenHash === hashToken('revoked')) {
          return invitationStub({ status: 'revoked' });
        }
        if (where.tokenHash === hashToken('expired')) {
          return invitationStub({ expiresAt: new Date(2020, 1, 1) });
        }
        if (where.tokenHash === hashToken('exhausted')) {
          return invitationStub({ maxUses: 5, usedCount: 5 });
        }
        return null;
      },
    );
    const service = new InvitationsService(prisma as never, access as never, config as never);

    await expect(service.resolve('revoked')).resolves.toMatchObject({ valid: false, reason: 'revoked' });
    await expect(service.resolve('expired')).resolves.toMatchObject({ valid: false, reason: 'expired' });
    await expect(service.resolve('exhausted')).resolves.toMatchObject({ valid: false, reason: 'exhausted' });
  });

  it('resuelve como válida una invitación activa y expone el torneo', async () => {
    const { access, config, prisma } = makeDeps();
    prisma.tournamentInvitation.findUnique.mockResolvedValue(
      invitationStub({ tournament: { id: 't-1', name: 'Torneo', slug: 'torneo', format: 'football_11' } }),
    );
    const service = new InvitationsService(prisma as never, access as never, config as never);

    const result = await service.resolve('valid-token');
    expect(result).toMatchObject({ valid: true, tournament: { name: 'Torneo' } });
  });
});

describe('InvitationsService.create', () => {
  it('solo guarda el hash del token, nunca el token en claro', async () => {
    const { access, config, prisma } = makeDeps();
    access.requireManager.mockResolvedValue(tournamentStub());
    prisma.tournamentInvitation.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'inv-1', ...data }),
    );
    const service = new InvitationsService(prisma as never, access as never, config as never);

    const result = await service.create(TOURNAMENT_ID, ME, { label: 'Equipos A' });
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    const created = (prisma.tournamentInvitation.create.mock.calls[0][0] as { data: { tokenHash: string } }).data;
    expect(created.tokenHash).toBe(hashToken(result.token));
    expect(created.tokenHash).toHaveLength(64);
    expect(created.tokenHash).not.toContain(result.token);
  });
});

describe('InvitationsService.requireUsable', () => {
  it('rechaza una invitación de otro torneo', async () => {
    const { access, config, prisma } = makeDeps();
    prisma.tournamentInvitation.findUnique.mockResolvedValue(
      invitationStub({ tournamentId: 'other-tournament' }),
    );
    const service = new InvitationsService(prisma as never, access as never, config as never);

    await expect(service.requireUsable('x', TOURNAMENT_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lanza NotFound si no existe', async () => {
    const { access, config, prisma } = makeDeps();
    prisma.tournamentInvitation.findUnique.mockResolvedValue(null);
    const service = new InvitationsService(prisma as never, access as never, config as never);

    await expect(service.requireUsable('missing', TOURNAMENT_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('consume incrementa usos y conserva límites', async () => {
    const { access, config, prisma } = makeDeps();
    prisma.tournamentInvitation.update.mockResolvedValue({ id: 'inv-1', maxUses: 5, usedCount: 1 });
    const service = new InvitationsService(prisma as never, access as never, config as never);

    const result = await service.consume('inv-1');
    expect(result.usedCount).toBe(1);
    expect(prisma.tournamentInvitation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usedCount: { increment: 1 } } }),
    );
  });
});