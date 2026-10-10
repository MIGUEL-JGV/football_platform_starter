import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationRoles } from '../common/decorators/organization-roles.decorator';
import { OrganizationRolesGuard } from '../common/guards/organization-roles.guard';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { AddMemberDto, UpdateMemberDto } from './dto/member.dto';

@UseGuards(OrganizationRolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrganizationDto) {
    return this.organizations.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.organizations.listForUser(user);
  }

  @Get(':id')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.organizations.get(id, user);
  }

  @OrganizationRoles('owner', 'admin')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizations.update(id, user, dto);
  }

  @Get(':id/members')
  members(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.organizations.listMembers(id, user);
  }

  @OrganizationRoles('owner', 'admin')
  @Post(':id/members')
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddMemberDto,
  ) {
    return this.organizations.addMember(id, user, dto);
  }

  @OrganizationRoles('owner', 'admin')
  @Patch(':id/members/:userId')
  updateMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.organizations.updateMember(id, user, userId, dto);
  }

  @OrganizationRoles('owner', 'admin')
  @Delete(':id/members/:userId')
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.organizations.removeMember(id, user, userId);
  }
}