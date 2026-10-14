import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { OptionalUser } from '../common/decorators/optional-user.decorator';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { StandingsQueryDto } from './dto/match.dto';
import { StandingsService } from './standings.service';

@Public()
@UseGuards(OptionalJwtAuthGuard)
@Controller('tournaments/:id/standings')
export class StandingsController {
  constructor(private readonly standings: StandingsService) {}

  @Get()
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @OptionalUser() user: AuthUser | null,
    @Query() query: StandingsQueryDto,
  ) {
    return this.standings.getStandings(id, user, query);
  }
}