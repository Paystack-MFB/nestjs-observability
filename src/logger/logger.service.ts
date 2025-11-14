import { Injectable } from '@nestjs/common';
import { context, trace } from '@opentelemetry/api';
import { Logger, logs } from '@opentelemetry/api-logs';

import { getServiceName, getServiceVersion } from '../register';
import { maskSensitiveFields } from '../utils/mask-sensitive-fields';

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
  info(message: string, data?: Record<string, unknown>): void {
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
    // Prepare enriched attributes
    const enrichedData = {
      ...data,
      ...this.persistentContext,
    };

    // Mask sensitive fields in all log data
    const maskedData = maskSensitiveFields(enrichedData);

    // Determine the log body and sanitize it to prevent log injection
    const rawBody = message instanceof Error ? message.message : message;
    const sanitizedBody = this.sanitizeLogMessage(rawBody);

    const activeSpan = trace.getActiveSpan();
    const logContext = activeSpan ? trace.setSpan(context.active(), activeSpan) : context.active();

    try {
      // Emit structured log record with masked data
      this.otelLogger.emit({
        attributes: maskedData as Record<string, boolean | number | string | string[]>,
        body: sanitizedBody,
        context: logContext,
        severityText: level,
        ...(message instanceof Error && { exception: message }),
      });
    } catch (error) {
      // Fallback to console if OpenTelemetry logging fails
      console.error('LoggerService emit failed:', error);
      // Note: Console fallback logging removed to avoid potential log injection
    }
  }

  /**
   * Recursively sanitize all string values in an object to prevent log injection
   * This ensures that any user-provided data in the logging context is safe
   */
  private sanitizeLogData(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }
    if (typeof obj === 'string') {
      return this.sanitizeLogMessage(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeLogData(item));
    }
    if (typeof obj === 'object') {
      const sanitizedObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        // Sanitize both keys and values to be extra safe
        const sanitizedKey = typeof key === 'string' ? this.sanitizeLogMessage(key) : key;
        sanitizedObj[sanitizedKey] = this.sanitizeLogData(value);
      }
      return sanitizedObj;
    }
    return obj; // number, boolean, etc.
  }

  /**
   * Sanitize log message to prevent log injection attacks
   * Removes all control characters that could be used to forge log entries
   */
  private sanitizeLogMessage(message: string): string {
    if (typeof message !== 'string') {
      return String(message);
    }

    // Remove all line endings, tabs, nulls, and other control characters, replacing with nothing
    // Covers: \r, \n, \t, \0, ASCII 0x01-0x1F, and 0x7F (DEL)
    // For further safety, also trim whitespace at the ends
    // Use character code filtering to avoid ESLint control-regex warnings
    return message
      .replace(/[\r\n\t\0]/g, '') // Remove common control chars
      .split('')
      .filter((char) => {
        const code = char.charCodeAt(0);
        // Keep all characters except control characters (0x01-0x1F and 0x7F)
        return !(code >= 1 && code <= 31) && code !== 127;
      })
      .join('')
      .trim();
  }
}
