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
  Query,
  UseGuards,
} from '@nestjs/common';
import { OptionalUser } from '../common/decorators/optional-user.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CreateMatchDto, ListMatchesQueryDto, RecordResultDto, UpdateMatchDto } from './dto/match.dto';
import { MatchesService } from './matches.service';

@Controller('tournaments/:id/matches')
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(
    @Param('id', ParseUUIDPipe) id: string,
    @OptionalUser() user: AuthUser | null,
    @Query() query: ListMatchesQueryDto,
  ) {
    return this.matches.list(id, user, query);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':matchId')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @OptionalUser() user: AuthUser | null,
  ) {
    return this.matches.getById(id, matchId, user);
  }

  @Post()
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMatchDto,
  ) {
    return this.matches.create(id, user, dto);
  }

  @Patch(':matchId')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMatchDto,
  ) {
    return this.matches.update(id, matchId, user, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':matchId/result')
  recordResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: RecordResultDto,
  ) {
    return this.matches.recordResult(id, matchId, user, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':matchId/result/validate')
  validateResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.matches.validateResult(id, matchId, user);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':matchId/result/clear')
  clearResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.matches.clearResult(id, matchId, user);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':matchId')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.matches.remove(id, matchId, user);
  }
}