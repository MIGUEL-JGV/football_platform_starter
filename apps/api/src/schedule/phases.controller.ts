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
import {
  CreateMatchdayDto,
  CreatePhaseDto,
  UpdateMatchdayDto,
  UpdatePhaseDto,
} from './dto/phase.dto';
import { PhasesService } from './phases.service';

@UseGuards(TournamentRolesGuard)
@Controller('tournaments/:id/phases')
export class PhasesController {
  constructor(private readonly phases: PhasesService) {}

  @Get()
  list(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.phases.list(id, user);
  }

  @Post()
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePhaseDto,
  ) {
    return this.phases.create(id, user, dto);
  }

  @Get(':phaseId')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.phases.getById(id, phaseId, user);
  }

  @Patch(':phaseId')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePhaseDto,
  ) {
    return this.phases.update(id, phaseId, user, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':phaseId')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.phases.remove(id, phaseId, user);
  }

  @Get(':phaseId/matchdays')
  matchdays(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.phases.listMatchdays(id, phaseId, user);
  }

  @Post(':phaseId/matchdays')
  createMatchday(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMatchdayDto,
  ) {
    return this.phases.createMatchday(id, phaseId, user, dto);
  }

  @Patch(':phaseId/matchdays/:matchdayId')
  updateMatchday(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Param('matchdayId', ParseUUIDPipe) matchdayId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMatchdayDto,
  ) {
    return this.phases.updateMatchday(id, phaseId, matchdayId, user, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':phaseId/matchdays/:matchdayId')
  removeMatchday(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Param('matchdayId', ParseUUIDPipe) matchdayId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.phases.removeMatchday(id, phaseId, matchdayId, user);
  }
}