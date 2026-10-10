import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

interface HttpResponse {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): void };
}

interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  errors?: string[];
  requestId?: string;
}

const STATUS_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponse>();
    const requestId = randomUUID();
    response.setHeader('X-Request-Id', requestId);

    const body = this.buildBody(exception);
    response.status(body.statusCode).json({ ...body, requestId });
  }

  private buildBody(exception: unknown): ApiErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const rawMessage =
        typeof payload === 'string' ? payload : (payload as { message?: string | string[] }).message;

      if (Array.isArray(rawMessage)) {
        return {
          statusCode: status,
          code: 'VALIDATION_ERROR',
          message: rawMessage[0],
          errors: rawMessage,
        };
      }
      return {
        statusCode: status,
        code: STATUS_CODES[status] ?? `HTTP_${status}`,
        message: typeof rawMessage === 'string' ? rawMessage : exception.message,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'CONFLICT',
          message: 'Ya existe un registro con esos datos.',
        };
      }
      if (exception.code === 'P2025') {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'El recurso solicitado no existe.',
        };
      }
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error interno del servidor.',
      };
    }

    this.logger.error('Excepción no controlada', exception instanceof Error ? exception.stack : String(exception));
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Error interno del servidor.',
    };
  }
}