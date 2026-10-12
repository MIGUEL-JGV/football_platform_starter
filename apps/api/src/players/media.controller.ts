import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  StreamableFile,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { StorageService } from '../storage/storage.service';
import { PlayerPhotosService } from './player-photos.service';

@Controller('media/photos')
export class MediaController {
  constructor(
    private readonly photos: PlayerPhotosService,
    private readonly storage: StorageService,
  ) {}

  @Public()
  @Get(':photoId')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  full(@Param('photoId', ParseUUIDPipe) photoId: string) {
    return this.send(photoId, 'full');
  }

  @Public()
  @Get(':photoId/thumb')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  thumb(@Param('photoId', ParseUUIDPipe) photoId: string) {
    return this.send(photoId, 'thumb');
  }

  private async send(photoId: string, kind: 'full' | 'thumb'): Promise<StreamableFile> {
    const file = await this.photos.resolveFile(photoId, kind);
    if (!(await this.storage.exists(file.storageKey))) {
      throw new NotFoundException('Fotografía no encontrada.');
    }
    const stream = await this.storage.read(file.storageKey);
    return new StreamableFile(stream, { type: file.mimeType });
  }
}
