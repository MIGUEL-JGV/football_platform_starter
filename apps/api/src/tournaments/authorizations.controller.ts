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
import { AuthorizationsService } from './authorizations.service';
import { CreateAuthorizationDto } from './dto/authorization.dto';

@Controller()
export class AuthorizationsController {
  constructor(private readonly authorizations: AuthorizationsService) {}

  @Post('tournaments/:id/authorizations')
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAuthorizationDto,
  ) {
    return this.authorizations.create(id, user, dto);
  }

  @Get('tournaments/:id/authorizations')
  list(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.authorizations.list(id, user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('tournaments/:id/authorizations/:authorizationId/revoke')
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('authorizationId', ParseUUIDPipe) authorizationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.authorizations.revoke(id, authorizationId, user);
  }

  @Public()
  @Get('authorizations/:token')
  resolve(@Param('token') token: string) {
    return this.authorizations.resolve(token);
  }
}
