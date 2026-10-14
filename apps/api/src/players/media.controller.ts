import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PlayerPhotosService, PhotoKind } from './player-photos.service';
import { StorageService } from '../storage/storage.service';

@Controller('media/photos')
export class MediaController {
  constructor(
    private readonly photos: PlayerPhotosService,
    private readonly storage: StorageService,
  ) {}

  @Public()
  @Get(':photoId')
  @Header('Cache-Control', 'private, max-age=300')
  full(
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Query('exp') exp?: string,
    @Query('sig') sig?: string,
  ) {
    return this.send(photoId, 'full', exp, sig);
  }

  @Public()
  @Get(':photoId/thumb')
  @Header('Cache-Control', 'private, max-age=300')
  thumb(
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Query('exp') exp?: string,
    @Query('sig') sig?: string,
  ) {
    return this.send(photoId, 'thumb', exp, sig);
  }

  @Public()
  @Get(':photoId/credential')
  @Header('Cache-Control', 'private, max-age=300')
  credential(
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Query('exp') exp?: string,
    @Query('sig') sig?: string,
  ) {
    return this.send(photoId, 'credential', exp, sig);
  }

  private async send(
    photoId: string,
    kind: PhotoKind,
    exp?: string,
    sig?: string,
  ): Promise<StreamableFile> {
    const file = await this.photos.resolveFile(photoId, kind);
    if (file.visibility !== 'public') {
      const valid =
        exp !== undefined &&
        sig !== undefined &&
        this.photos.verifySignature(photoId, kind, Number(exp), sig);
      if (!valid) {
        // No revelar la existencia de fotografías privadas sin firma válida.
        throw new NotFoundException('Fotografía no encontrada.');
      }
    }
    if (!(await this.storage.exists(file.storageKey))) {
      throw new NotFoundException('Fotografía no encontrada.');
    }
    const stream = await this.storage.read(file.storageKey);
    return new StreamableFile(stream, { type: file.mimeType });
  }
}
