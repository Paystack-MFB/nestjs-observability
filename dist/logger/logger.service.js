var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LoggerService_1;
import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
/**
 * Enhanced NestJS logger that extends ConsoleLogger with observability features
 * Provides structured logging with OpenTelemetry integration while maintaining
 * native NestJS logger compatibility
 */
let LoggerService = LoggerService_1 = class LoggerService extends ConsoleLogger {
    config;
    useStructuredLogging;
    constructor(config) {
        // Initialize with proper log levels and format
        super('LoggerService', {
            logLevels: LoggerService_1.getLogLevels(config.logging.level),
            timestamp: true,
        });
        this.config = config;
        this.useStructuredLogging = config.logging.structuredLogging;
    }
    /**
     * Get log levels based on the configured level
     */
    static getLogLevels(level) {
        const allLevels = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];
        const levelIndex = allLevels.indexOf(level);
        return levelIndex === -1 ? ['log', 'warn', 'error', 'fatal'] : allLevels.slice(levelIndex);
    }
    /**
     * Create a child logger with additional persistent context
     */
    createChildLogger(context, additionalContext) {
        const childLogger = new LoggerService_1(this.config);
        childLogger.setContext(context);
        // If we have additional context, create a wrapper logger
        if (additionalContext) {
            const originalLog = childLogger.log.bind(childLogger);
            const originalError = childLogger.error.bind(childLogger);
            const originalWarn = childLogger.warn.bind(childLogger);
            const originalDebug = childLogger.debug.bind(childLogger);
            const originalVerbose = childLogger.verbose.bind(childLogger);
            // Override logging methods to include persistent context
            childLogger.log = (message, ctx) => {
                originalLog(this.mergeContext(message, additionalContext), ctx);
            };
            childLogger.error = (message, stack, ctx) => {
                originalError(this.mergeContext(message, additionalContext), stack, ctx);
            };
            childLogger.warn = (message, ctx) => {
                originalWarn(this.mergeContext(message, additionalContext), ctx);
            };
            childLogger.debug = (message, ctx) => {
                originalDebug(this.mergeContext(message, additionalContext), ctx);
            };
            childLogger.verbose = (message, ctx) => {
                originalVerbose(this.mergeContext(message, additionalContext), ctx);
            };
        }
        return childLogger;
    }
    /**
     * Enhanced debug method
     */
    debug(message, context) {
        if (this.config.logging.consoleOutput) {
            super.debug(message, context);
        }
    }
    /**
     * Enhanced error method with better error handling
     */
    error(message, stackOrContext, context) {
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
            }
            else {
                super.error(message, stackOrContext, context);
            }
        }
    }
    /**
     * Enhanced fatal method (maps to error with fatal level)
     */
    fatal(message, context) {
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
    log(message, context) {
        if (this.config.logging.consoleOutput) {
            super.log(message, context);
        }
    }
    /**
     * Log with additional context data
     */
    logWithContext(level, message, context, contextName) {
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
    verbose(message, context) {
        if (this.config.logging.consoleOutput) {
            super.verbose(message, context);
        }
    }
    /**
     * Enhanced warn method
     */
    warn(message, context) {
        if (this.config.logging.consoleOutput) {
            super.warn(message, context);
        }
    }
    /**
     * Colorize text for development mode
     */
    colorize(color, text) {
        if (this.useStructuredLogging)
            return text;
        const colors = {
            reset: '\x1b[0m',
            yellow: '\x1b[33m',
        };
        return `${colors[color] ?? ''}${text}${colors['reset']}`;
    }
    /**
     * Override formatMessage to add trace context and structured logging
     */
    formatMessage(logLevel, message, pidMessage, formattedLogLevel, contextMessage, timestampDiff = '') {
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
    stringifyMessage(message) {
        return this.extractMessage(message);
    }
    /**
     * Extract message string from various input types
     */
    extractMessage(message) {
        if (typeof message === 'string')
            return message;
        if (typeof message === 'object' && message !== null) {
            const obj = message;
            if (obj['message'] ?? obj['msg'])
                return String(obj['message'] ?? obj['msg']);
            return JSON.stringify(message);
        }
        return String(message);
    }
    /**
     * Format message as structured JSON with observability data
     */
    formatStructuredMessage(level, message, context) {
        const logEntry = {
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
            const messageObj = message;
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
    getTraceContext() {
        try {
            const activeSpan = trace.getActiveSpan();
            if (activeSpan) {
                const spanContext = activeSpan.spanContext();
                return {
                    spanId: spanContext.spanId,
                    traceId: spanContext.traceId,
                };
            }
        }
        catch {
            // Silently ignore tracing errors
        }
        return null;
    }
    /**
     * Merge additional context with message
     */
    mergeContext(message, additionalContext) {
        if (typeof message === 'object' && message !== null) {
            return { ...additionalContext, ...message };
        }
        return { ...additionalContext, message: String(message) };
    }
};
LoggerService = LoggerService_1 = __decorate([
    Injectable({ scope: Scope.TRANSIENT }),
    __metadata("design:paramtypes", [Object])
], LoggerService);
export { LoggerService };
//# sourceMappingURL=logger.service.js.map