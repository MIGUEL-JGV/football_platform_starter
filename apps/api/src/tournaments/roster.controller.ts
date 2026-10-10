import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { TournamentRolesGuard } from '../common/guards/tournament-roles.guard';
import { AddRosterPlayerDto, UpdateRosterPlayerDto } from './dto/tournament-roster.dto';
import { RegistrationsService } from './registrations.service';

@UseGuards(TournamentRolesGuard)
@Controller('tournaments/:id/entries/:entryId/roster')
export class RosterController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Get()
  list(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registrations.listRoster(id, entryId, user);
  }

  @Post()
  add(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddRosterPlayerDto,
  ) {
    return this.registrations.addRosterPlayer(id, entryId, user, dto);
  }

  @Patch(':rosterId')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Param('rosterId', ParseUUIDPipe) rosterId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateRosterPlayerDto,
  ) {
    return this.registrations.updateRosterPlayer(id, entryId, rosterId, user, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':rosterId')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Param('rosterId', ParseUUIDPipe) rosterId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registrations.removeRosterPlayer(id, entryId, rosterId, user);
  }
}