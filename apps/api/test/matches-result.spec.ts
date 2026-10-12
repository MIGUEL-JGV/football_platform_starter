import { describe, expect, it, vi } from 'vitest';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { MatchesService } from '../src/schedule/matches.service';
import { ME, TOURNAMENT_ID, tournamentStub } from './helpers';

function makeDeps() {
  const access = {
    requireManager: vi.fn(),
    requireTournament: vi.fn(async () => tournamentStub()),
    canRecord: vi.fn(async () => true),
  };
  const venues = { requireVenueForOrg: vi.fn() };
  const prisma = {
    tournament: { findUnique: vi.fn() },
    match: { findFirst: vi.fn(), update: vi.fn() },
  };
  return { access, venues, prisma };
}

const matchStub = (overrides: Record<string, unknown> = {}) => ({
  id: 'm-1',
  tournamentId: TOURNAMENT_ID,
  status: 'scheduled',
  homeScore: null,
  awayScore: null,
  ...overrides,
});

describe('MatchesService.recordResult', () => {
  it('registra el resultado y pasa a pending_validation', async () => {
    const { access, venues, prisma } = makeDeps();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub());
    prisma.match.findFirst.mockResolvedValue(matchStub());
    prisma.match.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: 'm-1',
        ...data,
        resultVersion:
          (data.resultVersion as { increment?: number } | null | undefined)?.increment ??
          data.resultVersion,
      }),
    );
    const service = new MatchesService(prisma as never, access as never, venues as never);

    const result = await service.recordResult(TOURNAMENT_ID, 'm-1', ME, {
      homeScore: 2,
      awayScore: 1,
      homePenaltyScore: 4,
      awayPenaltyScore: 3,
    });
    expect(result).toMatchObject({
      status: 'pending_validation',
      homeScore: 2,
      awayScore: 1,
      resultVersion: 1,
      recordedBy: ME.userId,
    });
  });

  it('rechaza registrar resultado en un partido finalizado', async () => {
    const { access, venues, prisma } = makeDeps();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub());
    prisma.match.findFirst.mockResolvedValue(matchStub({ status: 'finished' }));
    const service = new MatchesService(prisma as never, access as never, venues as never);

    await expect(
      service.recordResult(TOURNAMENT_ID, 'm-1', ME, { homeScore: 1, awayScore: 0 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('niega el registro si el usuario no puede registrar', async () => {
    const { access, venues, prisma } = makeDeps();
    access.canRecord.mockResolvedValue(false);
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub());
    const service = new MatchesService(prisma as never, access as never, venues as never);

    await expect(
      service.recordResult(TOURNAMENT_ID, 'm-1', ME, { homeScore: 1, awayScore: 0 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('MatchesService.validateResult', () => {
  it('solo valida resultados pending_validation', async () => {
    const { access, venues, prisma } = makeDeps();
    access.requireManager.mockResolvedValue(tournamentStub());
    const service = new MatchesService(prisma as never, access as never, venues as never);

    prisma.match.findFirst.mockResolvedValue(matchStub({ status: 'scheduled' }));
    await expect(service.validateResult(TOURNAMENT_ID, 'm-1', ME)).rejects.toBeInstanceOf(
      ConflictException,
    );

    prisma.match.findFirst.mockResolvedValue(matchStub({ status: 'pending_validation' }));
    prisma.match.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: 'm-1',
        ...data,
        resultVersion:
          (data.resultVersion as { increment?: number } | null | undefined)?.increment ??
          data.resultVersion,
      }),
    );
    const result = await service.validateResult(TOURNAMENT_ID, 'm-1', ME);
    expect(result).toMatchObject({ status: 'finished', validatedBy: ME.userId });
  });
});

describe('MatchesService.clearResult', () => {
  it('solo limpia pendientes o finalizados y vuelve a scheduled', async () => {
    const { access, venues, prisma } = makeDeps();
    access.requireManager.mockResolvedValue(tournamentStub());
    const service = new MatchesService(prisma as never, access as never, venues as never);

    prisma.match.findFirst.mockResolvedValue(matchStub({ status: 'scheduled' }));
    await expect(service.clearResult(TOURNAMENT_ID, 'm-1', ME)).rejects.toBeInstanceOf(
      ConflictException,
    );

    prisma.match.findFirst.mockResolvedValue(
      matchStub({ status: 'finished', homeScore: 2, awayScore: 1 }),
    );
    prisma.match.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: 'm-1',
        ...data,
        resultVersion:
          (data.resultVersion as { increment?: number } | null | undefined)?.increment ??
          data.resultVersion,
      }),
    );
    const result = await service.clearResult(TOURNAMENT_ID, 'm-1', ME);
    expect(result).toMatchObject({ status: 'scheduled', homeScore: null, awayScore: null });
  });
});