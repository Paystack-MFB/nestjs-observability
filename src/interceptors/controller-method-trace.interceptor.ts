import type { AttributeValue, Exception } from '@opentelemetry/api';

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { LoggerService } from '../logger/logger.service';

// Express types for better typing
interface Request {
  method?: string;
  originalUrl?: string;
  route?: { path?: string };
}

/**
 * Interceptor to automatically trace controller methods
 * This interceptor replaces the need for @Trace() decorators on controller methods
 * by automatically creating spans for each method call.
 */
@Injectable()
export class ControllerMethodTraceInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(executionContext: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Get the class and handler names
    const className = executionContext.getClass().name;
    const handlerName = executionContext.getHandler().name;

    // Create a meaningful span name
    const spanName = `${className}.${handlerName}`;

    // Get the request method and path for HTTP requests
    let httpMethod = '';
    let httpPath = '';

    if (executionContext.getType() === 'http') {
      const request = executionContext.switchToHttp().getRequest<Request>();
      httpMethod = request.method ?? '';
      httpPath = request.route?.path ?? request.originalUrl ?? '';
    }

    // Get the tracer
    const tracer = trace.getTracer('controller-method-tracer');

    // Start a new span
    return tracer.startActiveSpan(spanName, (span: Span) => {
      // Add basic attributes
      span.setAttribute('class.name', className as AttributeValue);
      span.setAttribute('method.name', handlerName as AttributeValue);

      // Add HTTP attributes if available
      if (httpMethod) {
        span.setAttribute('http.method', httpMethod as AttributeValue);
      }

      if (httpPath) {
        span.setAttribute('http.path', httpPath as AttributeValue);
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
}
