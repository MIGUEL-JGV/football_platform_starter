import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OptionalUser } from '../common/decorators/optional-user.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { TournamentRolesGuard } from '../common/guards/tournament-roles.guard';
import { AddTournamentMemberDto, UpdateTournamentMemberDto } from './dto/tournament-member.dto';
import { ListTournamentsQueryDto } from './dto/list-tournaments.dto';
import { TournamentsService } from './tournaments.service';

@UseGuards(TournamentRolesGuard)
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournaments: TournamentsService) {}

  @Public()
  @Get()
  list(@Query() query: ListTournamentsQueryDto) {
    return this.tournaments.listPublic(query);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @OptionalUser() user: AuthUser | null) {
    return this.tournaments.getById(id, user);
  }

  @Post(':id/follow')
  follow(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.tournaments.follow(id, user);
  }

  @Delete(':id/follow')
  unfollow(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.tournaments.unfollow(id, user);
  }

  @Get(':id/members')
  members(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.tournaments.listMembers(id, user);
  }

  @Post(':id/members')
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddTournamentMemberDto,
  ) {
    return this.tournaments.addMember(id, user, dto);
  }

  @Patch(':id/members/:userId')
  updateMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTournamentMemberDto,
  ) {
    return this.tournaments.updateMember(id, user, userId, dto);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tournaments.removeMember(id, user, userId);
  }
}