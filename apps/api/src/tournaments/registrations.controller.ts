import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationToken } from '../common/decorators/authorization-token.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { TournamentRolesGuard } from '../common/guards/tournament-roles.guard';
import { ApplyEntryDto, RejectEntryDto } from './dto/tournament-entry.dto';
import { RegistrationsService } from './registrations.service';

@UseGuards(TournamentRolesGuard)
@Controller('tournaments/:id/entries')
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Get()
  list(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.registrations.listEntries(id, user);
  }

  @Get(':entryId')
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registrations.getEntryDetail(id, entryId, user);
  }

  @Post()
  apply(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ApplyEntryDto,
    @AuthorizationToken() authorizationToken?: string,
  ) {
    return this.registrations.apply(id, user, dto, authorizationToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':entryId/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: AuthUser,
    @AuthorizationToken() authorizationToken?: string,
  ) {
    return this.registrations.approve(id, entryId, user, authorizationToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':entryId/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: RejectEntryDto,
    @AuthorizationToken() authorizationToken?: string,
  ) {
    return this.registrations.reject(id, entryId, user, dto.reason, authorizationToken);
  }

  @Delete(':entryId')
  withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @CurrentUser() user: AuthUser,
    @AuthorizationToken() authorizationToken?: string,
  ) {
    return this.registrations.withdraw(id, entryId, user, authorizationToken);
  }
}