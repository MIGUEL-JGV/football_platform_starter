import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationRoles } from '../common/decorators/organization-roles.decorator';
import { OrganizationRolesGuard } from '../common/guards/organization-roles.guard';
import { CreateVenueDto, UpdateVenueDto } from './dto/venue.dto';
import { VenuesService } from './venues.service';

@UseGuards(OrganizationRolesGuard)
@Controller('organizations/:organizationId/venues')
export class VenuesController {
  constructor(private readonly venues: VenuesService) {}

  @Get()
  list(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.venues.list(organizationId, user);
  }

  @OrganizationRoles('owner', 'admin', 'editor')
  @Post()
  create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateVenueDto,
  ) {
    return this.venues.create(organizationId, dto);
  }

  @Get(':venueId')
  get(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.venues.getById(organizationId, venueId, user);
  }

  @OrganizationRoles('owner', 'admin', 'editor')
  @Patch(':venueId')
  update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.venues.update(organizationId, venueId, dto);
  }

  @OrganizationRoles('owner', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':venueId')
  remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('venueId', ParseUUIDPipe) venueId: string,
  ) {
    return this.venues.remove(organizationId, venueId);
  }
}