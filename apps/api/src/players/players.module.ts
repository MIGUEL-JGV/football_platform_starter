import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { MediaController } from './media.controller';
import { PlayerPhotosController } from './player-photos.controller';
import { PlayerPhotosService } from './player-photos.service';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

@Module({
  imports: [StorageModule, TournamentsModule],
  controllers: [PlayersController, PlayerPhotosController, MediaController],
  providers: [PlayersService, PlayerPhotosService],
  exports: [PlayersService, PlayerPhotosService],
})
export class PlayersModule {}
