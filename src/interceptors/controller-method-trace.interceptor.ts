import type { AttributeValue, Exception } from '@opentelemetry/api';

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { LoggerService } from '../logger/logger.service';
import { AutoInstrumentationService } from '../services/auto-instrumentation.service';

// Express types for better typing
interface Request {
  method?: string;
  originalUrl?: string;
  route?: { path?: string };
}

/**
 * Interceptor to automatically trace controller methods
 * This interceptor coordinates with the AutoInstrumentationService to prevent duplicate spans:
 * - If a method is auto-instrumented, it adds HTTP attributes to the existing span
 * - If a method is not auto-instrumented, it creates a new span (fallback behavior)
 */
@Injectable()
export class ControllerMethodTraceInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(executionContext: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Get the class and handler names
    const className = executionContext.getClass().name;
    const handlerName = executionContext.getHandler().name;

    // Check if this method is already auto-instrumented
    const isAutoInstrumented = AutoInstrumentationService.isMethodInstrumented(className, handlerName);

    if (isAutoInstrumented) {
      // Method is auto-instrumented, add HTTP attributes to existing span
      return this.addHttpAttributesToExistingSpan(executionContext, next);
    } else {
      // Method is not auto-instrumented, create a new span (fallback behavior)
      return this.createNewSpan(executionContext, next);
    }
  }

  /**
   * Adds HTTP-specific attributes to an existing span created by auto-instrumentation
   */
  private addHttpAttributesToExistingSpan(executionContext: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Get HTTP information if available
    const httpInfo = this.getHttpInformation(executionContext);

    if (httpInfo.httpMethod || httpInfo.httpPath) {
      // Get the active span and add HTTP attributes
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        if (httpInfo.httpMethod) {
          activeSpan.setAttribute('http.method', httpInfo.httpMethod as AttributeValue);
        }
        if (httpInfo.httpPath) {
          activeSpan.setAttribute('http.path', httpInfo.httpPath as AttributeValue);
        }
        activeSpan.setAttribute('tracing.coordination', 'interceptor-enhanced' as AttributeValue);
      }
    }

    // Simply pass through to the next handler - the auto-instrumentation will handle tracing
    return next.handle().pipe(
      tap({
        error: (error: Error) => {
          this.logger.debug(
            `Auto-instrumented method ${executionContext.getClass().name}.${executionContext.getHandler().name} error: ${error.message}`,
            'ControllerMethodTraceInterceptor'
          );
        },
        next: () => {
          this.logger.debug(
            `Auto-instrumented method ${executionContext.getClass().name}.${executionContext.getHandler().name} completed`,
            'ControllerMethodTraceInterceptor'
          );
        },
      })
    );
  }

  /**
   * Creates a new span for methods that are not auto-instrumented (fallback behavior)
   */
  private createNewSpan(executionContext: ExecutionContext, next: CallHandler): Observable<unknown> {
    const className = executionContext.getClass().name;
    const handlerName = executionContext.getHandler().name;

    // Create a meaningful span name
    const spanName = `${className}.${handlerName}`;

    // Get HTTP information
    const httpInfo = this.getHttpInformation(executionContext);

    // Get the tracer
    const tracer = trace.getTracer('controller-method-tracer');

    // Start a new span
    return tracer.startActiveSpan(spanName, (span: Span) => {
      // Add basic attributes
      span.setAttribute('class.name', className as AttributeValue);
      span.setAttribute('method.name', handlerName as AttributeValue);
      span.setAttribute('instrumentation.type', 'interceptor-fallback' as AttributeValue);

      // Add HTTP attributes if available
      if (httpInfo.httpMethod) {
        span.setAttribute('http.method', httpInfo.httpMethod as AttributeValue);
      }

      if (httpInfo.httpPath) {
        span.setAttribute('http.path', httpInfo.httpPath as AttributeValue);
      }

      const startTime = Date.now();

      return next.handle().pipe(
        tap({
          error: (error: Error) => {
            const duration = (Date.now() - startTime) / 1000;

            // Set the span status to ERROR
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message,
            });

            // Record the exception in the span
            span.recordException(error as unknown as Exception);

            // Log error
            this.logger.error(
              `Error executing ${spanName} after ${duration.toFixed(3)}s: ${error.message}`,
              error.stack ?? '',
              'ControllerMethodTraceInterceptor'
            );

            // End the span
            span.end();
          },
          next: (value: unknown) => {
            // Set the span status to OK
            span.setStatus({ code: SpanStatusCode.OK });

            // End the span
            span.end();

            return value;
          },
        })
      );
    });
  }

  /**
   * Extracts HTTP information from the execution context
   */
  private getHttpInformation(executionContext: ExecutionContext): { httpMethod?: string; httpPath?: string } {
    if (executionContext.getType() !== 'http') {
      return {};
    }

    const request = executionContext.switchToHttp().getRequest<Request>();
    const httpMethod = request.method ?? '';
    const httpPath = request.route?.path ?? request.originalUrl ?? '';

    const result: { httpMethod?: string; httpPath?: string } = {};

    if (httpMethod) {
      result.httpMethod = httpMethod;
    }

    if (httpPath) {
      result.httpPath = httpPath;
    }

    return result;
  }
}
