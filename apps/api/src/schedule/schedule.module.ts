import { Module } from '@nestjs/common';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { VenuesModule } from '../venues/venues.module';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';
import { StandingsController } from './standings.controller';
import { StandingsService } from './standings.service';

@Module({
  imports: [TournamentsModule, VenuesModule],
  controllers: [PhasesController, MatchesController, StandingsController],
  providers: [PhasesService, MatchesService, StandingsService],
  exports: [PhasesService, MatchesService, StandingsService],
})
export class ScheduleModule {}