import { Module } from '@nestjs/common';
import { OrgTournamentsController } from './org-tournaments.controller';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { RosterController } from './roster.controller';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

@Module({
  controllers: [
    TournamentsController,
    OrgTournamentsController,
    RegistrationsController,
    RosterController,
  ],
  providers: [TournamentsService, RegistrationsService],
  exports: [TournamentsService, RegistrationsService],
})
export class TournamentsModule {}