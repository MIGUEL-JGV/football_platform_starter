import { Module } from '@nestjs/common';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';

@Module({
  imports: [TournamentsModule],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}