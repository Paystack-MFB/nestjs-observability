import { Injectable } from '@nestjs/common';
import { createContextKey, trace, context } from '@opentelemetry/api';
import { Logger, SeverityNumber, logs } from '@opentelemetry/api-logs';

import { getServiceName, getServiceVersion } from '../sdk-core';
import { maskSensitiveFields } from '../utils/mask-sensitive-fields';
import {
  getLoggerContext as getAsyncLoggerContext,
  setLoggerContextValue,
  isLoggerContextAvailable as isAsyncLoggerContextAvailable,
  runWithLoggerContext,
  runWithSpecificLoggerContext,
  LoggerContextMap,
} from './logger-context-storage';

// Context key for storing request-scoped logger context
// Kept for backward compatibility with OpenTelemetry API but AsyncLocalStorage is now primary
export const LOGGER_CONTEXT_KEY = createContextKey('logger-context');

type LogLevel = 'DEBUG' | 'ERROR' | 'INFO' | 'WARN';

/**
 * Enhanced NestJS logger that integrates with OpenTelemetry global providers
 * Provides structured logging with automatic trace context correlation
 * Uses singleton scope for better performance
 */
@Injectable()
export class LoggerService {
  private static readonly SEVERITY_MAP: Record<LogLevel, SeverityNumber> = {
    DEBUG: SeverityNumber.DEBUG,
    INFO: SeverityNumber.INFO,
    WARN: SeverityNumber.WARN,
    ERROR: SeverityNumber.ERROR,
  };

  private readonly otelLogger: Logger;
  private childContextMap?: LoggerContextMap;

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
   * Uses AsyncLocalStorage to ensure context persists through async operations
   */
  private executeInContext<T>(fn: () => T): T {
    if (this.childContextMap) {
      // Child logger: run within isolated AsyncLocalStorage scope
      return runWithSpecificLoggerContext(this.childContextMap, fn) as T;
    }
    // Root logger: run in current scope
    return fn();
  }

  /**
   * Get the current logger context as a plain object
   * Reads from AsyncLocalStorage (primary) for reliability in Express/Fastify
   */
  getContext(): Record<string, unknown> {
    return this.executeInContext(() => {
      const map = getAsyncLoggerContext();

      if (!map) {
        return {};
      }

      return Object.fromEntries(map);
    });
  }

  /**
   * Check if logger context is currently available
   * Useful for debugging context issues
   * Checks AsyncLocalStorage (primary) for reliability
   */
  isContextAvailable(): boolean {
    return this.executeInContext(() => {
      return isAsyncLoggerContextAvailable();
    });
  }

  /**
   * Execute a function within a new logger context (useful for background jobs)
   * Uses AsyncLocalStorage for reliable context propagation through async operations
   */
  withContext<T>(fn: () => T | Promise<T>): T | Promise<T> {
    return runWithLoggerContext(fn);
  }

  /**
   * Add a single context key-value pair
   * Uses AsyncLocalStorage for reliable context propagation
   */
  addContext(key: string, value: unknown): void {
    this.executeInContext(() => {
      const success = setLoggerContextValue(key, value);

      if (!success) {
        this.warn(`Logger context unavailable: addContext('${key}') called outside HTTP request`, {
          guidance: 'For background jobs, use logger.withContext(() => { ... })',
          location: 'This occurs in: app startup, cron jobs, message queue handlers, WebSocket/gRPC handlers',
        });
      }
    });
  }

