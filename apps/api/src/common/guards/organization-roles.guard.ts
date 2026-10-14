import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../decorators/current-user.decorator';
import { ORGANIZATION_ROLES_KEY } from '../decorators/organization-roles.decorator';

@Injectable()
export class OrganizationRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrganizationRole[]>(
      ORGANIZATION_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    const organizationId: string | undefined =
      request.params.organizationId ?? request.params.id;

    if (!user || !organizationId) {
      throw new ForbiddenException('Acceso denegado.');
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: user.userId },
      },
    });

    if (!membership || membership.status !== 'active') {
      throw new ForbiddenException('Acceso denegado.');
    }
    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Permisos insuficientes para esta organización.');
    }

    request.organizationMembership = membership;
    return true;
  }
}