import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TournamentAccessService } from '../tournaments/tournament-access.service';
import { CreateMatchEventDto, UpdateMatchEventDto } from './dto/match-event.dto';

@Injectable()
export class MatchEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TournamentAccessService,
  ) {}

  async list(tournamentId: string, matchId: string, user: AuthUser | null) {
    await this.access.requireViewable(tournamentId, user);
    const match = await this.requireMatch(tournamentId, matchId);
    const events = await this.prisma.matchEvent.findMany({
      where: { matchId: match.id },
      orderBy: [{ minute: 'asc' }, { createdAt: 'asc' }],
    });
    return this.enrich(events);
  }

  async create(tournamentId: string, matchId: string, user: AuthUser, dto: CreateMatchEventDto) {
    const tournament = await this.access.requireTournament(tournamentId);
    const canRecord = await this.access.canRecord(tournament.id, tournament.organizationId, user);
    if (!canRecord) {
      throw new ForbiddenException('Permisos insuficientes para registrar eventos.');
    }
    const match = await this.requireMatch(tournamentId, matchId);
    this.assertMatchAcceptsEvents(match.status);
    if (dto.teamRosterId) {
      await this.requireRosterInMatch(match, dto.teamRosterId);
    }
    if (dto.secondaryTeamRosterId) {
      await this.requireRosterInMatch(match, dto.secondaryTeamRosterId);
    }
    const event = await this.prisma.matchEvent.create({
      data: {
        matchId: match.id,
        teamRosterId: dto.teamRosterId,
        secondaryTeamRosterId: dto.secondaryTeamRosterId,
        eventType: dto.eventType,
        minute: dto.minute,
        period: dto.period ?? 'regular',
        status: dto.status ?? 'valid',
        recordedBy: user.userId,
      },
    });
    return (await this.enrich([event]))[0];
  }

  async update(
    tournamentId: string,
    matchId: string,
    eventId: string,
    user: AuthUser,
    dto: UpdateMatchEventDto,
  ) {
    const tournament = await this.access.requireTournament(tournamentId);
    const canRecord = await this.access.canRecord(tournament.id, tournament.organizationId, user);
    if (!canRecord) {
      throw new ForbiddenException('Permisos insuficientes para modificar eventos.');
    }
    const match = await this.requireMatch(tournamentId, matchId);
    const event = await this.requireEvent(match.id, eventId);
    if (dto.teamRosterId) {
      await this.requireRosterInMatch(match, dto.teamRosterId);
    }
    if (dto.secondaryTeamRosterId) {
      await this.requireRosterInMatch(match, dto.secondaryTeamRosterId);
    }
    const updated = await this.prisma.matchEvent.update({
      where: { id: event.id },
      data: {
        ...(dto.eventType !== undefined && { eventType: dto.eventType }),
        ...(dto.minute !== undefined && { minute: dto.minute }),
        ...(dto.period !== undefined && { period: dto.period }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.teamRosterId !== undefined && { teamRosterId: dto.teamRosterId }),
        ...(dto.secondaryTeamRosterId !== undefined && {
          secondaryTeamRosterId: dto.secondaryTeamRosterId,
        }),
      },
    });
    return (await this.enrich([updated]))[0];
  }

  async remove(tournamentId: string, matchId: string, eventId: string, user: AuthUser) {
    const tournament = await this.access.requireTournament(tournamentId);
    const canRecord = await this.access.canRecord(tournament.id, tournament.organizationId, user);
    if (!canRecord) {
      throw new ForbiddenException('Permisos insuficientes para eliminar eventos.');
    }
    const match = await this.requireMatch(tournamentId, matchId);
    const event = await this.requireEvent(match.id, eventId);
    await this.prisma.matchEvent.delete({ where: { id: event.id } });
    return { removed: true };
  }

  private async enrich<
    T extends { teamRosterId: string | null; secondaryTeamRosterId: string | null },
  >(events: T[]) {
    const rosterIds = [
      ...new Set(
        events
          .flatMap((event) => [event.teamRosterId, event.secondaryTeamRosterId])
          .filter((id): id is string => id !== null && id !== undefined),
      ),
    ];
    const rosters =
      rosterIds.length > 0
        ? await this.prisma.teamRoster.findMany({
            where: { id: { in: rosterIds } },
            select: {
              id: true,
              jerseyNumber: true,
              position: true,
              player: { select: { id: true, displayName: true, preferredPosition: true } },
            },
          })
        : [];
    const byId = new Map(rosters.map((roster) => [roster.id, roster]));
    return events.map((event) => {
      const roster = event.teamRosterId ? byId.get(event.teamRosterId) : undefined;
      const secondary = event.secondaryTeamRosterId
        ? byId.get(event.secondaryTeamRosterId)
        : undefined;
      return {
        ...event,
        player: roster ? roster.player : null,
        jerseyNumber: roster ? roster.jerseyNumber : null,
        secondaryPlayer: secondary ? secondary.player : null,
        secondaryJerseyNumber: secondary ? secondary.jerseyNumber : null,
      };
    });
  }

  private assertMatchAcceptsEvents(status: string) {
    const allowed = ['scheduled', 'postponed', 'in_progress', 'pending_validation', 'finished'];
    if (!allowed.includes(status)) {
      throw new ConflictException('El partido no admite eventos.');
    }
  }

  private async requireMatch(tournamentId: string, matchId: string) {
    const match = await this.prisma.match.findFirst({ where: { id: matchId, tournamentId } });
    if (!match) {
      throw new NotFoundException('Partido no encontrado.');
    }
    return match;
  }

  private async requireEvent(matchId: string, eventId: string) {
    const event = await this.prisma.matchEvent.findFirst({
      where: { id: eventId, matchId },
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado.');
    }
    return event;
  }

  private async requireRosterInMatch(
    match: { homeTournamentTeamId: string; awayTournamentTeamId: string },
    teamRosterId: string,
  ) {
    const roster = await this.prisma.teamRoster.findUnique({ where: { id: teamRosterId } });
    if (!roster) {
      throw new NotFoundException('Convocatoria no encontrada.');
    }
    const inMatch =
      roster.tournamentTeamId === match.homeTournamentTeamId ||
      roster.tournamentTeamId === match.awayTournamentTeamId;
    if (!inMatch) {
      throw new ConflictException('El integrante no pertenece a ninguno de los equipos del partido.');
    }
    return roster;
  }
}