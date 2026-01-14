import type { Span, Tracer } from '@opentelemetry/api';

import { Injectable } from '@nestjs/common';
import { trace } from '@opentelemetry/api';

import { getServiceAttributes, getServiceName, getServiceVersion } from '../sdk-core';

/**
 * Enhanced tracing service that integrates with OpenTelemetry global tracer provider
 * Provides utility methods for creating spans and managing trace context
 */
@Injectable()
export class TracingService {
  private readonly tracer: Tracer;

  constructor() {
    // Get OpenTelemetry tracer from global provider
    const tracerProvider = typeof trace.getTracerProvider === 'function' ? trace.getTracerProvider() : undefined;
    const resolvedTracer =
      tracerProvider && typeof tracerProvider.getTracer === 'function'
        ? tracerProvider.getTracer(getServiceName(), getServiceVersion())
        : ({
            startActiveSpan: (_name: string, fn: (span: unknown) => unknown) => {
              const noOpSpan = {
                addEvent: () => undefined,
                end: () => undefined,
                recordException: () => undefined,
                setAttribute: () => undefined,
                setAttributes: () => undefined,
                setStatus: () => undefined,
                spanContext: () => ({ spanId: '', traceFlags: 0, traceId: '' }),
              };
              return fn(noOpSpan);
            },
            startSpan: () => ({
              addEvent: () => undefined,
              end: () => undefined,
              recordException: () => undefined,
              setAttribute: () => undefined,
              setAttributes: () => undefined,
              setStatus: () => undefined,
              spanContext: () => ({ spanId: '', traceFlags: 0, traceId: '' }),
            }),
          } as unknown as Tracer);
    this.tracer = resolvedTracer;
  }

  /**
   * Add an event to the currently active span
   * @param name Event name
   * @param attributes Optional attributes for the event
   */
  addSpanEvent(name: string, attributes?: Record<string, boolean | number | string>): void {
    const span = this.getActiveSpan();
    if (!span) {
      return;
    }

    span.addEvent(name, attributes);
  }

  /**
   * Create a new span with the given name and execute a function within its context
   * @param spanName Name of the span
   * @param fn Function to execute within the span context
   * @returns The result of the function execution
   */
  createSpan<T>(spanName: string, fn: (span: Span) => T): T {
    return this.tracer.startActiveSpan(spanName, (span) => {
      try {
        span.setAttributes(getServiceAttributes());

        const result = fn(span);

        // Handle async results
        if (result && typeof result === 'object' && 'then' in result) {
          return (result as unknown as Promise<T>)
            .then((value) => {
              span.setStatus({ code: 1 }); // OK
              return value;
            })
            .catch((error: unknown) => {
              span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
              span.recordException(error as Error);
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
      } catch (error: unknown) {
        span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
        span.recordException(error as Error);
        span.end();
        throw error;
      }
    });
  }

  /**
   * End the currently active span
   */
  endActiveSpan(): void {
    const span = this.getActiveSpan();
    if (!span) {
      return;
    }

    span.end();
  }

  /**
   * Get the currently active span
   * @returns The active span or undefined if none exists
   */
  getActiveSpan(): Span | undefined {
    return trace.getActiveSpan();
  }

  /**
   * Get the current span ID from the active span
   * @returns Span ID string or undefined if no active span
   */
  getSpanId(): string | undefined {
    const span = this.getActiveSpan();
    if (!span) {
      return;
    }

    const spanContext = span.spanContext();
    return spanContext.spanId;
  }

  /**
   * Get the current trace ID from the active span
   * @returns Trace ID string or undefined if no active span
   */
  getTraceId(): string | undefined {
    const span = this.getActiveSpan();
    if (!span) {
      return;
    }

    const spanContext = span.spanContext();
    return spanContext.traceId;
  }

  /**
   * Get the OpenTelemetry tracer instance for advanced usage
   * @returns OpenTelemetry Tracer instance
   */
  getTracer(): Tracer {
    return this.tracer;
  }

  /**
   * Check if tracing is enabled by checking if there's a valid tracer provider
   * @returns True if tracing is available
   */
  isTracingEnabled(): boolean {
    try {
      const provider = trace.getTracerProvider();
      return !!provider;
    } catch {
      return false;
    }
  }

  /**
   * Record an exception in the currently active span
   * @param exception The exception to record
   */
  recordException(exception: Error): void {
    const span = this.getActiveSpan();
    if (!span) {
      return;
    }

    span.recordException(exception);
    span.setStatus({ code: 2, message: exception.message }); // ERROR
  }

  /**
   * Set a single attribute on the currently active span
   * @param key Attribute key
   * @param value Attribute value
   */
  setSpanAttribute(key: string, value: boolean | number | string): void {
    const span = this.getActiveSpan();
    if (!span) {
      return;
    }

    span.setAttribute(key, value);
  }

  /**
   * Set attributes on the currently active span
   * @param attributes Object containing key-value pairs of attributes
   */
  setSpanAttributes(attributes: Record<string, boolean | number | string>): void {
    const span = this.getActiveSpan();
    if (!span) {
      return;
    }

    span.setAttributes(attributes);
  }

  /**
   * Set the status of the currently active span
   * @param status Span status (OK = 1, ERROR = 2)
   * @param message Optional status message
   */
  setSpanStatus(status: 'ERROR' | 'OK', message?: string): void {
    const span = this.getActiveSpan();
    if (!span) {
      return;
    }

    const code = status === 'OK' ? 1 : 2;
    if (message) {
      span.setStatus({ code, message });
    } else {
      span.setStatus({ code });
    }
  }

  /**
   * Create a span without automatically executing a function
   * Useful when you need manual control over span lifecycle
   * @param spanName Name of the span
   * @returns The created span
   */
  startSpan(spanName: string): Span {
    const span = this.tracer.startSpan(spanName);
    span.setAttributes(getServiceAttributes());
    return span;
  }

  /**
   * Execute a function with a custom trace context
   * @param spanName Name of the span
   * @param attributes Initial attributes for the span
   * @param fn Function to execute
   */
  withSpan<T>(spanName: string, attributes: Record<string, boolean | number | string> = {}, fn: () => T): T {
    return this.tracer.startActiveSpan(spanName, (span) => {
      // Set initial attributes
      span.setAttributes({
        ...getServiceAttributes(),
        ...attributes,
      });

      try {
        const result = fn();

        // Handle async results
        if (result && typeof result === 'object' && 'then' in result) {
          return (result as unknown as Promise<T>)
            .then((value) => {
              span.setStatus({ code: 1 }); // OK
              return value;
            })
            .catch((error: unknown) => {
              span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
              span.recordException(error as Error);
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
      } catch (error: unknown) {
        span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
        span.recordException(error as Error);
        span.end();
        throw error;
      }
    });
  }
}
