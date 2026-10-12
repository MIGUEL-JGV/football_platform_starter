import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MembershipStatus,
  OrganizationRole,
  Prisma,
  TournamentRole,
  TournamentVisibility,
} from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { slugify } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import { ListTournamentsQueryDto } from './dto/list-tournaments.dto';
import { AddTournamentMemberDto, UpdateTournamentMemberDto } from './dto/tournament-member.dto';
import { CreateTournamentDto, UpdateTournamentDto } from './dto/tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, user: AuthUser, dto: CreateTournamentDto) {
    await this.requireOrgRole(organizationId, user, [OrganizationRole.owner, OrganizationRole.admin]);
    const organization = await this.requireOrganization(organizationId);
    const slug = await this.reserveUniqueSlug(organizationId, dto.name);

    return this.prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.create({
        data: {
          organizationId,
          name: dto.name,
          slug,
          description: dto.description,
          format: dto.format,
          visibility: dto.visibility ?? TournamentVisibility.public,
          status: dto.status,
          timezone: dto.timezone,
          registrationOpenAt: this.toDateOrUndefined(dto.registrationOpenAt),
          registrationCloseAt: this.toDateOrUndefined(dto.registrationCloseAt),
          startDate: this.toDateOrUndefined(dto.startDate),
          endDate: this.toDateOrUndefined(dto.endDate),
          pointsWin: dto.pointsWin,
          pointsDraw: dto.pointsDraw,
          pointsLoss: dto.pointsLoss,
          rules: dto.rules !== undefined ? (dto.rules as Prisma.InputJsonValue) : undefined,
          logoUrl: dto.logoUrl,
          coverUrl: dto.coverUrl,
        },
      });
      await tx.tournamentMember.create({
        data: {
          tournamentId: tournament.id,
          userId: user.userId,
          role: TournamentRole.manager,
          status: MembershipStatus.active,
        },
      });
      return { ...tournament, organization };
    });
  }

  async listPublic(query: ListTournamentsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 12, 50);
    const where: Prisma.TournamentWhereInput = {
      visibility: TournamentVisibility.public,
      ...(query.status !== undefined && { status: query.status }),
      ...(query.format !== undefined && { format: query.format }),
      ...(query.organizationId !== undefined && { organizationId: query.organizationId }),
      ...(query.q !== undefined && { name: { contains: query.q, mode: 'insensitive' } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tournament.findMany({
        where,
        include: {
          organization: { select: { id: true, name: true, slug: true } },
          _count: { select: { members: true, entries: true, follows: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.tournament.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(id: string, user: AuthUser | null) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
        _count: { select: { members: true, entries: true, follows: true } },
      },
    });
    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado.');
    }
    if (tournament.visibility !== TournamentVisibility.public) {
      const allowed = await this.canView(tournament.id, tournament.organizationId, user);
      if (!allowed) {
        throw new NotFoundException('Torneo no encontrado.');
      }
    }
    const myRole = user ? await this.myTournamentRole(tournament.id, user.userId) : undefined;
    const following = user
      ? Boolean(
          await this.prisma.tournamentFollow.findUnique({
            where: { tournamentId_userId: { tournamentId: id, userId: user.userId } },
          }),
        )
      : false;
    return { ...tournament, myRole, following };
  }

  async myTournaments(user: AuthUser) {
    const [follows, memberships] = await Promise.all([
      this.prisma.tournamentFollow.findMany({
        where: { userId: user.userId },
        select: { tournamentId: true },
      }),
      this.prisma.tournamentMember.findMany({
        where: { userId: user.userId, status: MembershipStatus.active },
        select: { tournamentId: true, role: true },
      }),
    ]);
    const followIds = new Set(follows.map((f) => f.tournamentId));
    const membershipsById = new Map(memberships.map((m) => [m.tournamentId, m]));
    const ids = Array.from(new Set([...followIds, ...membershipsById.keys()]));
    if (ids.length === 0) {
      return { items: [], total: 0 };
    }
    const tournaments = await this.prisma.tournament.findMany({
      where: { id: { in: ids } },
      include: {
        organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
        _count: { select: { members: true, entries: true, follows: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const items = tournaments.map((tournament) => ({
      ...tournament,
      following: followIds.has(tournament.id),
      myRole: membershipsById.get(tournament.id)?.role,
    }));
    return { items, total: items.length };
  }

  async update(organizationId: string, tournamentId: string, user: AuthUser, dto: UpdateTournamentDto) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament || tournament.organizationId !== organizationId) {
      throw new NotFoundException('Torneo no encontrado.');
    }
    const canManage = await this.canManage(tournamentId, tournament.organizationId, user);
    if (!canManage) {
      throw new ForbiddenException('Permisos insuficientes para este torneo.');
    }
    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.coverUrl !== undefined && { coverUrl: dto.coverUrl }),
        ...(dto.registrationOpenAt !== undefined && {
          registrationOpenAt: this.toDateOrUndefined(dto.registrationOpenAt),
        }),
        ...(dto.registrationCloseAt !== undefined && {
          registrationCloseAt: this.toDateOrUndefined(dto.registrationCloseAt),
        }),
        ...(dto.startDate !== undefined && { startDate: this.toDateOrUndefined(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: this.toDateOrUndefined(dto.endDate) }),
        ...(dto.pointsWin !== undefined && { pointsWin: dto.pointsWin }),
        ...(dto.pointsDraw !== undefined && { pointsDraw: dto.pointsDraw }),
        ...(dto.pointsLoss !== undefined && { pointsLoss: dto.pointsLoss }),
        ...(dto.rules !== undefined && { rules: dto.rules as Prisma.InputJsonValue }),
      },
    });
  }

  async remove(organizationId: string, tournamentId: string, user: AuthUser) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament || tournament.organizationId !== organizationId) {
      throw new NotFoundException('Torneo no encontrado.');
    }
    await this.requireOrgRole(organizationId, user, [OrganizationRole.owner, OrganizationRole.admin]);
    await this.prisma.tournament.delete({ where: { id: tournamentId } });
    return { removed: true };
  }

  async listMembers(id: string, user: AuthUser) {
    const tournament = await this.requireTournament(id);
    const canView = await this.canView(tournament.id, tournament.organizationId, user);
    if (!canView) {
      throw new ForbiddenException('Acceso denegado.');
    }
    const rows = await this.prisma.tournamentMember.findMany({
      where: { tournamentId: id },
      include: { user: { select: { id: true, email: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({
      userId: row.userId,
      email: row.user.email,
      displayName: row.user.displayName,
      role: row.role,
      status: row.status,
      createdAt: row.createdAt,
    }));
  }

  async addMember(id: string, user: AuthUser, dto: AddTournamentMemberDto) {
    const tournament = await this.requireTournament(id);
    const canManage = await this.canManage(tournament.id, tournament.organizationId, user);
    if (!canManage) {
      throw new ForbiddenException('Permisos insuficientes para este torneo.');
    }
    const target = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!target) {
      throw new NotFoundException('No existe un usuario con ese correo.');
    }
    const existing = await this.prisma.tournamentMember.findUnique({
      where: { tournamentId_userId: { tournamentId: id, userId: target.id } },
    });
    if (existing && existing.status !== MembershipStatus.rejected) {
      throw new ConflictException('El usuario ya es integrante del torneo.');
    }
    return this.prisma.tournamentMember.upsert({
      where: { tournamentId_userId: { tournamentId: id, userId: target.id } },
      create: { tournamentId: id, userId: target.id, role: dto.role, status: MembershipStatus.active },
      update: { role: dto.role, status: MembershipStatus.active },
    });
  }

  async updateMember(id: string, user: AuthUser, memberId: string, dto: UpdateTournamentMemberDto) {
    const tournament = await this.requireTournament(id);
    const canManage = await this.canManage(tournament.id, tournament.organizationId, user);
    if (!canManage) {
      throw new ForbiddenException('Permisos insuficientes para este torneo.');
    }
    const member = await this.getMemberOrFail(id, memberId);
    await this.assertManagerProtections(id, member.role, dto);
    return this.prisma.tournamentMember.update({
      where: { tournamentId_userId: { tournamentId: id, userId: memberId } },
      data: {
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async removeMember(id: string, user: AuthUser, memberId: string) {
    const tournament = await this.requireTournament(id);
    const canManage = await this.canManage(tournament.id, tournament.organizationId, user);
    if (!canManage) {
      throw new ForbiddenException('Permisos insuficientes para este torneo.');
    }
    const member = await this.getMemberOrFail(id, memberId);
    await this.assertManagerProtections(id, member.role, {
      status: MembershipStatus.rejected,
    });
    await this.prisma.tournamentMember.delete({
      where: { tournamentId_userId: { tournamentId: id, userId: memberId } },
    });
    return { removed: true };
  }

  async follow(id: string, user: AuthUser) {
    await this.requireTournament(id);
    await this.prisma.tournamentFollow.upsert({
      where: { tournamentId_userId: { tournamentId: id, userId: user.userId } },
      create: { tournamentId: id, userId: user.userId },
      update: {},
    });
    return { following: true };
  }

  async unfollow(id: string, user: AuthUser) {
    await this.prisma.tournamentFollow.deleteMany({
      where: { tournamentId: id, userId: user.userId },
    });
    return { following: false };
  }

  private async canView(tournamentId: string, organizationId: string, user: AuthUser | null): Promise<boolean> {
    if (!user) {
      return false;
    }
    const [tournamentMember, orgMember] = await Promise.all([
      this.prisma.tournamentMember.findUnique({
        where: { tournamentId_userId: { tournamentId, userId: user.userId } },
      }),
      this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: user.userId } },
      }),
    ]);
    return (
      (tournamentMember?.status === MembershipStatus.active) ||
      (orgMember?.status === MembershipStatus.active)
    );
  }

  private async canManage(
    tournamentId: string,
    organizationId: string,
    user: AuthUser,
  ): Promise<boolean> {
    const [tournamentMember, orgMember] = await Promise.all([
      this.prisma.tournamentMember.findUnique({
        where: { tournamentId_userId: { tournamentId, userId: user.userId } },
      }),
      this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: user.userId } },
      }),
    ]);
    if (tournamentMember?.status === MembershipStatus.active && tournamentMember.role === TournamentRole.manager) {
      return true;
    }
    const orgRoles: OrganizationRole[] = [OrganizationRole.owner, OrganizationRole.admin];
    return (
      orgMember?.status === MembershipStatus.active && orgRoles.includes(orgMember.role)
    );
  }

  private async myTournamentRole(tournamentId: string, userId: string): Promise<TournamentRole | undefined> {
    const member = await this.prisma.tournamentMember.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    return member && member.status === MembershipStatus.active ? member.role : undefined;
  }

  private async assertManagerProtections(
    tournamentId: string,
    currentRole: TournamentRole,
    dto: UpdateTournamentMemberDto,
  ): Promise<void> {
    if (currentRole !== TournamentRole.manager) {
      return;
    }
    const nextRole = dto.role ?? currentRole;
    const nextStatus = dto.status ?? MembershipStatus.active;
    if (nextRole === TournamentRole.manager && nextStatus === MembershipStatus.active) {
      return;
    }
    const activeManagers = await this.prisma.tournamentMember.count({
      where: { tournamentId, role: TournamentRole.manager, status: MembershipStatus.active },
    });
    if (activeManagers <= 1) {
      throw new ConflictException('No se puede modificar al último manager activo del torneo.');
    }
  }

  private async requireOrgRole(
    organizationId: string,
    user: AuthUser,
    roles: OrganizationRole[],
  ): Promise<void> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: user.userId } },
    });
    if (!membership || membership.status !== MembershipStatus.active || !roles.includes(membership.role)) {
      throw new ForbiddenException('Acceso denegado.');
    }
  }

  private async requireOrganization(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) {
      throw new NotFoundException('Organización no encontrada.');
    }
    return organization;
  }

  private async requireTournament(id: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado.');
    }
    return tournament;
  }

  private async getMemberOrFail(tournamentId: string, userId: string) {
    const member = await this.prisma.tournamentMember.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!member) {
      throw new NotFoundException('El usuario no es integrante del torneo.');
    }
    return member;
  }

  private async reserveUniqueSlug(organizationId: string, name: string): Promise<string> {
    const base = slugify(name) || 'torneo';
    let candidate = base;
    let suffix = 1;
    while (
      await this.prisma.tournament.findUnique({
        where: { organizationId_slug: { organizationId, slug: candidate } },
      })
    ) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  private toDateOrUndefined(value: string | undefined): Date | undefined {
    return value === undefined ? undefined : new Date(value);
  }
}