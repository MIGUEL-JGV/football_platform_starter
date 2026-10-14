import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PlayerPhotosService } from './player-photos.service';

const MAX_BYTES = 8 * 1024 * 1024;

@Controller('players/:id/photos')
export class PlayerPhotosController {
  constructor(private readonly photos: PlayerPhotosService) {}

  @Get()
  list(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.photos.list(id, user);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_BYTES },
    }),
  )
  upload(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
    @Body('makePublic') makePublic?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar una imagen.');
    }
    return this.photos.upload(
      id,
      user,
      {
        buffer: file.buffer,
        mimetype: file.mimetype,
        size: file.size,
      },
      makePublic === 'true' || makePublic === '1',
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post(':photoId/primary')
  setPrimary(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.photos.setPrimary(id, photoId, user);
  }

  @Delete(':photoId')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.photos.remove(id, photoId, user);
  }
}
