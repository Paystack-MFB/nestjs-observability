import { ConsoleLogger, LogLevel } from '@nestjs/common';
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
export declare class LoggerService extends ConsoleLogger {
    private readonly config;
    private readonly useStructuredLogging;
    constructor(config: ObservabilityConfig);
    /**
     * Get log levels based on the configured level
     */
    private static getLogLevels;
    /**
     * Create a child logger with additional persistent context
     */
    createChildLogger(context: string, additionalContext?: LogContext): LoggerService;
    /**
     * Enhanced debug method
     */
    debug(message: any, context?: string): void;
    /**
     * Enhanced error method with better error handling
     */
    error(message: any, stackOrContext?: string, context?: string): void;
    /**
     * Enhanced fatal method (maps to error with fatal level)
     */
    fatal(message: any, context?: string): void;
    /**
     * Enhanced log method with context support
     */
    log(message: any, context?: string): void;
    /**
     * Log with additional context data
     */
    logWithContext(level: LogLevel, message: string, context: LogContext, contextName?: string): void;
    /**
     * Enhanced verbose method
     */
    verbose(message: any, context?: string): void;
    /**
     * Enhanced warn method
     */
    warn(message: any, context?: string): void;
    /**
     * Colorize text for development mode
     */
    protected colorize(color: string, text: string): string;
    /**
     * Override formatMessage to add trace context and structured logging
     */
    protected formatMessage(logLevel: LogLevel, message: unknown, pidMessage: string, formattedLogLevel: string, contextMessage: string, timestampDiff?: string): string;
    /**
     * Utility method to stringify message objects consistently
     */
    protected stringifyMessage(message: unknown): string;
    /**
     * Extract message string from various input types
     */
    private extractMessage;
    /**
     * Format message as structured JSON with observability data
     */
    private formatStructuredMessage;
    /**
     * Get current OpenTelemetry trace context
     */
    private getTraceContext;
    /**
     * Merge additional context with message
     */
    private mergeContext;
}
export {};
//# sourceMappingURL=logger.service.d.ts.map