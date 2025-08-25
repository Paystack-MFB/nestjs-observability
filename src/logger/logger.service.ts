import { Injectable } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { Logger, logs } from '@opentelemetry/api-logs';

/**
 * Enhanced NestJS logger that integrates with OpenTelemetry global providers
 * Provides structured logging with automatic trace context correlation
 * Uses singleton scope for better performance
 */
@Injectable()
export class LoggerService {
  private readonly otelLogger: Logger;
  private persistentContext: Record<string, unknown> = {};

  constructor() {
    // Get OpenTelemetry logger from global provider
    const loggerProvider = logs.getLoggerProvider();
    this.otelLogger = loggerProvider.getLogger('nestjs-app', '1.0.0');
  }

  /**
   * Add a single context key-value pair
   */
  addContext(key: string, value: unknown): void {
    this.persistentContext[key] = value;
  }

  /**
   * Clear all persistent context
   */
  clearContext(): void {
    this.persistentContext = {};
  }

  /**
   * Create a child logger with inherited context
   */
  createChildLogger(): LoggerService {
    const childLogger = new LoggerService();
    childLogger.setContext(this.persistentContext);
    return childLogger;
  }

  /**
   * Log debug level message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.emit('DEBUG', message, data);
  }

  /**
   * Log error level message
   */
  error(message: Error | string, data?: Record<string, unknown>): void {
    this.emit('ERROR', message, data);
  }

  /**
   * Log info level message
   */
  log(message: string, data?: Record<string, unknown>): void {
    this.emit('INFO', message, data);
  }

  /**
   * Set context that persists across log calls
   */
  setContext(context: Record<string, unknown>): void {
    Object.assign(this.persistentContext, context);
  }

  /**
   * Log warning level message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.emit('WARN', message, data);
  }

  /**
   * Core method that emits logs to OpenTelemetry
   */
  private emit(level: string, message: Error | string, data?: Record<string, unknown>): void {
    try {
      // Prepare enriched attributes
      const enrichedData = {
        ...data,
        ...this.persistentContext,
        ...this.getTraceContext(),
      };

      // Determine the log body
      const body = message instanceof Error ? message.message : message;

      // Emit structured log record
      this.otelLogger.emit({
        attributes: enrichedData as Record<string, boolean | number | string | string[]>,
        body,
        severityText: level,
        ...(message instanceof Error && { exception: message }),
      });
    } catch (error) {
      // Fallback to console if OpenTelemetry logging fails
      console.error('LoggerService emit failed:', error);
      console.log(`[${level}] ${message instanceof Error ? message.message : message}`, data);
    }
  }

  /**
   * Get current OpenTelemetry trace context
   */
  private getTraceContext(): Record<string, unknown> {
    try {
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        return {
          spanId: spanContext.spanId,
          traceFlags: spanContext.traceFlags,
          traceId: spanContext.traceId,
        };
      }
    } catch (_error) {
      // Silently ignore tracing errors to prevent affecting application flow
    }
    return {};
  }
}
