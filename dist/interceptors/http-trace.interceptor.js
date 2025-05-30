var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';
/**
 * Interceptor to trace HTTP requests and collect metrics
 * This interceptor will:
 * 1. Create spans for each HTTP request
 * 2. Collect metrics about request duration and status
 * 3. Add trace context to logs
 */
let HttpTraceInterceptor = class HttpTraceInterceptor {
    metricsService;
    logger;
    constructor(metricsService, logger) {
        this.metricsService = metricsService;
        this.logger = logger;
    }
    intercept(executionContext, next) {
        if (executionContext.getType() !== 'http') {
            return next.handle();
        }
        const request = executionContext.switchToHttp().getRequest();
        const { method, originalUrl } = request;
        const routePath = this.normalizeRoute(request);
        const startTime = Date.now();
        // Log the incoming request
        this.logger.debug(`Incoming request: ${method} ${originalUrl}`, 'HttpTraceInterceptor');
        // Get the current active span or create one
        const tracer = trace.getTracer('nestjs-http');
        return tracer.startActiveSpan(`HTTP ${method} ${routePath}`, (span) => {
            // Add tags to the span
            span.setAttribute('http.method', method);
            span.setAttribute('http.url', originalUrl);
            span.setAttribute('http.route', routePath);
            return next.handle().pipe(tap({
                error: (err) => {
                    const duration = (Date.now() - startTime) / 1000;
                    const statusCode = err.status ?? 500;
                    // Record metrics for error
                    this.metricsService.recordHttpRequest(method, routePath, statusCode, duration);
                    // Add error information to span
                    span.setAttribute('http.status_code', String(statusCode));
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: err.message,
                    });
                    span.recordException(err);
                    // Log error
                    this.logger.error(`Request error: ${method} ${originalUrl} ${String(statusCode)} - ${err.message}`, err.stack ?? '', 'HttpTraceInterceptor');
                    // End the span
                    span.end();
                },
                next: () => {
                    const response = executionContext.switchToHttp().getResponse();
                    const statusCode = response.statusCode;
                    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
                    // Record metrics
                    this.metricsService.recordHttpRequest(method, routePath, statusCode, duration);
                    // Add response information to span
                    span.setAttribute('http.status_code', String(statusCode));
                    span.setStatus({
                        code: statusCode < 400 ? SpanStatusCode.OK : SpanStatusCode.ERROR,
                    });
                    // Log successful request
                    this.logger.debug(`Request completed: ${method} ${originalUrl} ${String(statusCode)} - ${String(duration.toFixed(3))}s`, 'HttpTraceInterceptor');
                    // End the span
                    span.end();
                },
            }));
        });
    }
    /**
     * Normalize a route path to avoid high cardinality in metrics
     * For example, /users/123 becomes /users/:id
     */
    normalizeRoute(request) {
        // If NestJS router provides a route pattern, use it
        if (request.route?.path) {
            return request.route.path;
        }
        // If Express router information is available
        const route = request._parsedUrl?.pathname ?? request.originalUrl;
        // Basic normalization for routes with IDs
        return route
            .replace(/\/[0-9a-fA-F]{24}\b/g, '/:id') // MongoDB IDs
            .replace(/\/\d+\b/g, '/:id'); // Numeric IDs
    }
};
HttpTraceInterceptor = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [MetricsService,
        LoggerService])
], HttpTraceInterceptor);
export { HttpTraceInterceptor };
//# sourceMappingURL=http-trace.interceptor.js.map