  /**
   * Clear all persistent context
   */
  clearContext(): void {
    this.executeInContext(() => {
      const map = getAsyncLoggerContext();

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
   * Uses AsyncLocalStorage to ensure proper isolation through async operations
   */
  createChildLogger(): LoggerService {
    return this.executeInContext(() => {
      // Get parent's context from AsyncLocalStorage
      const parentMap = getAsyncLoggerContext();

      const childLogger = new LoggerService();

      // If parent has context, clone it for the child with isolated context
      if (parentMap) {
        // Create isolated clone so child modifications don't affect parent
        // This map will be used by the child logger via AsyncLocalStorage.run()
        const childMap = new Map(parentMap);
        childLogger.childContextMap = childMap;
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
      const map = getAsyncLoggerContext();

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
   * Core method that emits logs to OpenTelemetry, and optionally mirrors
   * a single-line summary to stdout for `kubectl logs <pod>` debugging.
   *
   * The stdout mirror is gated on `LOG_TO_CONSOLE` (truthy = on). It is
   * not the same as `OTEL_LOGS_EXPORTER=console`:
   *
   *   - `OTEL_LOGS_EXPORTER=console` wires the SDK's
   *     `ConsoleLogRecordExporter`, which `util.inspect`s every
   *     ReadableLogRecord across multiple stdout lines — fine for SDK
   *     debugging, terrible for any downstream collector that expects
   *     JSON-per-line (Filebeat with `co.elastic.logs/json.*` wraps each
   *     inner brace in its own `{"body": "  },"}` event).
   *
   *   - `LOG_TO_CONSOLE=true` writes ONE formatted line per log call,
   *     after the OTel push. The OTLP pipeline still gets the full
   *     structured LogRecord; stdout gets a human-readable summary.
   *     Safe to enable in production.
   */
  private emit(level: LogLevel, message: Error | string, data?: Record<string, unknown>): void {
    // Prepare enriched attributes with request-scoped context
    const enrichedData = {
      ...data,
      ...this.getContext(),
    };

    // Mask sensitive fields in all log data
    const maskedData = maskSensitiveFields(enrichedData);
    // Sanitize all string fields to prevent log injection in stdout mirror output
    const sanitizedData = this.sanitizeLogData(maskedData) as Record<string, unknown>;

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
        severityNumber: LoggerService.SEVERITY_MAP[level],
        severityText: level,
        ...(message instanceof Error && { exception: message }),
      });
    } catch (error) {
      // Fallback to console if OpenTelemetry logging fails
      console.error('LoggerService emit failed:', error);
      // Note: Console fallback logging removed to avoid potential log injection
    }

    // Optional stdout mirror — independent of the OTel pipeline. See
    // method-level doc for the LOG_TO_CONSOLE vs OTEL_LOGS_EXPORTER
    // distinction. `sanitizedData` has all string fields recursively sanitized.
    this.writeStdoutIfEnabled(level, sanitizedBody, sanitizedData);
  }

  /**
   * Write one line to stdout if `LOG_TO_CONSOLE` is truthy. Format:
   *
   *   `{ISO timestamp} {LEVEL} [{context-tag}] {body} {JSON-stringified data}`
   *
   * `context-tag` is the value of `context['context']` if set (the
   * conventional NestJS class-name tag). `data` is omitted entirely if
   * empty. JSON stringify is wrapped in try/catch — a circular ref
   * produces `[unserialisable]` rather than throwing.
   */
  private writeStdoutIfEnabled(level: LogLevel, body: string, data: Record<string, unknown>): void {
    const flag = process.env['LOG_TO_CONSOLE'];
    if (flag !== 'true' && flag !== '1') {
      return;
    }
    const ts = new Date().toISOString();
    const ctxTag = data['context'];
    const sanitizedCtxTag = typeof ctxTag === 'string' && ctxTag.length > 0 ? this.sanitizeLogMessage(ctxTag) : '';
    const prefix = sanitizedCtxTag.length > 0 ? `[${sanitizedCtxTag}] ` : '';
    // Drop the `context` key from the printed data — it's already on
    // the prefix and would just duplicate.
    const { context: _ctx, ...rest } = data;
    const dataStr = Object.keys(rest).length > 0 ? ` ${safeStringify(rest)}` : '';
    const line = `${ts} ${level.padEnd(5)} ${prefix}${body}${dataStr}`;
    if (level === 'ERROR') console.error(line);
    else if (level === 'WARN') console.warn(line);
    else console.log(line);
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

/**
 * JSON.stringify that swallows circular-ref errors so a bad attribute
 * shape never throws out of the stdout-mirror path. Returns
 * `[unserialisable]` on failure rather than escalating.
 */
function safeStringify(data: Record<string, unknown>): string {
  try {
    return JSON.stringify(data);
  } catch {
    return '[unserialisable]';
  }
}
