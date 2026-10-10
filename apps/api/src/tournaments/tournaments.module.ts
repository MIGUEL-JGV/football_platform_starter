import { Module } from '@nestjs/common';
import { OrgTournamentsController } from './org-tournaments.controller';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { RosterController } from './roster.controller';
import { TournamentAccessService } from './tournament-access.service';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

@Module({
  controllers: [
    TournamentsController,
    OrgTournamentsController,
    RegistrationsController,
    RosterController,
  ],
  providers: [TournamentsService, RegistrationsService, TournamentAccessService],
  exports: [TournamentsService, RegistrationsService, TournamentAccessService],
})
export class TournamentsModule {}