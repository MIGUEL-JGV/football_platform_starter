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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CreateTeamDto, ListTeamsQueryDto, UpdateTeamDto } from './dto/team.dto';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Public()
  @Get()
  list(@Query() query: ListTeamsQueryDto) {
    return this.teams.listPublic(query);
  }

  @Get('me')
  mine(@CurrentUser() user: AuthUser, @Query() query: ListTeamsQueryDto) {
    return this.teams.listMine(user, query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    return this.teams.create(user, dto);
  }

  @Public()
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.teams.getById(id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teams.update(user, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.teams.remove(user, id);
  }
}