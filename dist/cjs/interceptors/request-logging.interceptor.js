"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestLoggingInterceptor = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const auto_trace_decorators_1 = require("../decorators/auto-trace.decorators");
const logger_service_1 = require("../logger/logger.service");
const sdk_core_1 = require("../sdk-core");
const mask_sensitive_fields_1 = require("../utils/mask-sensitive-fields");
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
        return next.handle().pipe((0, operators_1.tap)({
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
        if (!(0, sdk_core_1.getHttpRequestLoggingEnabled)()) {
            return false;
        }
        const handler = context.getHandler();
        const controllerClass = context.getClass();
        if ((0, auto_trace_decorators_1.isNoLogClassEnabled)(controllerClass)) {
            return false;
        }
        if ((0, auto_trace_decorators_1.isNoLogEnabled)(controllerClass.prototype, handler.name)) {
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
                body: (0, mask_sensitive_fields_1.maskSensitiveFields)(request.body),
                client,
                headers: (0, mask_sensitive_fields_1.maskSensitiveFields)(request.headers),
                query: (0, mask_sensitive_fields_1.maskSensitiveFields)(request.query),
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
                body: (0, mask_sensitive_fields_1.maskSensitiveFields)(responseBody),
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
exports.RequestLoggingInterceptor = RequestLoggingInterceptor;
exports.RequestLoggingInterceptor = RequestLoggingInterceptor = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [logger_service_1.LoggerService])
], RequestLoggingInterceptor);
//# sourceMappingURL=request-logging.interceptor.js.map