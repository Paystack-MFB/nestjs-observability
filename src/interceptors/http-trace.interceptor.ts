import type { AttributeValue, Exception } from '@opentelemetry/api';

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';

interface HttpError extends Error {
  stack?: string;
  status?: number;
}

// Express types
interface Request {
  _parsedUrl?: { pathname?: string };
  method: string;
  originalUrl: string;
  route?: { path?: string };
}

interface Response {
  statusCode: number;
}

/**
 * Interceptor to trace HTTP requests and collect metrics
 * This interceptor will:
 * 1. Create spans for each HTTP request
 * 2. Collect metrics about request duration and status
 * 3. Add trace context to logs
 */
@Injectable()
export class HttpTraceInterceptor implements NestInterceptor {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly logger: LoggerService
  ) {}

  intercept(executionContext: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (executionContext.getType() !== 'http') {
      return next.handle();
    }

    const request = executionContext.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = request;
    const routePath = this.normalizeRoute(request);
    const startTime = Date.now();

    // Log the incoming request
    this.logger.debug(`Incoming request: ${method} ${originalUrl}`, 'HttpTraceInterceptor');

    // Get the current active span or create one
    const tracer = trace.getTracer('nestjs-http');

    return tracer.startActiveSpan(`HTTP ${method} ${routePath}`, (span) => {
      // Add tags to the span
      span.setAttribute('http.method', method as AttributeValue);
      span.setAttribute('http.url', originalUrl as AttributeValue);
      span.setAttribute('http.route', routePath as AttributeValue);

      return next.handle().pipe(
        tap({
          error: (err: HttpError) => {
            const duration = (Date.now() - startTime) / 1000;
            const statusCode = err.status ?? 500;

            // Record metrics for error
            this.metricsService.recordHttpRequest(method, routePath, statusCode, duration);

            // Add error information to span
            span.setAttribute('http.status_code', String(statusCode) as AttributeValue);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: err.message,
            });
            span.recordException(err as unknown as Exception);

            // Log error
            this.logger.error(
              `Request error: ${method} ${originalUrl} ${String(statusCode)} - ${err.message}`,
              err.stack ?? '',
              'HttpTraceInterceptor'
            );

            // End the span
            span.end();
          },
          next: () => {
            const response = executionContext.switchToHttp().getResponse<Response>();
            const statusCode = response.statusCode;
            const duration = (Date.now() - startTime) / 1000; // Convert to seconds

            // Record metrics
            this.metricsService.recordHttpRequest(method, routePath, statusCode, duration);

            // Add response information to span
            span.setAttribute('http.status_code', String(statusCode) as AttributeValue);
            span.setStatus({
              code: statusCode < 400 ? SpanStatusCode.OK : SpanStatusCode.ERROR,
            });

            // Log successful request
            this.logger.debug(
              `Request completed: ${method} ${originalUrl} ${String(statusCode)} - ${String(duration.toFixed(3))}s`,
              'HttpTraceInterceptor'
            );

            // End the span
            span.end();
          },
        })
      );
    });
  }

  /**
   * Normalize a route path to avoid high cardinality in metrics
   * For example, /users/123 becomes /users/:id
   */
  private normalizeRoute(request: Request): string {
    // If NestJS router provides a route pattern, use it
    if (request.route?.path) {
      return request.route.path;
    }

    // If Express router information is available
    const route = request._parsedUrl?.pathname ?? request.originalUrl;

    // Basic normalization for routes with IDs
    return route
      .replace(/\/[0-9a-fA-F]{24}\b/g, '/:id') // MongoDB IDs
      .replace(/\/\d+\b/g, '/:id'); // Numeric IDs
  }
}
