import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { isNoLogClassEnabled, isNoLogEnabled } from '../decorators/auto-trace.decorators';
import { LoggerService } from '../logger/logger.service';
import { getHttpRequestLoggingEnabled } from '../sdk-core';
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
 * Logs all HTTP requests and responses with sensitive data masking (respecting configuration)
 *
 * Features:
 * - Logs request/response only when OTEL_LOG_HTTP_REQUESTS=true AND @NoLog/@NoLogClass decorators allow
 * - Logs request on entry with masked headers, query, and body
 * - Logs response on completion with masked body
 * - Follows Paystack log format standards
 * - Includes trace correlation (traceId, spanId)
 * - Respects @NoLog and @NoLogClass decorators to skip HTTP logging
 * - Note: Request-scoped logger context is initialized in LoggerContextMiddleware
 * - Context automatically propagates through async operations
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Logger context is already initialized by LoggerContextMiddleware
    // No need to wrap in api.context.with() again - just handle logging

    // Only log if conditions are met
    if (this.shouldLog(context)) {
      this.logRequest(request);
    }

    // Handle response
    return next.handle().pipe(
      tap({
        error: (error: Error) => {
          if (this.shouldLog(context)) {
            this.logResponse(request, response, undefined, error);
          }
        },
        next: (responseBody: unknown) => {
          if (this.shouldLog(context)) {
            this.logResponse(request, response, responseBody);
          }
        },
      })
    );
  }

  /**
   * Determines whether to log this request based on configuration and decorators
   */
  private shouldLog(context: ExecutionContext): boolean {
    // Check if HTTP request logging is enabled
    if (!getHttpRequestLoggingEnabled()) {
      return false;
    }

    const handler = context.getHandler();
    const controllerClass = context.getClass();

    // Respect @NoLog decorators
    if (isNoLogClassEnabled(controllerClass)) {
      return false;
    }

    if (isNoLogEnabled(controllerClass.prototype as object, handler.name)) {
      return false;
    }

    return true;
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
  private logRequest(request: Request): void {
    const client = this.getClientIp(request);

    // Parse URL to extract pathname only (without query params)
    const url = new URL(request.url ?? '/', 'http://localhost');
    const endpoint = url.pathname;

    const logData = {
      endpoint,
      payload: {
        body: maskSensitiveFields(request.body),
        client,
        headers: maskSensitiveFields(request.headers),
        query: maskSensitiveFields(request.query),
        verb: request.method,
      },
      type: 'request',
    };

    this.logger.info('HTTP Request', logData);
  }

  /**
   * Log HTTP response with masked sensitive data
   */
  private logResponse(request: Request, response: Response, responseBody: unknown, error?: Error): void {
    const client = this.getClientIp(request);

    // Parse URL to extract pathname only (without query params)
    const url = new URL(request.url ?? '/', 'http://localhost');
    const endpoint = url.pathname;

    const logData = {
      endpoint,
      payload: {
        body: maskSensitiveFields(responseBody),
        client,
        status: response.statusCode,
        verb: request.method,
      },
      type: 'response',
    };

    if (error) {
      this.logger.error('HTTP Response Error', { ...logData, error: error.message });
    } else {
      this.logger.info('HTTP Response', logData);
    }
  }
}
