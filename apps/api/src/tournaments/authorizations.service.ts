import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthorizationStatus, TournamentAuthorization } from '@prisma/client';
import * as QRCode from 'qrcode';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { generateToken, hashToken } from '../common/utils/token';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuthorizationDto } from './dto/authorization.dto';
import { TournamentAccessService } from './tournament-access.service';

type Reason = 'not_found' | 'revoked' | 'exhausted' | 'expired';

const REASON_MESSAGES: Record<Reason, string> = {
  not_found: 'El enlace de autorización no existe.',
  revoked: 'Este enlace de autorización fue revocado.',
  exhausted: 'Este enlace de autorización alcanzó su límite de usos.',
  expired: 'Este enlace de autorización ha vencido.',
};

export interface ResolvedAuthorization {
  valid: boolean;
  reason?: Reason;
  label?: string | null;
  expiresAt?: Date | null;
  remainingUses?: number | null;
  tournament?: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    format: string;
    location: string | null;
    startDate: Date | null;
    status: string;
  };
}

@Injectable()
export class AuthorizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TournamentAccessService,
    private readonly config: ConfigService,
  ) {}

  async create(tournamentId: string, user: AuthUser, dto: CreateAuthorizationDto) {
    const tournament = await this.access.requireTournament(tournamentId);
    await this.access.requireOrgOwner(tournament.organizationId, user);
    const { token, tokenHash } = generateToken();
    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
      : null;
    const authorization = await this.prisma.tournamentAuthorization.create({
      data: {
        tournamentId: tournament.id,
        tokenHash,
        label: dto.label,
        maxUses: dto.maxUses,
        expiresAt,
        createdBy: user.userId,
      },
    });
    return this.withSecret(authorization, token);
  }

  async list(tournamentId: string, user: AuthUser) {
    const tournament = await this.access.requireTournament(tournamentId);
    await this.access.requireOrgOwner(tournament.organizationId, user);
    const authorizations = await this.prisma.tournamentAuthorization.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'desc' },
    });
    return authorizations.map((authorization) => this.toPublic(authorization));
  }

  async revoke(tournamentId: string, authorizationId: string, user: AuthUser) {
    const tournament = await this.access.requireTournament(tournamentId);
    await this.access.requireOrgOwner(tournament.organizationId, user);
    await this.getOrFail(tournamentId, authorizationId);
    const authorization = await this.prisma.tournamentAuthorization.update({
      where: { id: authorizationId },
      data: { status: AuthorizationStatus.revoked, revokedAt: new Date() },
    });
    return this.toPublic(authorization);
  }

  async resolve(token: string): Promise<ResolvedAuthorization> {
    const authorization = await this.prisma.tournamentAuthorization.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            format: true,
            location: true,
            startDate: true,
            status: true,
          },
        },
      },
    });
    if (!authorization) {
      return { valid: false, reason: 'not_found' };
    }
    const reason = this.reasonFor(authorization);
    const remainingUses = this.remainingUses(authorization);
    if (reason) {
      return {
        valid: false,
        reason,
        label: authorization.label,
        remainingUses,
        expiresAt: authorization.expiresAt,
      };
    }
    return {
      valid: true,
      label: authorization.label,
      remainingUses,
      expiresAt: authorization.expiresAt,
      tournament: authorization.tournament,
    };
  }

  async requireUsable(token: string, tournamentId: string): Promise<TournamentAuthorization> {
    const authorization = await this.prisma.tournamentAuthorization.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!authorization) {
      throw new NotFoundException(REASON_MESSAGES.not_found);
    }
    if (authorization.tournamentId !== tournamentId) {
      throw new ForbiddenException('El enlace de autorización no corresponde a este torneo.');
    }
    const reason = this.reasonFor(authorization);
    if (reason) {
      throw new ForbiddenException(REASON_MESSAGES[reason]);
    }
    return authorization;
  }

  consume(authorizationId: string) {
    return this.prisma.tournamentAuthorization.update({
      where: { id: authorizationId },
      data: { usedCount: { increment: 1 } },
      select: { id: true, maxUses: true, usedCount: true },
    });
  }

  private remainingUses(authorization: {
    maxUses: number | null;
    usedCount: number;
  }): number | null {
    return authorization.maxUses === null
      ? null
      : Math.max(0, authorization.maxUses - authorization.usedCount);
  }

  private reasonFor(authorization: {
    status: AuthorizationStatus;
    usedCount: number;
    maxUses: number | null;
    expiresAt: Date | null;
  }): Reason | undefined {
    if (authorization.status === AuthorizationStatus.revoked) {
      return 'revoked';
    }
    if (authorization.expiresAt && authorization.expiresAt.getTime() < Date.now()) {
      return 'expired';
    }
    if (authorization.maxUses !== null && authorization.usedCount >= authorization.maxUses) {
      return 'exhausted';
    }
    return undefined;
  }

  private async getOrFail(tournamentId: string, authorizationId: string) {
    const authorization = await this.prisma.tournamentAuthorization.findUnique({
      where: { id: authorizationId },
    });
    if (!authorization || authorization.tournamentId !== tournamentId) {
      throw new NotFoundException('Enlace de autorización no encontrado.');
    }
    return authorization;
  }

  private buildAuthorizeUrl(token: string): string {
    const base = this.config.get<string>('PUBLIC_WEB_URL') ?? 'http://localhost:3000';
    return `${base.replace(/\/$/, '')}/authorize/${token}`;
  }

  private async withSecret(
    authorization: {
      id: string;
      label: string | null;
      maxUses: number | null;
      usedCount: number;
      expiresAt: Date | null;
      status: AuthorizationStatus;
      createdAt: Date;
    },
    token: string,
  ) {
    const authorizeUrl = this.buildAuthorizeUrl(token);
    const qrDataUrl = await QRCode.toDataURL(authorizeUrl, { width: 320, margin: 1 });
    return {
      ...this.toPublic(authorization),
      token,
      authorizeUrl,
      qrDataUrl,
    };
  }

  private toPublic(authorization: {
    id: string;
    label: string | null;
    maxUses: number | null;
    usedCount: number;
    expiresAt: Date | null;
    status: AuthorizationStatus;
    createdAt: Date;
  }) {
    return {
      id: authorization.id,
      label: authorization.label,
      status: authorization.status,
      maxUses: authorization.maxUses,
      usedCount: authorization.usedCount,
      expiresAt: authorization.expiresAt,
      createdAt: authorization.createdAt,
    };
  }
}
