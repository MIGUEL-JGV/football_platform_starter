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

@Module({
  imports: [TournamentsModule, VenuesModule],
  controllers: [PhasesController, MatchesController, MatchEventsController, StandingsController],
  providers: [PhasesService, MatchesService, MatchEventsService, StandingsService],
  exports: [PhasesService, MatchesService, MatchEventsService, StandingsService],
})
export class ScheduleModule {}