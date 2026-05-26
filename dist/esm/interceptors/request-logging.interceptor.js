import { __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { tap } from 'rxjs/operators';
import { isNoLogClassEnabled, isNoLogEnabled } from '../decorators/auto-trace.decorators.js';
import { LoggerService } from '../logger/logger.service.js';
import { getHttpRequestLoggingEnabled } from '../sdk-core.js';
import { maskSensitiveFields } from '../utils/mask-sensitive-fields.js';
let RequestLoggingInterceptor = class RequestLoggingInterceptor {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    intercept(context, next) {
        if (context.getType() !== 'http') {
            return next.handle();
        }
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        if (this.shouldLog(context)) {
            this.logRequest(request);
        }
        return next.handle().pipe(tap({
            error: (error) => {
                if (this.shouldLog(context)) {
                    this.logResponse(request, response, undefined, error);
                }
            },
            next: (responseBody) => {
                if (this.shouldLog(context)) {
                    this.logResponse(request, response, responseBody);
                }
            },
        }));
    }
    shouldLog(context) {
        if (!getHttpRequestLoggingEnabled()) {
            return false;
        }
        const handler = context.getHandler();
        const controllerClass = context.getClass();
        if (isNoLogClassEnabled(controllerClass)) {
            return false;
        }
        if (isNoLogEnabled(controllerClass.prototype, handler.name)) {
            return false;
        }
        return true;
    }
    getClientIp(request) {
        const forwardedFor = request.headers?.['x-forwarded-for'];
        if (forwardedFor) {
            const forwardedForStr = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
            return forwardedForStr.split(',')[0].trim();
        }
        return request.connection?.remoteAddress;
    }
    logRequest(request) {
        const client = this.getClientIp(request);
        const url = new URL(request.url ?? '/', 'http://localhost');
        const endpoint = url.pathname;
        const logData = {
            endpoint,
            payload: {
                body: maskSensitiveFields(request.body),
                client,
                headers: maskSensitiveFields(request.headers),
                query: maskSensitiveFields(request.query),
                verb: request.method,
            },
            type: 'request',
        };
        this.logger.info('HTTP Request', logData);
    }
    logResponse(request, response, responseBody, error) {
        const client = this.getClientIp(request);
        const url = new URL(request.url ?? '/', 'http://localhost');
        const endpoint = url.pathname;
        const logData = {
            endpoint,
            payload: {
                body: maskSensitiveFields(responseBody),
                client,
                status: response.statusCode,
                verb: request.method,
            },
            type: 'response',
        };
        if (error) {
            this.logger.error('HTTP Response Error', { ...logData, error: error.message });
        }
        else {
            this.logger.info('HTTP Response', logData);
        }
    }
};
RequestLoggingInterceptor = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [LoggerService])
], RequestLoggingInterceptor);
export { RequestLoggingInterceptor };
//# sourceMappingURL=request-logging.interceptor.js.map