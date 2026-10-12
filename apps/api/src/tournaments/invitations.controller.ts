import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CreateInvitationDto } from './dto/invitation.dto';
import { InvitationsService } from './invitations.service';

@Controller()
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('tournaments/:id/invitations')
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitations.create(id, user, dto);
  }

  @Get('tournaments/:id/invitations')
  list(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.invitations.list(id, user);
  }

  @Get('tournaments/:id/invitations/:invitationId/entries')
  entries(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invitations.entries(id, invitationId, user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('tournaments/:id/invitations/:invitationId/revoke')
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invitations.revoke(id, invitationId, user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('tournaments/:id/invitations/:invitationId/regenerate')
  regenerate(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invitations.regenerate(id, invitationId, user);
  }

  @Public()
  @Get('invitations/:token')
  resolve(@Param('token') token: string) {
    return this.invitations.resolve(token);
  }
}
