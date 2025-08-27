import { Injectable } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { Logger, logs } from '@opentelemetry/api-logs';

import { getServiceName, getServiceVersion } from '../register';

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
    const loggerProvider = typeof logs.getLoggerProvider === 'function' ? logs.getLoggerProvider() : undefined;
    const resolved =
      loggerProvider && typeof loggerProvider.getLogger === 'function'
        ? loggerProvider.getLogger(getServiceName(), getServiceVersion())
        : undefined;
    this.otelLogger = resolved ?? ({ emit: (_r: unknown) => undefined } as unknown as Logger);
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
      // Sanitize message to prevent log injection attacks while maintaining format compatibility
      const sanitizedMessage = this.sanitizeLogMessage(message instanceof Error ? message.message : message);
      // Use %s format specifier to prevent format string injection attacks
      console.log('[%s] %s', level, sanitizedMessage, data);
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

  /**
   * Sanitize log message to prevent log injection attacks
   * Removes newlines and control characters that could be used to forge log entries
   */
  private sanitizeLogMessage(message: string): string {
    if (typeof message !== 'string') {
      return String(message);
    }

    // Replace dangerous characters that could be used for log injection
    // Use a safer approach that avoids ESLint control character warnings
    let sanitized = message;

    // Replace various line endings and control characters
    sanitized = sanitized.replace(/\r\n/g, ' [CRLF] '); // Windows line endings
    sanitized = sanitized.replace(/\n/g, ' [LF] '); // Unix line endings
    sanitized = sanitized.replace(/\r/g, ' [CR] '); // Mac line endings
    sanitized = sanitized.replace(/\t/g, ' [TAB] '); // Tabs

    // Replace null bytes and other problematic characters using char codes
    // This avoids ESLint control character warnings
    sanitized = sanitized.replace(/\0/g, ' [NULL] ');

    // Replace other control characters by checking character codes
    sanitized = sanitized.replace(/./g, (char) => {
      const code = char.charCodeAt(0);
      // Replace control characters (0x01-0x1F excluding already handled ones, and 0x7F)
      if ((code >= 1 && code <= 8) || (code >= 11 && code <= 12) || (code >= 14 && code <= 31) || code === 127) {
        return ' [CTRL] ';
      }
      return char;
    });

    return sanitized;
  }
}
