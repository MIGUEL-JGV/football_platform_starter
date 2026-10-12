import { Injectable, NotFoundException } from '@nestjs/common';
import { TournamentVisibility } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TournamentAccessService } from '../tournaments/tournament-access.service';
import { StandingsQueryDto } from './dto/match.dto';

@Injectable()
export class StandingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TournamentAccessService,
  ) {}

  async getStandings(tournamentId: string, user: AuthUser | null, query: StandingsQueryDto) {
    const tournament = await this.access.requireTournament(tournamentId);
    if (tournament.visibility !== TournamentVisibility.public) {
      if (!user) {
        throw new NotFoundException('Torneo no encontrado.');
      }
      const canView = await this.access.canView(tournament.id, tournament.organizationId, user);
      if (!canView) {
        throw new NotFoundException('Torneo no encontrado.');
      }
    }
    const phase = await this.prisma.phase.findFirst({
      where: { id: query.phaseId, tournamentId },
    });
    if (!phase) {
      throw new NotFoundException('Fase no encontrada.');
    }
    const [matches, entries] = await Promise.all([
      this.prisma.match.findMany({
        where: { phaseId: phase.id, status: 'finished', homeScore: { not: null } },
        select: {
          homeTournamentTeamId: true,
          awayTournamentTeamId: true,
          homeScore: true,
          awayScore: true,
        },
        orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.tournamentTeam.findMany({
        where: { tournamentId, registrationStatus: 'approved' },
        select: { id: true, team: { select: { id: true, name: true, slug: true, logoUrl: true } } },
      }),
    ]);

    const rows = entries.map((entry) => ({
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
      points: 0,
    }));
    const table = new Map(rows.map((row) => [row.entryId, row]));
    const forms = new Map<string, string[]>(rows.map((row) => [row.entryId, []]));

    for (const match of matches) {
      const home = table.get(match.homeTournamentTeamId);
      const away = table.get(match.awayTournamentTeamId);
      if (!home || !away) {
        continue;
      }
      const homeScore = match.homeScore ?? 0;
      const awayScore = match.awayScore ?? 0;
      const homeForm = forms.get(match.homeTournamentTeamId);
      const awayForm = forms.get(match.awayTournamentTeamId);
      if (homeForm && homeForm.length < 5) {
        homeForm.push(homeScore > awayScore ? 'G' : homeScore < awayScore ? 'P' : 'E');
      }
      if (awayForm && awayForm.length < 5) {
        awayForm.push(awayScore > homeScore ? 'G' : awayScore < homeScore ? 'P' : 'E');
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
      } else if (homeScore < awayScore) {
        away.won += 1;
        home.lost += 1;
        away.points += tournament.pointsWin;
        home.points += tournament.pointsLoss;
      } else {
        home.drawn += 1;
        away.drawn += 1;
        home.points += tournament.pointsDraw;
        away.points += tournament.pointsDraw;
      }
    }

    const items = rows
      .map((row) => ({ ...row, gd: row.gf - row.ga, form: forms.get(row.entryId) ?? [] }))
      .sort(
        (a, b) =>
          b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name),
      )
      .map((row, index) => ({ rank: index + 1, ...row }));

    return {
      tournamentId: tournament.id,
      phaseId: phase.id,
      phaseName: phase.name,
      phaseType: phase.phaseType,
      items,
    };
  }
}