import { Module } from '@nestjs/common';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { VenuesModule } from '../venues/venues.module';
import { MatchEventsService } from './events.service';
import { MatchEventsController } from './match-events.controller';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';
import { StandingsController } from './standings.controller';
import { StandingsService } from './standings.service';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [TournamentsModule, VenuesModule],
  controllers: [
    PhasesController,
    MatchesController,
    MatchEventsController,
    StandingsController,
    StatsController,
  ],
  providers: [PhasesService, MatchesService, MatchEventsService, StandingsService, StatsService],
  exports: [PhasesService, MatchesService, MatchEventsService, StandingsService, StatsService],
})
export class ScheduleModule {}