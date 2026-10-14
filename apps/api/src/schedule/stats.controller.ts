import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { OptionalUser } from '../common/decorators/optional-user.decorator';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { StatsQueryDto } from './dto/stats.dto';
import { StatsService } from './stats.service';

@Public()
@UseGuards(OptionalJwtAuthGuard)
@Controller('tournaments/:id/stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @OptionalUser() user: AuthUser | null,
    @Query() query: StatsQueryDto,
  ) {
    return this.stats.getStats(id, user, query);
  }
}
