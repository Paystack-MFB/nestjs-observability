import { Injectable } from '@nestjs/common';
import { Context, context, createContextKey, trace } from '@opentelemetry/api';
import { Logger, logs } from '@opentelemetry/api-logs';

import { getServiceName, getServiceVersion } from '../register';
import { maskSensitiveFields } from '../utils/mask-sensitive-fields';

// Context key for storing request-scoped logger context
export const LOGGER_CONTEXT_KEY = createContextKey('logger-context');

/**
 * Enhanced NestJS logger that integrates with OpenTelemetry global providers
 * Provides structured logging with automatic trace context correlation
 * Uses singleton scope for better performance
 */
@Injectable()
export class LoggerService {
  private readonly otelLogger: Logger;
  private isolatedContext?: Context;

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
   * Execute function within the logger's isolated context (for child loggers)
   * or in the active context (for root loggers)
   */
  private executeInContext<T>(fn: () => T): T {
    if (this.isolatedContext) {
      return context.with(this.isolatedContext, fn);
    }
    return fn();
  }

  /**
   * Get the current logger context as a plain object
   */
  getContext(): Record<string, unknown> {
    return this.executeInContext(() => {
      const ctx = context.active();
      const map = ctx.getValue(LOGGER_CONTEXT_KEY) as Map<string, unknown> | undefined;

      if (!map) {
        return {};
      }

      return Object.fromEntries(map);
    });
  }

  /**
   * Check if logger context is currently available
   * Useful for debugging context issues
   */
  isContextAvailable(): boolean {
    const ctx = context.active();
    const map = ctx.getValue(LOGGER_CONTEXT_KEY) as Map<string, unknown> | undefined;
    return map !== undefined;
  }

  /**
   * Execute a function within a new logger context (useful for background jobs)
   */
  withContext<T>(fn: () => T | Promise<T>): T | Promise<T> {
    const loggerMap = new Map<string, unknown>();
    const ctx = context.active().setValue(LOGGER_CONTEXT_KEY, loggerMap);
    return context.with(ctx, fn);
  }

  /**
   * Add a single context key-value pair
   */
  addContext(key: string, value: unknown): void {
    this.executeInContext(() => {
      const ctx = context.active();
      const map = ctx.getValue(LOGGER_CONTEXT_KEY) as Map<string, unknown> | undefined;

      if (!map) {
        this.warn(`Logger context unavailable: addContext('${key}') called outside HTTP request`, {
          guidance: 'For background jobs, use logger.withContext(() => { ... })',
          location: 'This occurs in: app startup, cron jobs, message queue handlers, WebSocket/gRPC handlers',
        });
        return;
      }

      map.set(key, value);
    });
  }

  /**
   * Clear all persistent context
   */
  clearContext(): void {
    this.executeInContext(() => {
      const ctx = context.active();
      const map = ctx.getValue(LOGGER_CONTEXT_KEY) as Map<string, unknown> | undefined;

      if (!map) {
        // Silently skip - clearing non-existent context is not an error
        return;
      }

      map.clear();
    });
  }

  /**
   * Create a child logger with inherited context
   * Child logger has isolated context - modifications don't affect parent
   */
  createChildLogger(): LoggerService {
    return this.executeInContext(() => {
      const ctx = context.active();
      const parentMap = ctx.getValue(LOGGER_CONTEXT_KEY) as Map<string, unknown> | undefined;

      const childLogger = new LoggerService();

      // If parent has context, clone it for the child with isolated context
      if (parentMap) {
        // Create isolated clone so child modifications don't affect parent
        const childMap = new Map(parentMap);
        const childContext = ctx.setValue(LOGGER_CONTEXT_KEY, childMap);
        childLogger.isolatedContext = childContext;
      } else {
        // Warn when creating child logger without parent context
        this.warn('Creating child logger without parent context - child will have no inherited context', {
          guidance: 'Create child loggers within HTTP requests or logger.withContext() blocks',
        });
      }

      return childLogger;
    });
  }

  /**
   * Log debug level message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.executeInContext(() => {
      this.emit('DEBUG', message, data);
    });
  }

  /**
   * Log error level message
   */
  error(message: Error | string, data?: Record<string, unknown>): void {
    this.executeInContext(() => {
      this.emit('ERROR', message, data);
    });
  }

  /**
   * Log info level message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.executeInContext(() => {
      this.emit('INFO', message, data);
    });
  }

  /**
   * Set context that persists across log calls (merges with existing context)
   */
  setContext(newContext: Record<string, unknown>): void {
    this.executeInContext(() => {
      const ctx = context.active();
      const map = ctx.getValue(LOGGER_CONTEXT_KEY) as Map<string, unknown> | undefined;

      if (!map) {
        this.warn('Logger context unavailable: setContext() called outside HTTP request', {
          contextKeys: Object.keys(newContext),
          guidance: 'Wrap non-HTTP operations in logger.withContext(() => { ... })',
        });
        return;
      }

      // Merge new context into existing map
      Object.entries(newContext).forEach(([key, value]) => {
        map.set(key, value);
      });
    });
  }

  /**
   * Log warning level message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.executeInContext(() => {
      this.emit('WARN', message, data);
    });
  }

  /**
   * Core method that emits logs to OpenTelemetry
   */
  private emit(level: string, message: Error | string, data?: Record<string, unknown>): void {
    // Prepare enriched attributes with request-scoped context
    const enrichedData = {
      ...data,
      ...this.getContext(),
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
