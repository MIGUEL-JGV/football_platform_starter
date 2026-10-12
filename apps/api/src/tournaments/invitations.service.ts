import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvitationStatus, TournamentInvitation } from '@prisma/client';
import * as QRCode from 'qrcode';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { generateToken, hashToken } from '../common/utils/token';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto } from './dto/invitation.dto';
import { TournamentAccessService } from './tournament-access.service';

const REASON_MESSAGES: Record<string, string> = {
  not_found: 'La invitación no existe.',
  revoked: 'Esta invitación fue revocada.',
  exhausted: 'Esta invitación alcanzó su límite de usos.',
  expired: 'Esta invitación ha vencido.',
};

export interface ResolvedInvitation {
  valid: boolean;
  reason?: 'not_found' | 'revoked' | 'exhausted' | 'expired';
  label?: string | null;
  remainingUses?: number | null;
  expiresAt?: Date | null;
  tournament?: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    format: string;
    location: string | null;
    startDate: Date | null;
    maxTeams: number | null;
  };
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TournamentAccessService,
    private readonly config: ConfigService,
  ) {}

  async create(tournamentId: string, user: AuthUser, dto: CreateInvitationDto) {
    const tournament = await this.access.requireManager(tournamentId, user);
    const { token, tokenHash } = generateToken();
    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
      : null;
    const invitation = await this.prisma.tournamentInvitation.create({
      data: {
        tournamentId: tournament.id,
        tokenHash,
        label: dto.label,
        maxUses: dto.maxUses,
        expiresAt,
        createdBy: user.userId,
      },
    });
    return this.withSecret(invitation, token, tournament.slug);
  }

  async list(tournamentId: string, user: AuthUser) {
    await this.access.requireManager(tournamentId, user);
    const invitations = await this.prisma.tournamentInvitation.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { entries: true } } },
    });
    return invitations.map((invitation) => ({
      ...this.toPublic(invitation),
      usedCount: invitation.usedCount,
      maxUses: invitation.maxUses,
      entriesCount: invitation._count.entries,
    }));
  }

  async entries(tournamentId: string, invitationId: string, user: AuthUser) {
    await this.access.requireManager(tournamentId, user);
    await this.getOrFail(tournamentId, invitationId);
    return this.prisma.tournamentTeam.findMany({
      where: { invitationId },
      include: {
        team: { select: { id: true, name: true, logoUrl: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });
  }

  async revoke(tournamentId: string, invitationId: string, user: AuthUser) {
    await this.access.requireManager(tournamentId, user);
    await this.getOrFail(tournamentId, invitationId);
    return this.prisma.tournamentInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.revoked, revokedAt: new Date() },
    });
  }

  async regenerate(tournamentId: string, invitationId: string, user: AuthUser) {
    const tournament = await this.access.requireManager(tournamentId, user);
    await this.getOrFail(tournamentId, invitationId);
    const { token, tokenHash } = generateToken();
    const invitation = await this.prisma.tournamentInvitation.update({
      where: { id: invitationId },
      data: {
        tokenHash,
        status: InvitationStatus.active,
        revokedAt: null,
        usedCount: 0,
      },
    });
    return this.withSecret(invitation, token, tournament.slug);
  }

  async resolve(token: string): Promise<ResolvedInvitation> {
    const invitation = await this.prisma.tournamentInvitation.findUnique({
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
            maxTeams: true,
          },
        },
      },
    });
    if (!invitation) {
      return { valid: false, reason: 'not_found' };
    }
    const reason = this.reasonFor(invitation);
    const remainingUses =
      invitation.maxUses === null ? null : Math.max(0, invitation.maxUses - invitation.usedCount);
    if (reason) {
      return {
        valid: false,
        reason,
        label: invitation.label,
        remainingUses,
        expiresAt: invitation.expiresAt,
      };
    }
    return {
      valid: true,
      label: invitation.label,
      remainingUses,
      expiresAt: invitation.expiresAt,
      tournament: invitation.tournament,
    };
  }

  consume(invitationId: string) {
    return this.prisma.tournamentInvitation.update({
      where: { id: invitationId },
      data: { usedCount: { increment: 1 } },
      select: { id: true, maxUses: true, usedCount: true },
    });
  }

  async requireUsable(token: string, tournamentId: string): Promise<TournamentInvitation> {
    const invitation = await this.prisma.tournamentInvitation.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!invitation) {
      throw new NotFoundException('La invitación no existe.');
    }
    if (invitation.tournamentId !== tournamentId) {
      throw new ForbiddenException('La invitación no corresponde a este torneo.');
    }
    const reason = this.reasonFor(invitation);
    if (reason) {
      throw new ForbiddenException(REASON_MESSAGES[reason]);
    }
    return invitation;
  }

  private reasonFor(invitation: {
    status: InvitationStatus;
    usedCount: number;
    maxUses: number | null;
    expiresAt: Date | null;
  }): ResolvedInvitation['reason'] {
    if (invitation.status === InvitationStatus.revoked) {
      return 'revoked';
    }
    if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
      return 'expired';
    }
    if (invitation.maxUses !== null && invitation.usedCount >= invitation.maxUses) {
      return 'exhausted';
    }
    return undefined;
  }

  private async getOrFail(tournamentId: string, invitationId: string) {
    const invitation = await this.prisma.tournamentInvitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.tournamentId !== tournamentId) {
      throw new NotFoundException('Invitación no encontrada.');
    }
    return invitation;
  }

  private buildJoinUrl(token: string): string {
    const base = this.config.get<string>('PUBLIC_WEB_URL') ?? 'http://localhost:3000';
    return `${base.replace(/\/$/, '')}/join/${token}`;
  }

  private async withSecret(
    invitation: { id: string; label: string | null; maxUses: number | null; expiresAt: Date | null; status: InvitationStatus; createdAt: Date },
    token: string,
    slug: string,
  ) {
    const joinUrl = this.buildJoinUrl(token);
    const qrDataUrl = await QRCode.toDataURL(joinUrl, { width: 320, margin: 1 });
    return {
      ...this.toPublic(invitation),
      slug,
      token,
      joinUrl,
      qrDataUrl,
    };
  }

  private toPublic(invitation: {
    id: string;
    label: string | null;
    maxUses: number | null;
    expiresAt: Date | null;
    status: InvitationStatus;
    createdAt: Date;
  }) {
    return {
      id: invitation.id,
      label: invitation.label,
      status: invitation.status,
      maxUses: invitation.maxUses,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }
}
