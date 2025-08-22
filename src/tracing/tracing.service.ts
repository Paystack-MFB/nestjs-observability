import { Injectable } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import type { Tracer } from '@opentelemetry/api';

import { LoggerService } from '../logger/logger.service';

/**
 * Enhanced tracing service that integrates with OpenTelemetry global tracer provider
 * Provides utility methods for creating spans and managing trace context
 */
@Injectable()
export class TracingService {
  private readonly tracer: Tracer;

  constructor(private readonly logger: LoggerService) {
    // Get OpenTelemetry tracer from global provider
    const tracerProvider = trace.getTracerProvider();
    this.tracer = tracerProvider.getTracer('nestjs-app', '1.0.0');
  }

  /**
   * Get the OpenTelemetry tracer instance for advanced usage
   * @returns OpenTelemetry Tracer instance
   */
  getTracer(): Tracer {
    return this.tracer;
  }

  /**
   * Get the currently active span
   * @returns The active span or undefined if none exists
   */
  getActiveSpan() {
    return trace.getActiveSpan();
  }

  /**
   * Create a new span with the given name and execute a function within its context
   * @param spanName Name of the span
   * @param fn Function to execute within the span context
   * @returns The result of the function execution
   */
  createSpan<T>(spanName: string, fn: (span: any) => T): T {
    return this.tracer.startActiveSpan(spanName, (span) => {
      try {
        span.setAttributes({
          'instrumentation.type': 'manual',
          'service.name': this.getServiceName(),
        });

        const result = fn(span);

        // Handle async results
        if (result && typeof result === 'object' && 'then' in result) {
          return (result as unknown as Promise<any>)
            .then((value) => {
              span.setStatus({ code: 1 }); // OK
              return value;
            })
            .catch((error) => {
              span.setStatus({ code: 2, message: error.message }); // ERROR
              span.recordException(error);
              throw error;
            })
            .finally(() => {
              span.end();
            }) as T;
        }

        // Handle sync results
        span.setStatus({ code: 1 }); // OK
        span.end();
        return result;
      } catch (error) {
        span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
        span.recordException(error as any);
        span.end();
        throw error;
      }
    });
  }

  /**
   * Create a span without automatically executing a function
   * Useful when you need manual control over span lifecycle
   * @param spanName Name of the span
   * @returns The created span
   */
  startSpan(spanName: string) {
    const span = this.tracer.startSpan(spanName);
    span.setAttributes({
      'instrumentation.type': 'manual',
      'service.name': this.getServiceName(),
    });
    return span;
  }

  /**
   * Set attributes on the currently active span
   * @param attributes Object containing key-value pairs of attributes
   */
  setSpanAttributes(attributes: Record<string, string | number | boolean>): void {
    const span = this.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    } else {
      this.logger?.debug('No active span found to set attributes', { context: 'TracingService' });
    }
  }

  /**
   * Set a single attribute on the currently active span
   * @param key Attribute key
   * @param value Attribute value
   */
  setSpanAttribute(key: string, value: string | number | boolean): void {
    const span = this.getActiveSpan();
    if (span) {
      span.setAttribute(key, value);
    } else {
      this.logger?.debug('No active span found to set attribute', { context: 'TracingService' });
    }
  }

  /**
   * Add an event to the currently active span
   * @param name Event name
   * @param attributes Optional attributes for the event
   */
  addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    const span = this.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    } else {
      this.logger?.debug('No active span found to add event', { context: 'TracingService' });
    }
  }

  /**
   * Record an exception in the currently active span
   * @param exception The exception to record
   */
  recordException(exception: Error): void {
    const span = this.getActiveSpan();
    if (span) {
      span.recordException(exception);
      span.setStatus({ code: 2, message: exception.message }); // ERROR
    } else {
      this.logger?.debug('No active span found to record exception', { context: 'TracingService' });
    }
  }

  /**
   * Set the status of the currently active span
   * @param status Span status (OK = 1, ERROR = 2)
   * @param message Optional status message
   */
  setSpanStatus(status: 'OK' | 'ERROR', message?: string): void {
    const span = this.getActiveSpan();
    if (span) {
      const code = status === 'OK' ? 1 : 2;
      if (message) {
        span.setStatus({ code, message });
      } else {
        span.setStatus({ code });
      }
    } else {
      this.logger?.debug('No active span found to set status', { context: 'TracingService' });
    }
  }

  /**
   * End the currently active span
   */
  endActiveSpan(): void {
    const span = this.getActiveSpan();
    if (span) {
      span.end();
    } else {
      this.logger?.debug('No active span found to end', { context: 'TracingService' });
    }
  }

  /**
   * Execute a function with a custom trace context
   * @param spanName Name of the span
   * @param attributes Initial attributes for the span
   * @param fn Function to execute
   */
  withSpan<T>(
    spanName: string,
    attributes: Record<string, string | number | boolean> = {},
    fn: () => T
  ): T {
    return this.tracer.startActiveSpan(spanName, (span) => {
      // Set initial attributes
      span.setAttributes({
        'instrumentation.type': 'manual',
        'service.name': this.getServiceName(),
        ...attributes,
      });

      try {
        const result = fn();

        // Handle async results
        if (result && typeof result === 'object' && 'then' in result) {
          return (result as unknown as Promise<any>)
            .then((value) => {
              span.setStatus({ code: 1 }); // OK
              return value;
            })
            .catch((error) => {
              span.setStatus({ code: 2, message: error.message }); // ERROR
              span.recordException(error);
              throw error;
            })
            .finally(() => {
              span.end();
            }) as T;
        }

        // Handle sync results
        span.setStatus({ code: 1 }); // OK
        span.end();
        return result;
      } catch (error) {
        span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
        span.recordException(error as any);
        span.end();
        throw error;
      }
    });
  }

  /**
   * Get the current trace ID from the active span
   * @returns Trace ID string or undefined if no active span
   */
  getTraceId(): string | undefined {
    const span = this.getActiveSpan();
    if (span) {
      const spanContext = span.spanContext();
      return spanContext.traceId;
    }
    return undefined;
  }

  /**
   * Get the current span ID from the active span
   * @returns Span ID string or undefined if no active span
   */
  getSpanId(): string | undefined {
    const span = this.getActiveSpan();
    if (span) {
      const spanContext = span.spanContext();
      return spanContext.spanId;
    }
    return undefined;
  }

  /**
   * Get service name from environment variables
   * @returns Service name
   */
  private getServiceName(): string {
    return process.env['OTEL_SERVICE_NAME'] || 'nestjs-app';
  }

  /**
   * Check if tracing is enabled by checking if there's a valid tracer provider
   * @returns True if tracing is available
   */
  isTracingEnabled(): boolean {
    try {
      const provider = trace.getTracerProvider();
      return provider !== undefined;
    } catch {
      return false;
    }
  }
}