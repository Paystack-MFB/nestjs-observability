import type { AttributeValue, Exception } from '@opentelemetry/api';

import { CallHandler, ExecutionContext, Inject, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { ObservabilityConfig } from '../config/observability.config';
import {
  getTraceMethodOptions,
  isNoTraceClassEnabled,
  isNoTraceEnabled,
  TraceMethodOptions,
} from '../decorators/auto-trace.decorators';
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
 * This interceptor replaces the complex AutoInstrumentationService approach with a simpler
 * interceptor-based solution that:
 * - Automatically traces all controller methods
 * - Respects @NoTrace and @NoTraceClass decorators
 * - Applies @TraceMethod decorator options
 * - Captures HTTP context and arguments
 * - Integrates with metrics collection
 * - Provides consistent span naming and attributes
 * - Uses configurable argument sanitization
 */
@Injectable()
export class AutoTraceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AutoTraceInterceptor.name);
  private readonly tracer = trace.getTracer('auto-trace-interceptor');

  constructor(
    private readonly metricsService: MetricsService,
    @Inject('OBSERVABILITY_CONFIG') private readonly config: ObservabilityConfig
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Safely get the controller class and method handler
    const controllerClass = context.getClass();
    const methodHandler = context.getHandler();

    // Ensure we have valid controller and method names
    if (!controllerClass.name || !methodHandler.name) {
      this.logger.warn('Invalid execution context - missing controller or method handler', 'AutoTraceInterceptor');
      return next.handle();
    }

    const className = controllerClass.name;
    const methodName = methodHandler.name;

    // Check for @NoTrace decorator on method or @NoTraceClass on class
    if (this.hasNoTrace(context)) {
      this.logger.debug(
        `Skipping tracing for ${className}.${methodName} due to @NoTrace decorator`,
        'AutoTraceInterceptor'
      );
      return next.handle();
    }

    // Get @TraceMethod options if present
    const traceOptions = this.getTraceMethodOptions(context);
    const spanName = traceOptions?.spanName ?? `${className}.${methodName}`;

    // Create span with full context
    return this.tracer.startActiveSpan(spanName, (span: Span) => {
      const startTime = Date.now();

      // Add controller-specific attributes
      span.setAttribute('controller.name', className as AttributeValue);
      span.setAttribute('controller.method', methodName as AttributeValue);
      span.setAttribute('instrumentation.type', 'auto-trace-interceptor' as AttributeValue);

      // Add HTTP attributes if this is an HTTP request
      this.addHttpAttributes(span, context);

      // Add arguments if enabled
      if (this.config.tracing.argumentSanitization.enabled && traceOptions?.captureArgs !== false) {
        this.addArgumentAttributes(span, context);
      }

      this.logger.debug(`Started tracing ${spanName}`, 'AutoTraceInterceptor');

      return next.handle().pipe(
        tap({
          error: (error: Error) => {
            const duration = (Date.now() - startTime) / 1000;

            // Handle error in span
            this.handleError(span, error);

            // Update metrics
            this.updateMetrics(context, duration);

            this.logger.error(
              `Error in ${spanName} after ${duration.toFixed(3)}s: ${error.message}`,
              error.stack ?? '',
              'AutoTraceInterceptor'
            );
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

            this.logger.debug(`Completed tracing ${spanName} in ${duration.toFixed(3)}s`, 'AutoTraceInterceptor');

            return value;
          },
        })
      );
    });
  }

  /**
   * Adds method argument attributes to the span
   */
  private addArgumentAttributes(span: Span, context: ExecutionContext): void {
    try {
      const args = context.getArgs();

      if (args.length > 0) {
        // Add argument count
        span.setAttribute('method.args.count', args.length as AttributeValue);

        // Add sanitized argument values
        args.forEach((arg, index) => {
          if (arg !== undefined && arg !== null) {
            const sanitizedValue = this.sanitizeArgument(arg);
            if (sanitizedValue !== null) {
              span.setAttribute(`method.args.${String(index)}`, sanitizedValue as AttributeValue);
            }
          }
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to add argument attributes: ${(error as Error).message}`, 'AutoTraceInterceptor');
    }
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
      this.logger.warn(`Failed to add HTTP attributes: ${(error as Error).message}`, 'AutoTraceInterceptor');
    }
  }

  /**
   * Gets the default sensitive patterns used for argument sanitization
   */
  private getDefaultSensitivePatterns(): RegExp[] {
    return [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /auth/i,
      /bearer/i,
      /jwt/i,
      /credit/i,
      /card/i,
      /ssn/i,
      /social/i,
    ];
  }

  /**
   * Gets the complete list of sensitive patterns (default + user-configured)
   */
  private getSensitivePatterns(): RegExp[] {
    const defaultPatterns = this.getDefaultSensitivePatterns();
    const additionalPatterns = this.config.tracing.argumentSanitization.additionalSensitivePatterns;
    return [...defaultPatterns, ...additionalPatterns];
  }

  /**
   * Gets @TraceMethod options from the method handler
   */
  private getTraceMethodOptions(context: ExecutionContext): TraceMethodOptions | undefined {
    const methodHandler = context.getHandler();
    return getTraceMethodOptions(methodHandler, 'method');
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
   * Checks if a method or class has @NoTrace decorator
   */
  private hasNoTrace(context: ExecutionContext): boolean {
    const methodHandler = context.getHandler();
    const controllerClass = context.getClass();

    // Check for @NoTrace on method
    if (isNoTraceEnabled(methodHandler, 'method')) {
      return true;
    }

    // Check for @NoTraceClass on controller
    if (isNoTraceClassEnabled(controllerClass)) {
      return true;
    }

    return false;
  }

  /**
   * Checks if a value looks sensitive and should be redacted
   */
  private isSensitiveValue(value: string): boolean {
    const sensitivePatterns = this.getSensitivePatterns();
    return sensitivePatterns.some((pattern) => pattern.test(value));
  }

  /**
   * Sanitizes an argument value for safe inclusion in spans
   */
  private sanitizeArgument(arg: unknown): null | string {
    if (arg === null || arg === undefined) {
      return null;
    }

    const sanitizationConfig = this.config.tracing.argumentSanitization;

    // Handle primitive types
    if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
      const stringValue = String(arg);

      // Skip sensitive-looking values
      if (this.isSensitiveValue(stringValue)) {
        return sanitizationConfig.redactedPlaceholder;
      }

      // Truncate long strings
      return stringValue.length > sanitizationConfig.maxStringLength
        ? `${stringValue.substring(0, sanitizationConfig.maxStringLength)}...`
        : stringValue;
    }

    // Handle objects
    if (typeof arg === 'object') {
      try {
        // Extract useful identifiers
        const obj = arg as Record<string, unknown>;
        const identifiers: string[] = [];

        // Use configured identifier fields
        for (const field of sanitizationConfig.identifierFields) {
          if (obj[field] !== undefined && obj[field] !== null) {
            const value = obj[field];
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            if (!this.isSensitiveValue(stringValue)) {
              identifiers.push(`${field}=${stringValue}`);
            }
          }
        }

        return identifiers.length > 0 ? `{${identifiers.join(', ')}}` : '[Object]';
      } catch {
        return '[Object]';
      }
    }

    // Handle other types safely
    try {
      return JSON.stringify(arg);
    } catch {
      return '[Unknown]';
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
      this.logger.warn(`Failed to update metrics: ${(error as Error).message}`, 'AutoTraceInterceptor');
    }
  }
}
