import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlayerPhoto } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import sharp = require('sharp');
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TournamentAccessService } from '../tournaments/tournament-access.service';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 8 * 1024 * 1024;
const PHOTO_MAX_EDGE = 1024;
const THUMB_EDGE = 256;

export interface PlayerPhotoView {
  id: string;
  playerId: string;
  isPrimary: boolean;
  width: number;
  height: number;
  sizeBytes: number;
  url: string;
  thumbUrl: string;
  createdAt: Date;
}

@Injectable()
export class PlayerPhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: TournamentAccessService,
    private readonly config: ConfigService,
  ) {}

  async list(playerId: string, user: AuthUser): Promise<PlayerPhotoView[]> {
    await this.assertAccess(playerId, user);
    const photos = await this.prisma.playerPhoto.findMany({
      where: { playerId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
    return photos.map((photo) => this.toView(photo));
  }

  async upload(
    playerId: string,
    user: AuthUser,
    file: { buffer: Buffer; mimetype: string; size: number },
  ): Promise<PlayerPhotoView> {
    await this.assertAccess(playerId, user);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Debes adjuntar una imagen.');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usa JPG, PNG o WEBP.');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('La imagen supera el límite de 8 MB.');
    }

    const photoId = randomUUID();
    const base = `players/${playerId}/${photoId}`;
    const photoKey = `${base}.webp`;
    const thumbKey = `${base}_thumb.webp`;

    let photoBuffer: Buffer;
    let thumbBuffer: Buffer;
    let metadata: sharp.Metadata;
    try {
      const pipeline = sharp(file.buffer, { failOn: 'error' }).rotate();
      photoBuffer = await pipeline
        .clone()
        .resize({ width: PHOTO_MAX_EDGE, height: PHOTO_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      thumbBuffer = await pipeline
        .clone()
        .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: 'cover', position: 'attention' })
        .webp({ quality: 78 })
        .toBuffer();
      metadata = await sharp(photoBuffer).metadata();
    } catch {
      throw new BadRequestException('No se pudo procesar la imagen.');
    }

    await this.storage.save(photoKey, photoBuffer);
    await this.storage.save(thumbKey, thumbBuffer);

    const existingPrimary = await this.prisma.playerPhoto.count({
      where: { playerId, isPrimary: true },
    });
    const isPrimary = existingPrimary === 0;

    const photo = await this.prisma.$transaction(async (tx) => {
      const created = await tx.playerPhoto.create({
        data: {
          id: photoId,
          playerId,
          storageKey: photoKey,
          thumbKey,
          mimeType: 'image/webp',
          width: metadata.width ?? 0,
          height: metadata.height ?? 0,
          sizeBytes: photoBuffer.byteLength,
          isPrimary,
          uploadedBy: user.userId,
        },
      });
      if (isPrimary) {
        await tx.player.update({
          where: { id: playerId },
          data: { photoUrl: this.mediaUrl(created.id) },
        });
      }
      return created;
    });

    return this.toView(photo);
  }

  async setPrimary(playerId: string, photoId: string, user: AuthUser): Promise<PlayerPhotoView> {
    await this.assertAccess(playerId, user);
    const photo = await this.requirePhoto(playerId, photoId);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.playerPhoto.updateMany({
        where: { playerId, isPrimary: true },
        data: { isPrimary: false },
      });
      const primary = await tx.playerPhoto.update({
        where: { id: photo.id },
        data: { isPrimary: true },
      });
      await tx.player.update({
        where: { id: playerId },
        data: { photoUrl: this.mediaUrl(photo.id) },
      });
      return primary;
    });
    return this.toView(updated);
  }

  async remove(playerId: string, photoId: string, user: AuthUser): Promise<{ removed: boolean }> {
    await this.assertAccess(playerId, user);
    const photo = await this.requirePhoto(playerId, photoId);
    await this.storage.remove(photo.storageKey);
    if (photo.thumbKey) {
      await this.storage.remove(photo.thumbKey);
    }
    await this.prisma.playerPhoto.delete({ where: { id: photo.id } });
    if (photo.isPrimary) {
      const next = await this.prisma.playerPhoto.findFirst({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await this.prisma.playerPhoto.update({ where: { id: next.id }, data: { isPrimary: true } });
        await this.prisma.player.update({
          where: { id: playerId },
          data: { photoUrl: this.mediaUrl(next.id) },
        });
      } else {
        await this.prisma.player.update({ where: { id: playerId }, data: { photoUrl: null } });
      }
    }
    return { removed: true };
  }

  async resolveFile(photoId: string, kind: 'full' | 'thumb') {
    const photo = await this.prisma.playerPhoto.findUnique({ where: { id: photoId } });
    if (!photo) {
      throw new NotFoundException('Fotografía no encontrada.');
    }
    const key = kind === 'thumb' ? photo.thumbKey : photo.storageKey;
    if (!key) {
      throw new NotFoundException('Fotografía no encontrada.');
    }
    return { storageKey: key, mimeType: photo.mimeType };
  }

  private toView(photo: PlayerPhoto): PlayerPhotoView {
    return {
      id: photo.id,
      playerId: photo.playerId,
      isPrimary: photo.isPrimary,
      width: photo.width,
      height: photo.height,
      sizeBytes: photo.sizeBytes,
      url: this.mediaUrl(photo.id),
      thumbUrl: this.mediaUrl(photo.id, 'thumb'),
      createdAt: photo.createdAt,
    };
  }

  private mediaUrl(photoId: string, kind: 'full' | 'thumb' = 'full'): string {
    const base = (this.config.get<string>('PUBLIC_API_URL') ?? 'http://localhost:4000').replace(
      /\/$/,
      '',
    );
    const suffix = kind === 'thumb' ? '/thumb' : '';
    return `${base}/api/v1/media/photos/${photoId}${suffix}`;
  }

  private async requirePhoto(playerId: string, photoId: string) {
    const photo = await this.prisma.playerPhoto.findFirst({ where: { id: photoId, playerId } });
    if (!photo) {
      throw new NotFoundException('Fotografía no encontrada.');
    }
    return photo;
  }

  private async assertAccess(playerId: string, user: AuthUser): Promise<void> {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      throw new NotFoundException('Jugador no encontrado.');
    }
    if (player.createdBy === user.userId) {
      return;
    }
    const rosters = await this.prisma.teamRoster.findMany({
      where: { playerId },
      select: { tournamentTeam: { select: { tournament: { select: { id: true, organizationId: true } } } } },
    });
    for (const roster of rosters) {
      const tournament = roster.tournamentTeam.tournament;
      if (await this.access.canManage(tournament.id, tournament.organizationId, user)) {
        return;
      }
    }
    throw new ForbiddenException('Acceso denegado.');
  }
}
