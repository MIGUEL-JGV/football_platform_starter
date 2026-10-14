import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TournamentAccessService } from '../tournaments/tournament-access.service';
import { StatsQueryDto } from './dto/stats.dto';

const SCORER_TYPES = new Set(['goal', 'penalty_goal']);

export interface PlayerAgg {
  playerId: string;
  playerName: string;
  jerseyNumber: number | null;
  entryId: string;
  teamId: string;
  teamName: string;
  goals: number;
  penaltyGoals: number;
  ownGoals: number;
  assists: number;
  yellow: number;
  secondYellow: number;
  red: number;
  foulsCommitted: number;
  foulsReceived: number;
  saves: number;
}

export interface TeamAgg {
  entryId: string;
  teamId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  cleanSheets: number;
  foulsCommitted: number;
  foulsReceived: number;
  yellow: number;
  red: number;
}

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TournamentAccessService,
  ) {}

  async getStats(tournamentId: string, user: AuthUser | null, query: StatsQueryDto) {
    const tournament = await this.access.requireViewable(tournamentId, user);

    let phaseName: string | null = null;
    let phaseId: string | null = null;
    if (query.phaseId) {
      const phase = await this.prisma.phase.findFirst({
        where: { id: query.phaseId, tournamentId },
        select: { id: true, name: true },
      });
      if (!phase) {
        throw new NotFoundException('Fase no encontrada.');
      }
      phaseId = phase.id;
      phaseName = phase.name;
    }

    const scope = { tournamentId, ...(phaseId ? { phaseId } : {}) };

    const [entries, finishedMatches, totalMatches] = await Promise.all([
      this.prisma.tournamentTeam.findMany({
        where: { tournamentId, registrationStatus: 'approved' },
        select: {
          id: true,
          team: { select: { id: true, name: true, slug: true, logoUrl: true } },
        },
      }),
      this.prisma.match.findMany({
        where: { ...scope, status: 'finished', homeScore: { not: null }, awayScore: { not: null } },
        select: {
          id: true,
          homeTournamentTeamId: true,
          awayTournamentTeamId: true,
          homeScore: true,
          awayScore: true,
        },
      }),
      this.prisma.match.count({ where: scope }),
    ]);

    const matchIds = finishedMatches.map((match) => match.id);
    const events =
      matchIds.length > 0
        ? await this.prisma.matchEvent.findMany({
            where: { matchId: { in: matchIds }, status: 'valid' },
            select: {
              eventType: true,
              teamRosterId: true,
              secondaryTeamRosterId: true,
            },
          })
        : [];

    const rosterIds = [
      ...new Set(
        events
          .flatMap((event) => [event.teamRosterId, event.secondaryTeamRosterId])
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const rosters =
      rosterIds.length > 0
        ? await this.prisma.teamRoster.findMany({
            where: { id: { in: rosterIds } },
            select: {
              id: true,
              jerseyNumber: true,
              tournamentTeamId: true,
              player: { select: { id: true, displayName: true } },
            },
          })
        : [];
    const rosterById = new Map(rosters.map((roster) => [roster.id, roster]));

    const teams = new Map<string, TeamAgg>();
    for (const entry of entries) {
      teams.set(entry.id, {
        entryId: entry.id,
        teamId: entry.team.id,
        name: entry.team.name,
        slug: entry.team.slug,
        logoUrl: entry.team.logoUrl,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
        cleanSheets: 0,
        foulsCommitted: 0,
        foulsReceived: 0,
        yellow: 0,
        red: 0,
      });
    }

    let goalsTotal = 0;
    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;

    for (const match of finishedMatches) {
      const home = teams.get(match.homeTournamentTeamId);
      const away = teams.get(match.awayTournamentTeamId);
      const homeScore = match.homeScore ?? 0;
      const awayScore = match.awayScore ?? 0;
      goalsTotal += homeScore + awayScore;
      if (!home || !away) {
        continue;
      }
      home.played += 1;
      away.played += 1;
      home.gf += homeScore;
      home.ga += awayScore;
      away.gf += awayScore;
      away.ga += homeScore;
      if (homeScore > awayScore) {
        home.won += 1;
        away.lost += 1;
        home.points += tournament.pointsWin;
        away.points += tournament.pointsLoss;
        homeWins += 1;
      } else if (homeScore < awayScore) {
        away.won += 1;
        home.lost += 1;
        away.points += tournament.pointsWin;
        home.points += tournament.pointsLoss;
        awayWins += 1;
      } else {
        home.drawn += 1;
        away.drawn += 1;
        home.points += tournament.pointsDraw;
        away.points += tournament.pointsDraw;
        draws += 1;
      }
      if (awayScore === 0) home.cleanSheets += 1;
      if (homeScore === 0) away.cleanSheets += 1;
    }

    const players = new Map<string, PlayerAgg>();
    const playerFor = (rosterId: string | null): PlayerAgg | null => {
      if (!rosterId) return null;
      const roster = rosterById.get(rosterId);
      if (!roster) return null;
      let agg = players.get(roster.player.id);
      if (!agg) {
        const entry = teams.get(roster.tournamentTeamId);
        agg = {
          playerId: roster.player.id,
          playerName: roster.player.displayName,
          jerseyNumber: roster.jerseyNumber,
          entryId: roster.tournamentTeamId,
          teamId: entry?.teamId ?? '',
          teamName: entry?.name ?? '',
          goals: 0,
          penaltyGoals: 0,
          ownGoals: 0,
          assists: 0,
          yellow: 0,
          secondYellow: 0,
          red: 0,
          foulsCommitted: 0,
          foulsReceived: 0,
          saves: 0,
        };
        players.set(roster.player.id, agg);
      }
      return agg;
    };

    for (const event of events) {
      const primary = playerFor(event.teamRosterId);
      const secondary = playerFor(event.secondaryTeamRosterId);
      const primaryTeam = primary ? teams.get(primary.entryId) : undefined;
      const secondaryTeam = secondary ? teams.get(secondary.entryId) : undefined;

      if (SCORER_TYPES.has(event.eventType) && primary) {
        primary.goals += 1;
        if (event.eventType === 'penalty_goal') {
          primary.penaltyGoals += 1;
        }
      }
      if (event.eventType === 'goal' && secondary) {
        secondary.assists += 1;
      }
      if (event.eventType === 'own_goal' && primary) {
        primary.ownGoals += 1;
      }
      if (event.eventType === 'assist' && primary) {
        primary.assists += 1;
      }
      if (event.eventType === 'yellow_card' && primary) {
        primary.yellow += 1;
      }
      if (event.eventType === 'second_yellow' && primary) {
        primary.secondYellow += 1;
      }
      if (event.eventType === 'red_card' && primary) {
        primary.red += 1;
      }
      if (event.eventType === 'foul') {
        if (primary) primary.foulsCommitted += 1;
        if (secondary) secondary.foulsReceived += 1;
      }
      if ((event.eventType === 'save' || event.eventType === 'penalty_saved') && primary) {
        primary.saves += 1;
      }

      if (primaryTeam) {
        if (event.eventType === 'yellow_card' || event.eventType === 'second_yellow') {
          primaryTeam.yellow += 1;
        }
        if (event.eventType === 'red_card') {
          primaryTeam.red += 1;
        }
        if (event.eventType === 'foul') {
          primaryTeam.foulsCommitted += 1;
        }
      }
      if (secondaryTeam && event.eventType === 'foul') {
        secondaryTeam.foulsReceived += 1;
      }
    }

    const playerList = [...players.values()];

    const scorers = playerList
      .filter((player) => player.goals > 0)
      .sort(
        (a, b) =>
          b.goals - a.goals ||
          a.penaltyGoals - b.penaltyGoals ||
          a.playerName.localeCompare(b.playerName),
      )
      .map((player, index) => ({ rank: index + 1, ...player }));

    const assists = playerList
      .filter((player) => player.assists > 0)
      .sort((a, b) => b.assists - a.assists || a.playerName.localeCompare(b.playerName))
      .map((player, index) => ({ rank: index + 1, ...player }));

    const discipline = playerList
      .filter(
        (player) =>
          player.yellow > 0 ||
          player.secondYellow > 0 ||
          player.red > 0 ||
          player.foulsCommitted > 0 ||
          player.foulsReceived > 0,
      )
      .sort(
        (a, b) =>
          b.red - a.red ||
          b.secondYellow - a.secondYellow ||
          b.yellow - a.yellow ||
          b.foulsCommitted - a.foulsCommitted ||
          a.playerName.localeCompare(b.playerName),
      );

    const teamList = [...teams.values()]
      .map((team) => ({ ...team, gd: team.gf - team.ga }))
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.gd - a.gd ||
          b.gf - a.gf ||
          a.name.localeCompare(b.name),
      );

    return {
      tournamentId: tournament.id,
      phaseId,
      phaseName,
      counts: {
        matchesTotal: totalMatches,
        matchesPlayed: finishedMatches.length,
        matchesPending: totalMatches - finishedMatches.length,
        goalsTotal,
        avgGoalsPerMatch:
          finishedMatches.length > 0
            ? Math.round((goalsTotal / finishedMatches.length) * 100) / 100
            : null,
        homeWins,
        draws,
        awayWins,
      },
      scorers,
      assists,
      discipline,
      teams: teamList,
    };
  }
}
