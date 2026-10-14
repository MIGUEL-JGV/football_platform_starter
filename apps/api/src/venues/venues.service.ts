import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto, UpdateVenueDto } from './dto/venue.dto';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  create(organizationId: string, dto: CreateVenueDto) {
    return this.prisma.venue.create({
      data: {
        organizationId,
        name: dto.name,
        address: dto.address,
        timezone: dto.timezone,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  async list(organizationId: string, user: AuthUser) {
    await this.assertActiveMembership(organizationId, user);
    return this.prisma.venue.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { matches: true } } },
    });
  }

  async getById(organizationId: string, venueId: string, user: AuthUser) {
    await this.assertActiveMembership(organizationId, user);
    return this.requireVenue(organizationId, venueId);
  }

  async update(organizationId: string, venueId: string, dto: UpdateVenueDto) {
    await this.requireVenue(organizationId, venueId);
    return this.prisma.venue.update({
      where: { id: venueId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
      },
    });
  }

  async remove(organizationId: string, venueId: string) {
    await this.requireVenue(organizationId, venueId);
    const matches = await this.prisma.match.count({ where: { venueId } });
    if (matches > 0) {
      throw new ConflictException('La sede tiene partidos asociados y no puede eliminarse.');
    }
    await this.prisma.venue.delete({ where: { id: venueId } });
    return { removed: true };
  }

  async requireVenueForOrg(organizationId: string, venueId: string) {
    const venue = await this.prisma.venue.findFirst({ where: { id: venueId, organizationId } });
    if (!venue) {
      throw new NotFoundException('Sede no encontrada.');
    }
    return venue;
  }

  private async requireVenue(organizationId: string, venueId: string) {
    return this.requireVenueForOrg(organizationId, venueId);
  }

  private async assertActiveMembership(organizationId: string, user: AuthUser) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: user.userId } },
    });
    if (!membership || membership.status !== MembershipStatus.active) {
      throw new ForbiddenException('Acceso denegado.');
    }
  }
}