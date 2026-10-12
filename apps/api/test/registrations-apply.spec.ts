import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { RegistrationsService } from '../src/tournaments/registrations.service';
import { ME, TOURNAMENT_ID, tournamentStub } from './helpers';
import type { ApplyEntryDto } from '../src/tournaments/dto/tournament-entry.dto';

const CLUB_PLAYER = 'p-1';
const FOREIGN_PLAYER = 'p-999';

function makeApplyDto(overrides: Partial<ApplyEntryDto> = {}): ApplyEntryDto {
  return {
    teamId: 'team-1',
    players: [
      { playerId: CLUB_PLAYER, jerseyNumber: 9, position: 'forward' },
    ],
    ...overrides,
  } as ApplyEntryDto;
}

function makePrisma() {
  return {
    tournament: { findUnique: vi.fn() },
    team: { findUnique: vi.fn() },
    tournamentTeam: { findUnique: vi.fn(), findFirst: vi.fn(), count: vi.fn(), update: vi.fn(), delete: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    player: { findMany: vi.fn() },
    teamRoster: { deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    consentRecord: { deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(async (callback: (tx: never) => Promise<unknown>) => callback({} as never)),
  };
}

function makeInvitations(requireUsable: (() => Promise<unknown>) | null = null) {
  return {
    requireUsable: vi.fn(requireUsable ?? (async () => null as unknown)),
    consume: vi.fn(),
  };
}

function playersOf(dateOfBirth: Date) {
  return [{ id: CLUB_PLAYER, displayName: 'Pitucho', dateOfBirth }];
}

async function rejected(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as Error;
  }
  throw new Error('La llamada debió lanzar un error.');
}

describe('RegistrationsService.apply', () => {
  it('rechaza jugadores que no pertenecen al club del equipo', async () => {
    const prisma = makePrisma();
    const invitations = makeInvitations();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub());
    prisma.team.findUnique.mockResolvedValue({ id: 'team-1', createdBy: ME.userId });
    prisma.tournamentTeam.findUnique.mockResolvedValue(null);
    prisma.player.findMany
      .mockResolvedValueOnce([{ id: CLUB_PLAYER }])
      .mockResolvedValueOnce(playersOf(new Date(1990, 0, 1)));
    const service = new RegistrationsService(prisma as never, invitations as never);

    const error = await rejected(
      service.apply(TOURNAMENT_ID, ME, makeApplyDto({ players: [{ playerId: FOREIGN_PLAYER }] })),
    );
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.message).toContain('pertenecer al club');
  });

  it('rechaza a un menor sin consentimiento del tutor', async () => {
    const prisma = makePrisma();
    const invitations = makeInvitations();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub());
    prisma.team.findUnique.mockResolvedValue({ id: 'team-1', createdBy: ME.userId });
    prisma.tournamentTeam.findUnique.mockResolvedValue(null);
    prisma.player.findMany
      .mockResolvedValueOnce([{ id: CLUB_PLAYER }])
      .mockResolvedValueOnce(playersOf(new Date(2012, 1, 1)));
    const service = new RegistrationsService(prisma as never, invitations as never);

    const error = await rejected(
      service.apply(TOURNAMENT_ID, ME, makeApplyDto({ players: [{ playerId: CLUB_PLAYER, jerseyNumber: 9 }] })),
    );
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.message).toContain('es menor de edad');
    expect(error.message).toContain('Pitucho');
  });

  it('acepta a un menor con consentimiento y registra el roster', async () => {
    const prisma = makePrisma();
    const invitations = makeInvitations();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub());
    prisma.team.findUnique.mockResolvedValue({ id: 'team-1', createdBy: ME.userId });
    prisma.tournamentTeam.findUnique
      .mockResolvedValueOnce(null) // existing check
      .mockResolvedValue({ id: 'entry-1', _count: { roster: 1 }, registrationStatus: 'pending' });
    prisma.player.findMany
      .mockResolvedValueOnce([{ id: CLUB_PLAYER }])
      .mockResolvedValueOnce(playersOf(new Date(2012, 1, 1)));
    prisma.$transaction.mockImplementation(
      async (callback: (tx: never) => Promise<unknown>) =>
        callback({
          tournamentTeam: { create: vi.fn().mockResolvedValue({ id: 'entry-1' }) },
          teamRoster: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), createMany: vi.fn().mockResolvedValue({ count: 1 }) },
          consentRecord: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), createMany: vi.fn().mockResolvedValue({ count: 1 }) },
        } as never),
    );
    const service = new RegistrationsService(prisma as never, invitations as never);

    const result = await service.apply(
      TOURNAMENT_ID,
      ME,
      makeApplyDto({
        players: [
          {
            playerId: CLUB_PLAYER,
            jerseyNumber: 9,
            position: 'forward',
            consent: { guardianName: 'Tutor Uno', guardianRelation: 'padre', guardianDocument: 'INE-123' },
          },
        ],
      }),
    );

    expect(result).toMatchObject({ id: 'entry-1' });
    expect(invitations.consume).not.toHaveBeenCalled();
  });

  it('rechaza equipos ajenos', async () => {
    const prisma = makePrisma();
    const invitations = makeInvitations();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub());
    prisma.team.findUnique.mockResolvedValue({ id: 'team-1', createdBy: 'someone-else' });
    const service = new RegistrationsService(prisma as never, invitations as never);

    await expect(service.apply(TOURNAMENT_ID, ME, makeApplyDto())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rechaza un torneo privado sin invitación', async () => {
    const prisma = makePrisma();
    const invitations = makeInvitations();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub({ visibility: 'private' }));
    prisma.team.findUnique.mockResolvedValue({ id: 'team-1', createdBy: ME.userId });
    const service = new RegistrationsService(prisma as never, invitations as never);

    await expect(service.apply(TOURNAMENT_ID, ME, makeApplyDto())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rechaza inscribir dos veces a un equipo ya inscrito', async () => {
    const prisma = makePrisma();
    const invitations = makeInvitations();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub());
    prisma.team.findUnique.mockResolvedValue({ id: 'team-1', createdBy: ME.userId });
    prisma.tournamentTeam.findUnique.mockResolvedValue({ id: 'entry-1', registrationStatus: 'pending' });
    const service = new RegistrationsService(prisma as never, invitations as never);

    await expect(service.apply(TOURNAMENT_ID, ME, makeApplyDto())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('detecta dorsal repetido en la plantilla', async () => {
    const prisma = makePrisma();
    const invitations = makeInvitations();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub());
    prisma.team.findUnique.mockResolvedValue({ id: 'team-1', createdBy: ME.userId });
    prisma.tournamentTeam.findUnique.mockResolvedValue(null);
    prisma.player.findMany
      .mockResolvedValueOnce([{ id: CLUB_PLAYER }, { id: 'other-club-player' }])
      .mockResolvedValueOnce([
        { id: CLUB_PLAYER, displayName: 'A', dateOfBirth: new Date(1990, 0, 1) },
        { id: 'other-club-player', displayName: 'B', dateOfBirth: new Date(1991, 0, 1) },
      ]);
    const service = new RegistrationsService(prisma as never, invitations as never);

    const error = await rejected(
      service.apply(
        TOURNAMENT_ID,
        ME,
        makeApplyDto({
          players: [
            { playerId: CLUB_PLAYER, jerseyNumber: 9 },
            { playerId: 'other-club-player', jerseyNumber: 9 },
          ],
        }),
      ),
    );
    expect(error).toBeInstanceOf(ConflictException);
    expect(error.message).toContain('No se puede repetir el número de dorsal');
  });

  it('detecta un jugador repetido en la plantilla', async () => {
    const prisma = makePrisma();
    const invitations = makeInvitations();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub());
    prisma.team.findUnique.mockResolvedValue({ id: 'team-1', createdBy: ME.userId });
    prisma.tournamentTeam.findUnique.mockResolvedValue(null);
    prisma.player.findMany
      .mockResolvedValueOnce([{ id: CLUB_PLAYER }])
      .mockResolvedValueOnce(playersOf(new Date(1990, 0, 1)));
    const service = new RegistrationsService(prisma as never, invitations as never);

    const error = await rejected(
      service.apply(
        TOURNAMENT_ID,
        ME,
        makeApplyDto({
          players: [
            { playerId: CLUB_PLAYER, jerseyNumber: 9 },
            { playerId: CLUB_PLAYER, jerseyNumber: 10 },
          ],
        }),
      ),
    );
    expect(error).toBeInstanceOf(BadRequestException);
  });
});

