import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationRoles } from '../common/decorators/organization-roles.decorator';
import { OrganizationRolesGuard } from '../common/guards/organization-roles.guard';
import { CreateTournamentDto, UpdateTournamentDto } from './dto/tournament.dto';
import { TournamentsService } from './tournaments.service';

@UseGuards(OrganizationRolesGuard)
@Controller('organizations/:organizationId/tournaments')
export class OrgTournamentsController {
  constructor(private readonly tournaments: TournamentsService) {}

  @OrganizationRoles('owner', 'admin')
  @Post()
  create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTournamentDto,
  ) {
    return this.tournaments.create(organizationId, user, dto);
  }

  @Patch(':tournamentId')
  update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTournamentDto,
  ) {
    return this.tournaments.update(organizationId, tournamentId, user, dto);
  }

  @OrganizationRoles('owner', 'admin')
  @Delete(':tournamentId')
  remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('tournamentId', ParseUUIDPipe) tournamentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tournaments.remove(organizationId, tournamentId, user);
  }
}