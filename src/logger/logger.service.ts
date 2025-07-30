import type { AnyValueMap } from '@opentelemetry/api-logs';

import { ConsoleLogger, Inject, Injectable, LogLevel, Scope } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';

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
  private readonly loggerProvider: LoggerProvider | null = null;
  private readonly persistentContext: LogContext = {};

  constructor(@Inject('OBSERVABILITY_CONFIG') private readonly config: ObservabilityConfig) {
    super('LoggerService', {
      logLevels: LoggerService.getLogLevels(config.logging.level),
    });

    if (this.config.logging.otlpExport.enabled) {
      const exporter = new OTLPLogExporter({ url: this.config.logging.otlpExport.endpoint });
      const resource = resourceFromAttributes({
        'deployment.environment': this.config.environment,
        'service.name': this.config.serviceName,
        'service.version': this.config.serviceVersion,
      });

      this.loggerProvider = new LoggerProvider({
        processors: [new BatchLogRecordProcessor(exporter)],
        resource,
      });
    }
  }

  private static getLogLevels(level: string): LogLevel[] {
    const levels: Record<string, LogLevel[]> = {
      debug: ['debug', 'verbose', 'log', 'warn', 'error', 'fatal'],
      error: ['error', 'fatal'],
      fatal: ['fatal'],
      log: ['log', 'warn', 'error', 'fatal'],
      verbose: ['verbose', 'log', 'warn', 'error', 'fatal'],
      warn: ['warn', 'error', 'fatal'],
    };
    return levels[level] ?? levels['log'];
  }

  /**
   * Add context that persists across log calls
   */
  addContext(context: LogContext): void {
    Object.assign(this.persistentContext, context);
  }

  /**
   * Clear all persistent context
   */
  clearContext(): void {
    Object.keys(this.persistentContext).forEach((key) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.persistentContext[key];
    });
  }

  /**
   * Create a child logger with additional context
   */
  createChildLogger(context: string, additionalContext?: LogContext): LoggerService {
    const child = new LoggerService(this.config);
    child.setContext(context);

    if (additionalContext) {
      child.addContext(additionalContext);
    }

    // Copy persistent context from parent
    child.addContext(this.persistentContext);

    return child;
  }

  /**
   * Enhanced debug method with context merging
   */
  override debug(message: unknown, context?: string): void {
    this.writeLog('debug', message, context);
  }

  /**
   * Enhanced error method with context merging
   */
  override error(message: unknown, stackOrContext?: string, context?: string): void {
    // Handle both overloads of error method
    if (typeof stackOrContext === 'string' && !context) {
      // error(message, context)
      this.writeLog('error', message, stackOrContext);
    } else {
      // error(message, stack, context)
      this.writeLog('error', message, context, stackOrContext);
    }
  }

  /**
   * Enhanced fatal method with context merging
   */
  override fatal(message: unknown, context?: string): void {
    this.writeLog('fatal', message, context);
  }

  /**
   * Enhanced log method with context merging
   */
  override log(message: unknown, context?: string): void {
    this.writeLog('log', message, context);
  }

  /**
   * Enhanced verbose method with context merging
   */
  override verbose(message: unknown, context?: string): void {
    this.writeLog('verbose', message, context);
  }

  /**
   * Enhanced warn method with context merging
   */
  override warn(message: unknown, context?: string): void {
    this.writeLog('warn', message, context);
  }

  /**
   * Format message as structured JSON
   */
  private formatAsJSON(level: LogLevel, message: unknown, context?: string, stack?: string): string {
    const traceContext = this.getTraceContext();

    const logEntry: Record<string, unknown> = {
      dd: {
        env: this.config.environment,
        service: this.config.serviceName,
        span_id: traceContext?.spanId,
        trace_id: traceContext?.traceId,
        version: this.config.serviceVersion,
      },
      level,
      timestamp: new Date().toISOString(),
    };

    if (context) {
      logEntry['context'] = context;
    }

    // Add stack trace for errors
    if (stack) {
      logEntry['stack'] = stack;
    }

    // Handle message extraction and object context merging
    if (typeof message === 'string') {
      logEntry['message'] = message;
    } else if (typeof message === 'object' && message !== null && !Array.isArray(message)) {
      const messageObj = message as LogContext;
      const { message: msg, msg: msgAlias, ...additionalContext } = messageObj;

      // Extract message from object
      if (msg ?? msgAlias) {
        logEntry['message'] = String(msg ?? msgAlias);
      } else if (message instanceof Error) {
        logEntry['message'] = message.message;
      } else {
        logEntry['params'] = message;
      }

      // Merge additional context from object
      Object.assign(logEntry, additionalContext);
    } else {
      logEntry['message'] = String(message);
    }

    // Merge persistent context
    Object.assign(logEntry, this.persistentContext);

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
   * Core method that handles all logging with console output check
   */
  private writeLog(level: LogLevel, message: unknown, context?: string, stack?: string): void {
    // OTLP export
    if (this.loggerProvider) {
      const traceContext = this.getTraceContext();

      // Create the log record body as an object, not a JSON string
      const logBody: AnyValueMap = {
        dd: {
          env: this.config.environment,
          service: this.config.serviceName,
          span_id: traceContext?.spanId,
          trace_id: traceContext?.traceId,
          version: this.config.serviceVersion,
        },
        level,
        timestamp: new Date().toISOString(),
      };

      if (context) {
        logBody['context'] = context;
      }

      // Add stack trace for errors
      if (stack) {
        logBody['stack'] = stack;
      }

      // Handle message extraction and object context merging
      if (typeof message === 'string') {
        logBody['message'] = message;
      } else if (typeof message === 'object' && message !== null && !Array.isArray(message)) {
        const messageObj = message as LogContext;
        const { message: msg, msg: msgAlias, ...additionalContext } = messageObj;

        // Extract message from object
        if (msg ?? msgAlias) {
          logBody['message'] = String(msg ?? msgAlias);
        } else if (message instanceof Error) {
          logBody['message'] = message.message;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
          logBody['params'] = message as any; // Cast to any to satisfy AnyValue type
        }

        // Merge additional context from object
        Object.assign(logBody, additionalContext);
      } else {
        logBody['message'] = String(message);
      }

      // Merge persistent context
      Object.assign(logBody, this.persistentContext);

      this.loggerProvider.getLogger(this.config.serviceName, this.config.serviceVersion).emit({
        body: logBody,
        severityText: level,
      });
    }

    if (!this.config.logging.consoleOutput) {
      return;
    }

    const isProduction = this.config.environment !== 'development';

    if (isProduction) {
      // In production, output structured JSON directly to console
      const formattedMessage = this.formatAsJSON(level, message, context, stack);
      console.log(formattedMessage);
    } else {
      // In development, use the parent ConsoleLogger for pretty printing
      // Merge persistent context and trace context with the message
      const traceContext = this.getTraceContext();
      const baseContext = {
        ...this.persistentContext,
        ...(traceContext && {
          spanId: traceContext.spanId,
          traceId: traceContext.traceId,
        }),
      };

      let processedMessage = message;
      if (Object.keys(baseContext).length > 0) {
        if (typeof message === 'object' && message !== null) {
          processedMessage = { ...baseContext, ...message };
        } else {
          processedMessage = { ...baseContext, message: String(message) };
        }
      }

      // Call parent logger methods with clean arguments
      switch (level) {
        case 'debug':
          if (context) {
            super.debug(processedMessage, context);
          } else {
            super.debug(processedMessage);
          }
          break;
        case 'error':
          if (stack && context) {
            super.error(processedMessage, stack, context);
          } else if (stack) {
            super.error(processedMessage, stack);
          } else if (context) {
            super.error(processedMessage, context);
          } else {
            super.error(processedMessage);
          }
          break;
        case 'fatal':
          if (context) {
            super.fatal(processedMessage, context);
          } else {
            super.fatal(processedMessage);
          }
          break;
        case 'verbose':
          if (context) {
            super.verbose(processedMessage, context);
          } else {
            super.verbose(processedMessage);
          }
          break;
        case 'warn':
          if (context) {
            super.warn(processedMessage, context);
          } else {
            super.warn(processedMessage);
          }
          break;
        default:
          if (context) {
            super.log(processedMessage, context);
          } else {
            super.log(processedMessage);
          }
      }
    }
  }
}
