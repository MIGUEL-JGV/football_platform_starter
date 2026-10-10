import { Module } from '@nestjs/common';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { VenuesModule } from '../venues/venues.module';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';

@Module({
  imports: [TournamentsModule, VenuesModule],
  controllers: [PhasesController, MatchesController],
  providers: [PhasesService, MatchesService],
  exports: [PhasesService, MatchesService],
})
export class ScheduleModule {}