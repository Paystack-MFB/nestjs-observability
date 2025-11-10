import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { isNoLogClassEnabled, isNoLogEnabled } from '../decorators/auto-trace.decorators';
import { LoggerService } from '../logger/logger.service';
import { getServiceEnvironment, getServiceName } from '../register';
import { getCurrentSpanId, getCurrentTraceId } from '../utils/span-attributes';
import { maskSensitiveFields } from '../utils/mask-sensitive-fields';

// Express types for better typing
interface Request {
  body?: unknown;
  connection?: { remoteAddress?: string };
  headers?: Record<string, string | string[]>;
  method?: string;
  query?: Record<string, unknown>;
  url?: string;
}

interface Response {
  statusCode?: number;
}

/**
 * Logs all HTTP requests and responses with sensitive data masking
 *
 * Features:
 * - Logs request on entry with masked headers, query, and body
 * - Logs response on completion with masked body
 * - Follows Paystack log format standards
 * - Includes trace correlation (traceId, spanId)
 * - Respects @NoLog and @NoLogClass decorators to skip logging
 * - Calculates request age from Age header if present
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const handler = context.getHandler();
    const controllerClass = context.getClass();

    // Respect @NoLog decorators
    if (isNoLogClassEnabled(controllerClass)) {
      return next.handle();
    }

    if (isNoLogEnabled(controllerClass.prototype as object, handler.name)) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Log the request
    this.logRequest(request, startTime);

    return next.handle().pipe(
      tap({
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logResponse(request, response, undefined, duration, error);
        },
        next: (responseBody: unknown) => {
          const duration = Date.now() - startTime;
          this.logResponse(request, response, responseBody, duration);
        },
      })
    );
  }

  /**
   * Calculate request age including Age header if present
   */
  private calculateAge(request: Request, additionalAge: number): number {
    const ageHeader = request.headers?.['age'];
    const headerAge = ageHeader ? parseInt(String(ageHeader), 10) : 0;
    return headerAge + additionalAge;
  }

  /**
   * Extract client IP from x-forwarded-for or connection
   */
  private getClientIp(request: Request): string | undefined {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    if (forwardedFor) {
      const forwardedForStr = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return forwardedForStr.split(',')[0].trim();
    }
    return request.connection?.remoteAddress;
  }

  /**
   * Log HTTP request with masked sensitive data
   */
  private logRequest(request: Request, startTime: number): void {
    const service = getServiceName();
    const environment = getServiceEnvironment();
    const age = this.calculateAge(request, Date.now() - startTime);
    const client = this.getClientIp(request);
    const traceId = getCurrentTraceId();
    const spanId = getCurrentSpanId();

    const logData = {
      age,
      created: new Date().toISOString(),
      endpoint: request.url,
      environment,
      level: 'info',
      payload: {
        body: maskSensitiveFields(request.body),
        client,
        headers: maskSensitiveFields(request.headers),
        query: maskSensitiveFields(request.query),
        verb: request.method,
      },
      service,
      spanId,
      // tag: request.tag, // TODO: implement tag
      traceId,
      type: 'request',
    };

    this.logger.info('HTTP Request', logData);
  }

  /**
   * Log HTTP response with masked sensitive data
   */
  private logResponse(
    request: Request,
    response: Response,
    responseBody: unknown,
    duration: number,
    error?: Error
  ): void {
    const service = getServiceName();
    const environment = getServiceEnvironment();
    const age = this.calculateAge(request, duration);
    const client = this.getClientIp(request);
    const traceId = getCurrentTraceId();
    const spanId = getCurrentSpanId();

    const logData = {
      age,
      created: new Date().toISOString(),
      endpoint: request.url,
      environment,
      level: error ? 'error' : 'info',
      payload: {
        body: maskSensitiveFields(responseBody),
        client,
        status: response.statusCode,
        verb: request.method,
      },
      service,
      spanId,
      // tag: request.tag, // TODO: implement tag
      traceId,
      type: 'response',
    };

    if (error) {
      this.logger.error('HTTP Response Error', { ...logData, error: error.message });
    } else {
      this.logger.info('HTTP Response', logData);
    }
  }
}
