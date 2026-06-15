var LoggerService_1;
import { __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { createContextKey, trace, context } from '@opentelemetry/api';
import { SeverityNumber, logs } from '@opentelemetry/api-logs';
import { getServiceName, getServiceVersion } from '../sdk-core.js';
import { maskSensitiveFields } from '../utils/mask-sensitive-fields.js';
import { getLoggerContext as getAsyncLoggerContext, setLoggerContextValue, isLoggerContextAvailable as isAsyncLoggerContextAvailable, runWithLoggerContext, runWithSpecificLoggerContext, } from './logger-context-storage.js';
export const LOGGER_CONTEXT_KEY = createContextKey('logger-context');
let LoggerService = class LoggerService {
    static { LoggerService_1 = this; }
    static SEVERITY_MAP = {
        DEBUG: SeverityNumber.DEBUG,
        INFO: SeverityNumber.INFO,
        WARN: SeverityNumber.WARN,
        ERROR: SeverityNumber.ERROR,
    };
    otelLogger;
    childContextMap;
    constructor() {
        const loggerProvider = typeof logs.getLoggerProvider === 'function' ? logs.getLoggerProvider() : undefined;
        const resolved = loggerProvider && typeof loggerProvider.getLogger === 'function'
            ? loggerProvider.getLogger(getServiceName(), getServiceVersion())
            : undefined;
        this.otelLogger = resolved ?? { emit: (_r) => undefined };
    }
    executeInContext(fn) {
        if (this.childContextMap) {
            return runWithSpecificLoggerContext(this.childContextMap, fn);
        }
        return fn();
    }
    getContext() {
        return this.executeInContext(() => {
            const map = getAsyncLoggerContext();
            if (!map) {
                return {};
            }
            return Object.fromEntries(map);
        });
    }
    isContextAvailable() {
        return this.executeInContext(() => {
            return isAsyncLoggerContextAvailable();
        });
    }
    withContext(fn) {
        return runWithLoggerContext(fn);
    }
    addContext(key, value) {
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
    clearContext() {
        this.executeInContext(() => {
            const map = getAsyncLoggerContext();
            if (!map) {
                return;
            }
            map.clear();
        });
    }
    createChildLogger() {
        return this.executeInContext(() => {
            const parentMap = getAsyncLoggerContext();
            const childLogger = new LoggerService_1();
            if (parentMap) {
                const childMap = new Map(parentMap);
                childLogger.childContextMap = childMap;
            }
            else {
                this.warn('Creating child logger without parent context - child will have no inherited context', {
                    guidance: 'Create child loggers within HTTP requests or logger.withContext() blocks',
                });
            }
            return childLogger;
        });
    }
    debug(message, data) {
        this.executeInContext(() => {
            this.emit('DEBUG', message, data);
        });
    }
    error(message, data) {
        this.executeInContext(() => {
            this.emit('ERROR', message, data);
        });
    }
    info(message, data) {
        this.executeInContext(() => {
            this.emit('INFO', message, data);
        });
    }
    setContext(newContext) {
        this.executeInContext(() => {
            const map = getAsyncLoggerContext();
            if (!map) {
                this.warn('Logger context unavailable: setContext() called outside HTTP request', {
                    contextKeys: Object.keys(newContext),
                    guidance: 'Wrap non-HTTP operations in logger.withContext(() => { ... })',
                });
                return;
            }
            Object.entries(newContext).forEach(([key, value]) => {
                map.set(key, value);
            });
        });
    }
    warn(message, data) {
        this.executeInContext(() => {
            this.emit('WARN', message, data);
        });
    }
    emit(level, message, data) {
        const enrichedData = {
            ...data,
            ...this.getContext(),
        };
        const maskedData = maskSensitiveFields(enrichedData);
        const sanitizedData = this.sanitizeLogData(maskedData);
        const rawBody = message instanceof Error ? message.message : message;
        const sanitizedBody = this.sanitizeLogMessage(rawBody);
        const activeSpan = trace.getActiveSpan();
        const logContext = activeSpan ? trace.setSpan(context.active(), activeSpan) : context.active();
        try {
            this.otelLogger.emit({
                attributes: maskedData,
                body: sanitizedBody,
                context: logContext,
                severityNumber: LoggerService_1.SEVERITY_MAP[level],
                severityText: level,
                ...(message instanceof Error && { exception: message }),
            });
        }
        catch (error) {
            console.error('LoggerService emit failed:', error);
        }
        this.writeStdoutIfEnabled(level, sanitizedBody, sanitizedData);
    }
    writeStdoutIfEnabled(level, body, data) {
        const flag = process.env['LOG_TO_CONSOLE'];
        if (flag !== 'true' && flag !== '1') {
            return;
        }
        const ts = new Date().toISOString();
        const ctxTag = data['context'];
        const sanitizedCtxTag = typeof ctxTag === 'string' && ctxTag.length > 0 ? this.sanitizeLogMessage(ctxTag) : '';
        const prefix = sanitizedCtxTag.length > 0 ? `[${sanitizedCtxTag}] ` : '';
        const { context: _ctx, ...rest } = data;
        const dataStr = Object.keys(rest).length > 0 ? ` ${safeStringify(rest)}` : '';
        const line = `${ts} ${level.padEnd(5)} ${prefix}${body}${dataStr}`;
        if (level === 'ERROR')
            console.error(line);
        else if (level === 'WARN')
            console.warn(line);
        else
            console.log(line);
    }
    sanitizeLogData(obj) {
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
            const sanitizedObj = {};
            for (const [key, value] of Object.entries(obj)) {
                const sanitizedKey = typeof key === 'string' ? this.sanitizeLogMessage(key) : key;
                sanitizedObj[sanitizedKey] = this.sanitizeLogData(value);
            }
            return sanitizedObj;
        }
        return obj;
    }
    sanitizeLogMessage(message) {
        if (typeof message !== 'string') {
            return String(message);
        }
        return message
            .replace(/[\r\n\t\0]/g, '')
            .split('')
            .filter((char) => {
            const code = char.charCodeAt(0);
            return !(code >= 1 && code <= 31) && code !== 127;
        })
            .join('')
            .trim();
    }
};
LoggerService = LoggerService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [])
], LoggerService);
export { LoggerService };
function safeStringify(data) {
    try {
        return JSON.stringify(data);
    }
    catch {
        return '[unserialisable]';
    }
}
//# sourceMappingURL=logger.service.js.map