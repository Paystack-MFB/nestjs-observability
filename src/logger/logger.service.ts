import { ConsoleLogger, Injectable, LogLevel, Scope } from '@nestjs/common';
import { trace } from '@opentelemetry/api';

import type { ObservabilityConfig } from '../config/observability.config';

interface LogContext extends Record<string, unknown> {
  message?: string;
  msg?: string;
}

/**
 * Enhanced NestJS logger that extends ConsoleLogger with observability features
 * Provides structured logging with OpenTelemetry integration while maintaining
 * native NestJS logger compatibility
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
  private readonly useStructuredLogging: boolean;

  constructor(private readonly config: ObservabilityConfig) {
    // Initialize with proper log levels and format
    super('LoggerService', {
      logLevels: LoggerService.getLogLevels(config.logging.level),
      timestamp: true,
    });

    this.useStructuredLogging = config.logging.structuredLogging;
  }

  /**
   * Get log levels based on the configured level
   */
  private static getLogLevels(level: string): LogLevel[] {
    const allLevels: LogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];
    const levelIndex = allLevels.indexOf(level as LogLevel);
    return levelIndex === -1 ? ['log', 'warn', 'error', 'fatal'] : allLevels.slice(levelIndex);
  }

  /**
   * Create a child logger with additional persistent context
   */
  createChildLogger(context: string, additionalContext?: LogContext): LoggerService {
    const childLogger = new LoggerService(this.config);
    childLogger.setContext(context);

    // If we have additional context, create a wrapper logger
    if (additionalContext) {
      const originalLog = childLogger.log.bind(childLogger);
      const originalError = childLogger.error.bind(childLogger);
      const originalWarn = childLogger.warn.bind(childLogger);
      const originalDebug = childLogger.debug.bind(childLogger);
      const originalVerbose = childLogger.verbose.bind(childLogger);

      // Override logging methods to include persistent context
      childLogger.log = (message: unknown, ctx?: string) => {
        originalLog(this.mergeContext(message, additionalContext), ctx);
      };
      childLogger.error = (message: unknown, stack?: string, ctx?: string) => {
        originalError(this.mergeContext(message, additionalContext), stack, ctx);
      };
      childLogger.warn = (message: unknown, ctx?: string) => {
        originalWarn(this.mergeContext(message, additionalContext), ctx);
      };
      childLogger.debug = (message: unknown, ctx?: string) => {
        originalDebug(this.mergeContext(message, additionalContext), ctx);
      };
      childLogger.verbose = (message: unknown, ctx?: string) => {
        originalVerbose(this.mergeContext(message, additionalContext), ctx);
      };
    }

    return childLogger;
  }

  /**
   * Enhanced debug method
   */
  override debug(message: unknown, context?: string): void {
    if (this.config.logging.consoleOutput) {
      super.debug(message, context);
    }
  }

  /**
   * Enhanced error method with better error handling
   */
  override error(message: unknown, stackOrContext?: string, context?: string): void {
    if (this.config.logging.consoleOutput) {
      if (message instanceof Error) {
        const errorContext = stackOrContext ?? context ?? 'ErrorHandler';
        const errorLog = {
          error: {
            message: message.message,
            name: message.name,
            stack: message.stack,
          },
          message: message.message,
        };
        super.error(errorLog, message.stack, errorContext);
      } else {
        super.error(message, stackOrContext, context);
      }
    }
  }

  /**
   * Enhanced fatal method (maps to error with fatal level)
   */
  override fatal(message: unknown, context?: string): void {
    if (this.config.logging.consoleOutput) {
      const fatalMessage = this.useStructuredLogging
        ? { level: 'fatal', message: this.extractMessage(message) }
        : `[FATAL] ${this.extractMessage(message)}`;
      super.error(fatalMessage, undefined, context);
    }
  }

  /**
   * Enhanced log method with context support
   */
  override log(message: unknown, context?: string): void {
    if (this.config.logging.consoleOutput) {
      super.log(message, context);
    }
  }

  /**
   * Log with additional context data
   */
  logWithContext(level: LogLevel, message: string, context: LogContext, contextName?: string): void {
    const logData = { message, ...context };

    switch (level) {
      case 'debug':
        this.debug(logData, contextName);
        break;
      case 'error':
        this.error(logData, contextName);
        break;
      case 'fatal':
        this.fatal(logData, contextName);
        break;
      case 'verbose':
        this.verbose(logData, contextName);
        break;
      case 'warn':
        this.warn(logData, contextName);
        break;
      default:
        this.log(logData, contextName);
    }
  }

  /**
   * Enhanced verbose method
   */
  override verbose(message: unknown, context?: string): void {
    if (this.config.logging.consoleOutput) {
      super.verbose(message, context);
    }
  }

  /**
   * Enhanced warn method
   */
  override warn(message: unknown, context?: string): void {
    if (this.config.logging.consoleOutput) {
      super.warn(message, context);
    }
  }

  /**
   * Colorize text for development mode
   */
  protected override colorize(color: string, text: string): string {
    if (this.useStructuredLogging) return text;
    const colors: Record<string, string> = {
      reset: '\x1b[0m',
      yellow: '\x1b[33m',
    };
    return `${colors[color] ?? ''}${text}${colors['reset']}`;
  }

  /**
   * Override formatMessage to add trace context and structured logging
   */
  protected override formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff = ''
  ): string {
    if (this.useStructuredLogging) {
      return this.formatStructuredMessage(logLevel, message, contextMessage);
    }

    // For development, use pretty formatting with trace context
    const traceInfo = this.getTraceContext();
    const enhancedMessage = traceInfo
      ? `${this.stringifyMessage(message)} ${this.colorize('yellow', `[trace: ${traceInfo.traceId.slice(-8)}]`)}`
      : this.stringifyMessage(message);

    return super.formatMessage(logLevel, enhancedMessage, pidMessage, formattedLogLevel, contextMessage, timestampDiff);
  }

  /**
   * Utility method to stringify message objects consistently
   */
  protected override stringifyMessage(message: unknown): string {
    return this.extractMessage(message);
  }

  /**
   * Extract message string from various input types
   */
  private extractMessage(message: unknown): string {
    if (typeof message === 'string') return message;
    if (typeof message === 'object' && message !== null) {
      const obj = message as Record<string, unknown>;

      if (obj['message'] ?? obj['msg']) return String(obj['message'] ?? obj['msg']);
      return JSON.stringify(message);
    }
    return String(message);
  }

  /**
   * Format message as structured JSON with observability data
   */
  private formatStructuredMessage(level: LogLevel, message: unknown, context?: string): string {
    const logEntry: Record<string, unknown> = {
      environment: this.config.environment,
      level,
      message: this.extractMessage(message),
      pid: process.pid,
      service: this.config.serviceName,
      timestamp: new Date().toISOString(),
    };

    if (context) {
      logEntry['context'] = context;
    }

    // Add trace context if available
    const traceContext = this.getTraceContext();
    if (traceContext) {
      logEntry['traceId'] = traceContext.traceId;
      logEntry['spanId'] = traceContext.spanId;
    }

    // Merge additional context if message is an object
    if (typeof message === 'object' && message !== null && !Array.isArray(message)) {
      const messageObj = message as LogContext;
      const { message: msg, msg: msgAlias, ...additionalContext } = messageObj;
      if (msg ?? msgAlias) {
        logEntry['message'] = String(msg ?? msgAlias);
      }
      Object.assign(logEntry, additionalContext);
    }

    return JSON.stringify(logEntry);
  }

  /**
   * Get current OpenTelemetry trace context
   */
  private getTraceContext(): null | { spanId: string; traceId: string } {
    try {
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        return {
          spanId: spanContext.spanId,
          traceId: spanContext.traceId,
        };
      }
    } catch {
      // Silently ignore tracing errors
    }
    return null;
  }

  /**
   * Merge additional context with message
   */
  private mergeContext(message: unknown, additionalContext: LogContext): unknown {
    if (typeof message === 'object' && message !== null) {
      return { ...additionalContext, ...message };
    }
    return { ...additionalContext, message: String(message) };
  }
}
