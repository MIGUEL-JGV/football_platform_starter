import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AuthorizationToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const value = request.headers['x-authorization-token'];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  },
);
