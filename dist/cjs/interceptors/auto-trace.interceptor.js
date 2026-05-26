"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoTraceInterceptor = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const api_1 = require("@opentelemetry/api");
const operators_1 = require("rxjs/operators");
const auto_trace_decorators_1 = require("../decorators/auto-trace.decorators");
const logger_service_1 = require("../logger/logger.service");
const metrics_service_1 = require("../metrics/metrics.service");
let AutoTraceInterceptor = class AutoTraceInterceptor {
    metricsService;
    logger;
    tracer = api_1.trace.getTracer('auto-trace-interceptor');
    constructor(metricsService, logger) {
        this.metricsService = metricsService;
        this.logger = logger;
    }
    intercept(context, next) {
        const handler = context.getHandler();
        const controllerClass = context.getClass();
        if ((0, auto_trace_decorators_1.isNoTraceClassEnabled)(controllerClass)) {
            return next.handle();
        }
        if ((0, auto_trace_decorators_1.isNoTraceEnabled)(controllerClass.prototype, handler.name)) {
            return next.handle();
        }
        const traceOptions = (0, auto_trace_decorators_1.getTraceOptions)(controllerClass.prototype, handler.name);
        const className = controllerClass.name;
        const methodName = handler.name;
        const spanName = traceOptions?.spanName ?? `${className}.${methodName}`;
        return this.tracer.startActiveSpan(spanName, (span) => {
            const startTime = Date.now();
            span.setAttribute('controller.name', className);
            span.setAttribute('controller.method', methodName);
            span.setAttribute('instrumentation.type', 'auto-trace-interceptor');
            const tag = this.logger.getContext()['tag'];
            if (tag && typeof tag === 'string') {
                span.setAttribute('tag', tag);
            }
            this.addHttpAttributes(span, context);
            return next.handle().pipe((0, operators_1.tap)({
                error: (error) => {
                    const duration = (Date.now() - startTime) / 1000;
                    this.handleError(span, error);
                    this.updateMetrics(context, duration);
                    this.logger.error(`Error in ${spanName} after ${duration.toFixed(3)}s: ${error.message}`, {
                        context: 'AutoTraceInterceptor',
                        stack: error.stack,
                    });
                },
                finalize: () => {
                    span.end();
                },
                next: (value) => {
                    const duration = (Date.now() - startTime) / 1000;
                    span.setStatus({ code: api_1.SpanStatusCode.OK });
                    this.updateMetrics(context, duration);
                    return value;
                },
            }));
        });
    }
    addHttpAttributes(span, context) {
        if (context.getType() !== 'http') {
            return;
        }
        try {
            const request = context.switchToHttp().getRequest();
            const response = context.switchToHttp().getResponse();
            if (request.method) {
                span.setAttribute('http.method', request.method);
            }
            const httpPath = request.route?.path ?? request.originalUrl ?? '';
            if (httpPath) {
                span.setAttribute('http.path', httpPath);
            }
            if (request.ip) {
                span.setAttribute('http.client_ip', request.ip);
            }
            const userAgent = request.headers?.['user-agent'];
            if (userAgent && typeof userAgent === 'string') {
                span.setAttribute('http.user_agent', userAgent);
            }
            if (response.statusCode) {
                span.setAttribute('http.status_code', response.statusCode);
            }
        }
        catch (error) {
            this.logger.warn(`Failed to add HTTP attributes: ${error.message}`, {
                context: 'AutoTraceInterceptor',
            });
        }
    }
    handleError(span, error) {
        span.setStatus({
            code: api_1.SpanStatusCode.ERROR,
            message: error.message,
        });
        span.recordException(error);
        span.setAttribute('error.type', error.constructor.name);
        span.setAttribute('error.message', error.message);
        if (error.stack) {
            span.setAttribute('error.stack', error.stack);
        }
    }
    updateMetrics(context, duration) {
        try {
            if (context.getType() === 'http') {
                const request = context.switchToHttp().getRequest();
                const response = context.switchToHttp().getResponse();
                this.metricsService.recordHttpRequest(request.method ?? 'unknown', request.route?.path ?? request.originalUrl ?? 'unknown', response.statusCode ?? 200, duration);
            }
        }
        catch (error) {
            this.logger.warn(`Failed to update metrics: ${error.message}`, { context: 'AutoTraceInterceptor' });
        }
    }
};
exports.AutoTraceInterceptor = AutoTraceInterceptor;
exports.AutoTraceInterceptor = AutoTraceInterceptor = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [metrics_service_1.MetricsService,
        logger_service_1.LoggerService])
], AutoTraceInterceptor);
//# sourceMappingURL=auto-trace.interceptor.js.map