describe('RegistrationsService.reject/approve', () => {
  function makeManagerPrisma() {
    const prisma = makePrisma() as ReturnType<typeof makePrisma> & {
      tournamentMember: { findUnique: ReturnType<typeof vi.fn> };
      organizationMember: { findUnique: ReturnType<typeof vi.fn> };
    };
    prisma.tournamentMember = { findUnique: vi.fn().mockResolvedValue({ status: 'active', role: 'manager' }) };
    prisma.organizationMember = { findUnique: vi.fn().mockResolvedValue(null) };
    return prisma;
  }

  it('reject guarda el motivo, quién y cuándo', async () => {
    const prisma = makeManagerPrisma();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub());
    prisma.tournamentTeam.findFirst.mockResolvedValue({ id: 'entry-1', tournamentId: TOURNAMENT_ID, registrationStatus: 'pending' });
    prisma.tournamentTeam.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'entry-1', ...data }),
    );
    const service = new RegistrationsService(prisma as never, makeInvitations() as never);

    const result = await service.reject(TOURNAMENT_ID, 'entry-1', ME, 'Plantilla incompleta');
    expect(result).toMatchObject({
      registrationStatus: 'rejected',
      reviewNote: 'Plantilla incompleta',
      reviewedBy: ME.userId,
    });
  });

  it('reject sin motivo deja reviewNote en null', async () => {
    const prisma = makeManagerPrisma();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub());
    prisma.tournamentTeam.findFirst.mockResolvedValue({ id: 'entry-1', registrationStatus: 'pending' });
    prisma.tournamentTeam.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'entry-1', ...data }),
    );
    const service = new RegistrationsService(prisma as never, makeInvitations() as never);

    const result = await service.reject(TOURNAMENT_ID, 'entry-1', ME);
    expect(result.reviewNote).toBeNull();
  });

  it('approve limpia reviewNote y solo acepta pendientes', async () => {
    const prisma = makeManagerPrisma();
    prisma.tournament.findUnique.mockResolvedValue(tournamentStub());
    prisma.tournamentTeam.findFirst.mockResolvedValue({ id: 'entry-1', registrationStatus: 'finished' as never });
    prisma.tournamentTeam.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'entry-1', ...data }),
    );
    const service = new RegistrationsService(prisma as never, makeInvitations() as never);

    await expect(service.approve(TOURNAMENT_ID, 'entry-1', ME)).rejects.toBeInstanceOf(
      ConflictException,
    );

    prisma.tournamentTeam.findFirst.mockResolvedValue({ id: 'entry-2', registrationStatus: 'pending' });
    const result = await service.approve(TOURNAMENT_ID, 'entry-2', ME);
    expect(result).toMatchObject({ registrationStatus: 'approved', reviewNote: null, approvedBy: ME.userId });
  });
});