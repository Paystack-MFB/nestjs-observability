import { __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { tap } from 'rxjs/operators';
import { getTraceOptions, isNoTraceClassEnabled, isNoTraceEnabled } from '../decorators/auto-trace.decorators.js';
import { LoggerService } from '../logger/logger.service.js';
import { MetricsService } from '../metrics/metrics.service.js';
let AutoTraceInterceptor = class AutoTraceInterceptor {
    metricsService;
    logger;
    tracer = trace.getTracer('auto-trace-interceptor');
    constructor(metricsService, logger) {
        this.metricsService = metricsService;
        this.logger = logger;
    }
    intercept(context, next) {
        const handler = context.getHandler();
        const controllerClass = context.getClass();
        if (isNoTraceClassEnabled(controllerClass)) {
            return next.handle();
        }
        if (isNoTraceEnabled(controllerClass.prototype, handler.name)) {
            return next.handle();
        }
        const traceOptions = getTraceOptions(controllerClass.prototype, handler.name);
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
            return next.handle().pipe(tap({
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
                    span.setStatus({ code: SpanStatusCode.OK });
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
            code: SpanStatusCode.ERROR,
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
AutoTraceInterceptor = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [MetricsService,
        LoggerService])
], AutoTraceInterceptor);
export { AutoTraceInterceptor };
//# sourceMappingURL=auto-trace.interceptor.js.map