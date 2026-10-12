import { describe, expect, it, vi } from 'vitest';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { MatchEventsService } from '../src/schedule/events.service';
import { ME, TOURNAMENT_ID, tournamentStub } from './helpers';

function makeDeps() {
  const access = {
    requireTournament: vi.fn(async () => tournamentStub()),
    canRecord: vi.fn(async () => true),
    requireViewable: vi.fn(async () => tournamentStub()),
  };
  const prisma = {
    match: { findFirst: vi.fn() },
    matchEvent: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    teamRoster: { findUnique: vi.fn(), findMany: vi.fn() },
  };
  return { access, prisma };
}

function matchStub(status = 'scheduled') {
  return {
    id: 'm-1',
    tournamentId: TOURNAMENT_ID,
    status,
    homeTournamentTeamId: 'home-team',
    awayTournamentTeamId: 'away-team',
  };
}

describe('MatchEventsService.create', () => {
  it('registra un evento válido con convocatoria del partido', async () => {
    const { access, prisma } = makeDeps();
    prisma.match.findFirst.mockResolvedValue(matchStub());
    prisma.teamRoster.findUnique.mockResolvedValue({ id: 'r-1', tournamentTeamId: 'home-team' });
    prisma.matchEvent.create.mockResolvedValue({
      id: 'ev-1',
      matchId: 'm-1',
      teamRosterId: 'r-1',
      secondaryTeamRosterId: null,
      eventType: 'goal',
      minute: 33,
      period: 'first_half',
      status: 'valid',
    });
    prisma.matchEvent.findMany.mockResolvedValue([]);
    prisma.teamRoster.findMany.mockResolvedValue([]);
    const service = new MatchEventsService(prisma as never, access as never);

    const result = await service.create(TOURNAMENT_ID, 'm-1', ME, {
      eventType: 'goal',
      minute: 33,
      teamRosterId: 'r-1',
    });
    expect(result.eventType).toBe('goal');
    expect(result.minute).toBe(33);
  });

  it('rechaza una convocatoria que no juega el partido', async () => {
    const { access, prisma } = makeDeps();
    prisma.match.findFirst.mockResolvedValue(matchStub());
    prisma.teamRoster.findUnique.mockResolvedValue({ id: 'r-x', tournamentTeamId: 'other-team' });
    const service = new MatchEventsService(prisma as never, access as never);

    await expect(
      service.create(TOURNAMENT_ID, 'm-1', ME, { eventType: 'goal', teamRosterId: 'r-x' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza eventos en partidos cancelados o abandonados', async () => {
    for (const status of ['cancelled', 'abandoned']) {
      const { access, prisma } = makeDeps();
      prisma.match.findFirst.mockResolvedValue(matchStub(status));
      const service = new MatchEventsService(prisma as never, access as never);

      await expect(
        service.create(TOURNAMENT_ID, 'm-1', ME, { eventType: 'goal' }),
      ).rejects.toBeInstanceOf(ConflictException);
    }
  });

  it('niega el registro de eventos sin permisos', async () => {
    const { access, prisma } = makeDeps();
    access.canRecord.mockResolvedValue(false);
    prisma.match.findFirst.mockResolvedValue(matchStub());
    const service = new MatchEventsService(prisma as never, access as never);

    await expect(
      service.create(TOURNAMENT_ID, 'm-1', ME, { eventType: 'goal' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('MatchEventsService.list', () => {
  it('enriquece los eventos con el jugador de su convocatoria', async () => {
    const { access, prisma } = makeDeps();
    prisma.match.findFirst.mockResolvedValue(matchStub());
    prisma.matchEvent.findMany.mockResolvedValue([
      { id: 'ev-1', matchId: 'm-1', teamRosterId: 'r-1', secondaryTeamRosterId: null, eventType: 'goal', minute: 10, period: 'regular', status: 'valid' },
    ]);
    prisma.teamRoster.findMany.mockResolvedValue([
      { id: 'r-1', jerseyNumber: 9, position: 'forward', player: { id: 'p-1', displayName: 'Pitucho', preferredPosition: 'forward' } },
    ]);
    const service = new MatchEventsService(prisma as never, access as never);

    const events = await service.list(TOURNAMENT_ID, 'm-1', ME);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ player: { displayName: 'Pitucho' }, jerseyNumber: 9 });
  });
});