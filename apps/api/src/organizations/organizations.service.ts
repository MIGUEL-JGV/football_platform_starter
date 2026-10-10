import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus, OrganizationRole } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { slugify } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { AddMemberDto, UpdateMemberDto } from './dto/member.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateOrganizationDto) {
    const slug = await this.reserveUniqueSlug(dto.name);
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          logoUrl: dto.logoUrl,
          contactEmail: dto.contactEmail,
          createdBy: user.userId,
        },
      });
      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.userId,
          role: OrganizationRole.owner,
          status: MembershipStatus.active,
        },
      });
      return organization;
    });
  }

  async listForUser(user: AuthUser) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId: user.userId, status: MembershipStatus.active } } },
      include: {
        _count: { select: { members: true, tournaments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string, user: AuthUser) {
    await this.assertActiveMembership(id, user);
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: { _count: { select: { members: true, tournaments: true } } },
    });
    if (!organization) {
      throw new NotFoundException('Organización no encontrada.');
    }
    return organization;
  }

  async update(id: string, user: AuthUser, dto: UpdateOrganizationDto) {
    await this.assertActiveMembership(id, user);
    return this.prisma.organization.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
      },
    });
  }

  async listMembers(id: string, user: AuthUser) {
    await this.assertActiveMembership(id, user);
    const rows = await this.prisma.organizationMember.findMany({
      where: { organizationId: id },
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

  async addMember(id: string, user: AuthUser, dto: AddMemberDto) {
    await this.assertActiveMembership(id, user);
    const target = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!target) {
      throw new NotFoundException('No existe un usuario con ese correo.');
    }
    const existing = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: id, userId: target.id } },
    });
    if (existing && existing.status !== MembershipStatus.rejected) {
      throw new ConflictException('El usuario ya es integrante de la organización.');
    }
    return this.prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: id, userId: target.id } },
      create: {
        organizationId: id,
        userId: target.id,
        role: dto.role,
        status: MembershipStatus.active,
      },
      update: { role: dto.role, status: MembershipStatus.active },
    });
  }

  async updateMember(id: string, user: AuthUser, memberId: string, dto: UpdateMemberDto) {
    await this.assertActiveMembership(id, user);
    const member = await this.getMemberOrFail(id, memberId);
    await this.assertOwnershipProtections(id, member.role, dto);

    const nextRole = dto.role ?? member.role;
    const nextStatus = dto.status ?? member.status;
    return this.prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId: id, userId: memberId } },
      data: { role: nextRole, status: nextStatus },
    });
  }

  async removeMember(id: string, user: AuthUser, memberId: string) {
    await this.assertActiveMembership(id, user);
    const member = await this.getMemberOrFail(id, memberId);
    await this.assertOwnershipProtections(id, member.role, {
      role: member.role,
      status: MembershipStatus.rejected,
    });
    await this.prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId: id, userId: memberId } },
    });
    return { removed: true };
  }

  private async assertOwnershipProtections(
    organizationId: string,
    currentRole: OrganizationRole,
    dto: UpdateMemberDto,
  ): Promise<void> {
    if (currentRole !== OrganizationRole.owner) {
      return;
    }
    const nextRole = dto.role ?? currentRole;
    const nextStatus = dto.status ?? MembershipStatus.active;
    if (nextRole === OrganizationRole.owner && nextStatus === MembershipStatus.active) {
      return;
    }
    const activeOwners = await this.prisma.organizationMember.count({
      where: { organizationId, role: OrganizationRole.owner, status: MembershipStatus.active },
    });
    if (activeOwners <= 1) {
      throw new ConflictException('No se puede modificar al último propietario activo de la organización.');
    }
  }

  private async getMemberOrFail(organizationId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!member) {
      throw new NotFoundException('El usuario no es integrante de la organización.');
    }
    return member;
  }

  private async assertActiveMembership(organizationId: string, user: AuthUser): Promise<void> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: user.userId } },
    });
    if (!membership || membership.status !== MembershipStatus.active) {
      throw new ForbiddenException('Acceso denegado.');
    }
  }

  private async reserveUniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'organizacion';
    let candidate = base;
    let suffix = 1;
    while (await this.prisma.organization.findUnique({ where: { slug: candidate } })) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }
}