import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlayerPhoto } from '@prisma/client';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
// sharp es CommonJS; se importa con require para preservar el tipado de `sharp.Metadata`.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sharp = require('sharp');
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TournamentAccessService } from '../tournaments/tournament-access.service';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_INPUT_EDGE = 8000;
const PHOTO_MAX_EDGE = 1024;
const THUMB_EDGE = 256;
const CREDENTIAL_WIDTH = 600;
const CREDENTIAL_HEIGHT = 800;
const SIGNED_URL_TTL_MS = 60 * 60 * 1000;
const PHOTO_PUBLICATION_SCOPE = 'photo_publication';
const ADULT_AGE = 18;

export type PhotoKind = 'full' | 'thumb' | 'credential';
export type PhotoVisibility = 'public' | 'private';

export interface PlayerPhotoView {
  id: string;
  playerId: string;
  isPrimary: boolean;
  visibility: PhotoVisibility;
  width: number;
  height: number;
  sizeBytes: number;
  url: string;
  thumbUrl: string;
  credentialUrl: string;
  createdAt: Date;
}

function isMinor(dateOfBirth: Date, today = new Date()): boolean {
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age < ADULT_AGE;
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
    makePublic = false,
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

    const visibility = await this.resolveVisibility(playerId, makePublic);

    const photoId = randomUUID();
    const base = `players/${playerId}/${photoId}`;
    const photoKey = `${base}.webp`;
    const thumbKey = `${base}_thumb.webp`;
    const credentialKey = `${base}_credential.webp`;

    let photoBuffer: Buffer;
    let thumbBuffer: Buffer;
    let credentialBuffer: Buffer;
    let metadata: sharp.Metadata;
    try {
      const input = sharp(file.buffer, { failOn: 'error' }).rotate();
      const inputMetadata = await input.metadata();
      if (
        (inputMetadata.width ?? 0) > MAX_INPUT_EDGE ||
        (inputMetadata.height ?? 0) > MAX_INPUT_EDGE
      ) {
        throw new BadRequestException('La imagen supera las dimensiones máximas permitidas.');
      }
      photoBuffer = await input
        .clone()
        .resize({ width: PHOTO_MAX_EDGE, height: PHOTO_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      thumbBuffer = await input
        .clone()
        .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: 'cover', position: 'attention' })
        .webp({ quality: 78 })
        .toBuffer();
      credentialBuffer = await input
        .clone()
        .resize({
          width: CREDENTIAL_WIDTH,
          height: CREDENTIAL_HEIGHT,
          fit: 'cover',
          position: 'attention',
        })
        .webp({ quality: 84 })
        .toBuffer();
      metadata = await sharp(photoBuffer).metadata();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('No se pudo procesar la imagen.');
    }

    await this.storage.save(photoKey, photoBuffer);
    await this.storage.save(thumbKey, thumbBuffer);
    await this.storage.save(credentialKey, credentialBuffer);

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
          credentialKey,
          mimeType: 'image/webp',
          width: metadata.width ?? 0,
          height: metadata.height ?? 0,
          sizeBytes: photoBuffer.byteLength,
          visibility,
          isPrimary,
          uploadedBy: user.userId,
        },
      });
      if (isPrimary && visibility === 'public') {
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
        data: { photoUrl: primary.visibility === 'public' ? this.mediaUrl(photo.id) : null },
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
    if (photo.credentialKey) {
      await this.storage.remove(photo.credentialKey);
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
          data: { photoUrl: next.visibility === 'public' ? this.mediaUrl(next.id) : null },
        });
      } else {
        await this.prisma.player.update({ where: { id: playerId }, data: { photoUrl: null } });
      }
    }
    return { removed: true };
  }

  async resolveFile(photoId: string, kind: PhotoKind) {
    const photo = await this.prisma.playerPhoto.findUnique({ where: { id: photoId } });
    if (!photo) {
      throw new NotFoundException('Fotografía no encontrada.');
    }
    const key =
      kind === 'thumb' ? photo.thumbKey : kind === 'credential' ? photo.credentialKey : photo.storageKey;
    if (!key) {
      throw new NotFoundException('Fotografía no encontrada.');
    }
    return {
      id: photo.id,
      storageKey: key,
      mimeType: photo.mimeType,
      visibility: photo.visibility as PhotoVisibility,
    };
  }

  verifySignature(photoId: string, kind: PhotoKind, exp: number, sig: string): boolean {
    if (!Number.isFinite(exp) || exp * 1000 < Date.now()) {
      return false;
    }
    const expected = this.sign(photoId, kind, exp);
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }

  private async resolveVisibility(playerId: string, makePublic: boolean): Promise<PhotoVisibility> {
    const consent = await this.prisma.consentRecord.findFirst({
      where: { playerId, scope: PHOTO_PUBLICATION_SCOPE, granted: true },
      select: { id: true },
    });
    if (consent) {
      return 'public';
    }
    if (!makePublic) {
      return 'private';
    }
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { dateOfBirth: true },
    });
    if (player?.dateOfBirth && isMinor(player.dateOfBirth)) {
      throw new ForbiddenException(
        'Para publicar la fotografía de un menor se requiere el consentimiento del tutor.',
      );
    }
    return 'public';
  }

  private toView(photo: PlayerPhoto): PlayerPhotoView {
    const visibility = photo.visibility as PhotoVisibility;
    return {
      id: photo.id,
      playerId: photo.playerId,
      isPrimary: photo.isPrimary,
      visibility,
      width: photo.width,
      height: photo.height,
      sizeBytes: photo.sizeBytes,
      url: this.urlFor(photo, 'full'),
      thumbUrl: this.urlFor(photo, 'thumb'),
      credentialUrl: this.urlFor(photo, 'credential'),
      createdAt: photo.createdAt,
    };
  }

  private urlFor(photo: PlayerPhoto, kind: PhotoKind): string {
    const base = this.mediaUrl(photo.id, kind);
    if (photo.visibility !== 'public') {
      const exp = Math.floor((Date.now() + SIGNED_URL_TTL_MS) / 1000);
      return `${base}?exp=${exp}&sig=${this.sign(photo.id, kind, exp)}`;
    }
    return base;
  }

  private sign(photoId: string, kind: PhotoKind, exp: number): string {
    return createHmac('sha256', this.signingSecret())
      .update(`${photoId}:${kind}:${exp}`)
      .digest('hex');
  }

  private signingSecret(): string {
    return (
      this.config.get<string>('MEDIA_URL_SECRET') ??
      this.config.get<string>('JWT_ACCESS_SECRET') ??
      'dev-media-secret'
    );
  }

  private mediaUrl(photoId: string, kind: PhotoKind = 'full'): string {
    const base = (this.config.get<string>('PUBLIC_API_URL') ?? 'http://localhost:4000').replace(
      /\/$/,
      '',
    );
    const suffix = kind === 'thumb' ? '/thumb' : kind === 'credential' ? '/credential' : '';
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
