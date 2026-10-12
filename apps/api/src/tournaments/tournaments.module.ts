import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
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
    InvitationsController,
  ],
  providers: [
    TournamentsService,
    RegistrationsService,
    TournamentAccessService,
    InvitationsService,
  ],
  exports: [
    TournamentsService,
    RegistrationsService,
    TournamentAccessService,
    InvitationsService,
  ],
})
export class TournamentsModule {}