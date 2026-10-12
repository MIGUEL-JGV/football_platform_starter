import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TournamentAccessService } from '../src/tournaments/tournament-access.service';
import { ME, ORG_ID, TOURNAMENT_ID, memberActive, tournamentStub } from './helpers';

function makePrisma() {
  return {
    tournament: { findUnique: vi.fn() },
    tournamentMember: { findUnique: vi.fn() },
    organizationMember: { findUnique: vi.fn() },
  };
}

describe('TournamentAccessService', () => {
  it('permite gestionar al owner de la organización', async () => {
    const prisma = makePrisma();
    prisma.tournamentMember.findUnique.mockResolvedValue(null);
    prisma.organizationMember.findUnique.mockResolvedValue(memberActive('owner'));
    const access = new TournamentAccessService(prisma as never);
    await expect(access.canManage(TOURNAMENT_ID, ORG_ID, ME)).resolves.toBe(true);
  });

  it('permite gestionar al manager de torneo activo', async () => {
    const prisma = makePrisma();
    prisma.tournamentMember.findUnique.mockResolvedValue(memberActive('manager'));
    const access = new TournamentAccessService(prisma as never);
    await expect(access.canManage(TOURNAMENT_ID, ORG_ID, ME)).resolves.toBe(true);
  });

  it('deniega gestión al scorekeeper/viewer', async () => {
    for (const role of ['scorekeeper', 'viewer', 'editor']) {
      const prisma = makePrisma();
      prisma.tournamentMember.findUnique.mockResolvedValue(
        role === 'editor' ? null : memberActive(role),
      );
      prisma.organizationMember.findUnique.mockResolvedValue(
        role === 'editor' ? memberActive('editor') : null,
      );
      const access = new TournamentAccessService(prisma as never);
      await expect(access.canManage(TOURNAMENT_ID, ORG_ID, ME)).resolves.toBe(false);
    }
  });

  it('permite registrar eventos al scorekeeper activo', async () => {
    const prisma = makePrisma();
    prisma.tournamentMember.findUnique.mockResolvedValue(memberActive('scorekeeper'));
    const access = new TournamentAccessService(prisma as never);
    await expect(access.canRecord(TOURNAMENT_ID, ORG_ID, ME)).resolves.toBe(true);
  });

  it('deniega registro de eventos al viewer', async () => {
    const prisma = makePrisma();
    prisma.tournamentMember.findUnique.mockResolvedValue(memberActive('viewer'));
    const access = new TournamentAccessService(prisma as never);
    await expect(access.canRecord(TOURNAMENT_ID, ORG_ID, ME)).resolves.toBe(false);
  });

  it('un miembro con estado no activo no cuenta', async () => {
    const prisma = makePrisma();
    prisma.tournamentMember.findUnique.mockResolvedValue({ status: 'pending', role: 'manager' });
    const access = new TournamentAccessService(prisma as never);
    await expect(access.canManage(TOURNAMENT_ID, ORG_ID, ME)).resolves.toBe(false);
  });

  it('requireManager lanza Forbidden para quien no gestiona', async () => {
    const prisma = makePrisma();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub());
    prisma.tournamentMember.findUnique.mockResolvedValue(null);
    prisma.organizationMember.findUnique.mockResolvedValue(null);
    const access = new TournamentAccessService(prisma as never);
    await expect(access.requireManager(TOURNAMENT_ID, ME)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('requireViewable permite torneo público sin sesión', async () => {
    const prisma = makePrisma();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub({ visibility: 'public' }));
    const access = new TournamentAccessService(prisma as never);
    await expect(access.requireViewable(TOURNAMENT_ID, null)).resolves.toMatchObject({
      id: TOURNAMENT_ID,
    });
  });

  it('requireViewable oculta un torneo privado sin sesión', async () => {
    const prisma = makePrisma();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub({ visibility: 'private' }));
    const access = new TournamentAccessService(prisma as never);
    await expect(access.requireViewable(TOURNAMENT_ID, null)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('requireViewable permite ver a un viewer de torneo privado', async () => {
    const prisma = makePrisma();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub({ visibility: 'private' }));
    prisma.tournamentMember.findUnique.mockResolvedValue(memberActive('viewer'));
    const access = new TournamentAccessService(prisma as never);
    await expect(access.requireViewable(TOURNAMENT_ID, ME)).resolves.toMatchObject({
      visibility: 'private',
    });
  });

  it('requireTournament lanza NotFound si no existe', async () => {
    const prisma = makePrisma();
    prisma.tournament.findUnique.mockResolvedValue(null);
    const access = new TournamentAccessService(prisma as never);
    await expect(access.requireTournament('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});