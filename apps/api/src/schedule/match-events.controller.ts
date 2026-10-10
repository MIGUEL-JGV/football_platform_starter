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
import { OptionalUser } from '../common/decorators/optional-user.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CreateMatchEventDto, UpdateMatchEventDto } from './dto/match-event.dto';
import { MatchEventsService } from './events.service';

@Controller('tournaments/:id/matches/:matchId/events')
export class MatchEventsController {
  constructor(private readonly events: MatchEventsService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @OptionalUser() user: AuthUser | null,
  ) {
    return this.events.list(id, matchId, user);
  }

  @Post()
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMatchEventDto,
  ) {
    return this.events.create(id, matchId, user, dto);
  }

  @Patch(':eventId')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMatchEventDto,
  ) {
    return this.events.update(id, matchId, eventId, user, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':eventId')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.events.remove(id, matchId, eventId, user);
  }
}