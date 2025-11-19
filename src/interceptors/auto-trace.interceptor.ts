import type { AttributeValue } from '@opentelemetry/api';

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import * as api from '@opentelemetry/api';
import { Exception, Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { getTraceOptions, isNoTraceClassEnabled, isNoTraceEnabled } from '../decorators/auto-trace.decorators';
import { LOGGER_CONTEXT_KEY, LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';

// Express types for better typing
interface Request {
  headers?: Record<string, string | string[]>;
  ip?: string;
  method?: string;
  originalUrl?: string;
  route?: { path?: string };
}

interface Response {
  statusCode?: number;
}

/**
 * Comprehensive auto-tracing interceptor that handles all controller method tracing
 *
 * This interceptor provides automatic tracing for controller methods without automatic argument capture.
 * Features:
 * - Automatically traces all controller methods
 * - Respects @NoTrace and @NoTraceClass decorators
 * - Applies @Trace decorator options
 * - Captures HTTP context
 * - Integrates with metrics collection
 * - Provides consistent span naming and attributes
 * - Users can manually add span attributes using the span attribute utilities
 */
@Injectable()
export class AutoTraceInterceptor implements NestInterceptor {
  private readonly tracer = trace.getTracer('auto-trace-interceptor');

  constructor(
    private readonly metricsService: MetricsService,
    private readonly logger: LoggerService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();
    const controllerClass = context.getClass();

    // Check if the class is marked with @NoTraceClass
    if (isNoTraceClassEnabled(controllerClass)) {
      return next.handle();
    }

    // Check if the method is marked with @NoTrace
    if (isNoTraceEnabled(controllerClass.prototype as object, handler.name)) {
      return next.handle();
    }

    // Get custom trace options if available
    const traceOptions = getTraceOptions(controllerClass.prototype as object, handler.name);

    const className = controllerClass.name;
    const methodName = handler.name;
    const spanName = traceOptions?.spanName ?? `${className}.${methodName}`;

    // Initialize logger context for HTTP requests
    if (context.getType() === 'http') {
      const loggerContextMap = new Map<string, unknown>();
      const otelContext = api.context.active().setValue(LOGGER_CONTEXT_KEY, loggerContextMap);

      // Wrap span creation in context.with() to ensure logger context is available
      return new Observable((subscriber) => {
        api.context.with(otelContext, () => {
          this.tracer.startActiveSpan(spanName, (span: Span) => {
            const startTime = Date.now();

            // Add controller-specific attributes
            span.setAttribute('controller.name', className as AttributeValue);
            span.setAttribute('controller.method', methodName as AttributeValue);
            span.setAttribute('instrumentation.type', 'auto-trace-interceptor' as AttributeValue);

            // Add HTTP attributes if this is an HTTP request
            this.addHttpAttributes(span, context);

            next
              .handle()
              .pipe(
                tap({
                  error: (error: Error) => {
                    const duration = (Date.now() - startTime) / 1000;

                    // Handle error in span
                    this.handleError(span, error);

                    // Update metrics
                    this.updateMetrics(context, duration);

                    this.logger.error(`Error in ${spanName} after ${duration.toFixed(3)}s: ${error.message}`, {
                      context: 'AutoTraceInterceptor',
                      stack: error.stack,
                    });
                  },
                  finalize: () => {
                    // Always end the span
                    span.end();
                  },
                  next: (value: unknown) => {
                    const duration = (Date.now() - startTime) / 1000;

                    // Set span status to OK
                    span.setStatus({ code: SpanStatusCode.OK });

                    // Update metrics
                    this.updateMetrics(context, duration);
                    return value;
                  },
                })
              )
              .subscribe(subscriber);
          });
        });
      });
    }

    // For non-HTTP requests, use original pattern without logger context initialization
    return this.tracer.startActiveSpan(spanName, (span: Span) => {
      const startTime = Date.now();

      // Add controller-specific attributes
      span.setAttribute('controller.name', className as AttributeValue);
      span.setAttribute('controller.method', methodName as AttributeValue);
      span.setAttribute('instrumentation.type', 'auto-trace-interceptor' as AttributeValue);

      // Add HTTP attributes if this is an HTTP request
      this.addHttpAttributes(span, context);

      return next.handle().pipe(
        tap({
          error: (error: Error) => {
            const duration = (Date.now() - startTime) / 1000;

            // Handle error in span
            this.handleError(span, error);

            // Update metrics
            this.updateMetrics(context, duration);

            this.logger.error(`Error in ${spanName} after ${duration.toFixed(3)}s: ${error.message}`, {
              context: 'AutoTraceInterceptor',
              stack: error.stack,
            });
          },
          finalize: () => {
            // Always end the span
            span.end();
          },
          next: (value: unknown) => {
            const duration = (Date.now() - startTime) / 1000;

            // Set span status to OK
            span.setStatus({ code: SpanStatusCode.OK });

            // Update metrics
            this.updateMetrics(context, duration);
            return value;
          },
        })
      );
    });
  }

  /**
   * Adds HTTP-specific attributes to the span
   */
  private addHttpAttributes(span: Span, context: ExecutionContext): void {
    if (context.getType() !== 'http') {
      return;
    }

    try {
      const request = context.switchToHttp().getRequest<Request>();
      const response = context.switchToHttp().getResponse<Response>();

      // HTTP method
      if (request.method) {
        span.setAttribute('http.method', request.method as AttributeValue);
      }

      // HTTP path/route
      const httpPath = request.route?.path ?? request.originalUrl ?? '';
      if (httpPath) {
        span.setAttribute('http.path', httpPath as AttributeValue);
      }

      // Client IP
      if (request.ip) {
        span.setAttribute('http.client_ip', request.ip as AttributeValue);
      }

      // User agent
      const userAgent = request.headers?.['user-agent'];
      if (userAgent && typeof userAgent === 'string') {
        span.setAttribute('http.user_agent', userAgent as AttributeValue);
      }

      // Response status code (if available)
      if (response.statusCode) {
        span.setAttribute('http.status_code', response.statusCode as AttributeValue);
      }
    } catch (error) {
      this.logger.warn(`Failed to add HTTP attributes: ${(error as Error).message}`, {
        context: 'AutoTraceInterceptor',
      });
    }
  }

  /**
   * Handles errors in the span
   */
  private handleError(span: Span, error: Error): void {
    // Set span status to ERROR
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });

    // Record the exception
    span.recordException(error as unknown as Exception);

    // Add error attributes
    span.setAttribute('error.type', error.constructor.name as AttributeValue);
    span.setAttribute('error.message', error.message as AttributeValue);

    if (error.stack) {
      span.setAttribute('error.stack', error.stack as AttributeValue);
    }
  }

  /**
   * Updates metrics for the traced method
   */
  private updateMetrics(context: ExecutionContext, duration: number): void {
    try {
      // Use the existing HTTP metrics method if this is an HTTP request
      if (context.getType() === 'http') {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();

        this.metricsService.recordHttpRequest(
          request.method ?? 'unknown',
          request.route?.path ?? request.originalUrl ?? 'unknown',
          response.statusCode ?? 200,
          duration
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to update metrics: ${(error as Error).message}`, { context: 'AutoTraceInterceptor' });
    }
  }
}
