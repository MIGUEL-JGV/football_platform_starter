import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './current-user.decorator';

export const OptionalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | null => {
    const request = ctx.switchToHttp().getRequest();
    return (request.user as AuthUser | undefined) ?? null;
  },
);