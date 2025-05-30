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
/**
 * Interceptor to automatically trace controller methods
 * This interceptor replaces the need for @Trace() decorators on controller methods
 * by automatically creating spans for each method call.
 */
let ControllerMethodTraceInterceptor = class ControllerMethodTraceInterceptor {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    intercept(executionContext, next) {
        // Get the class and handler names
        const className = executionContext.getClass().name;
        const handlerName = executionContext.getHandler().name;
        // Create a meaningful span name
        const spanName = `${className}.${handlerName}`;
        // Get the request method and path for HTTP requests
        let httpMethod = '';
        let httpPath = '';
        if (executionContext.getType() === 'http') {
            const request = executionContext.switchToHttp().getRequest();
            httpMethod = request.method ?? '';
            httpPath = request.route?.path ?? request.originalUrl ?? '';
        }
        // Get the tracer
        const tracer = trace.getTracer('controller-method-tracer');
        // Start a new span
        return tracer.startActiveSpan(spanName, (span) => {
            // Add basic attributes
            span.setAttribute('class.name', className);
            span.setAttribute('method.name', handlerName);
            // Add HTTP attributes if available
            if (httpMethod) {
                span.setAttribute('http.method', httpMethod);
            }
            if (httpPath) {
                span.setAttribute('http.path', httpPath);
            }
            const startTime = Date.now();
            return next.handle().pipe(tap({
                error: (error) => {
                    const duration = (Date.now() - startTime) / 1000;
                    // Set the span status to ERROR
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: error.message,
                    });
                    // Record the exception in the span
                    span.recordException(error);
                    // Log error
                    this.logger.error(`Error executing ${spanName} after ${duration.toFixed(3)}s: ${error.message}`, error.stack ?? '', 'ControllerMethodTraceInterceptor');
                    // End the span
                    span.end();
                },
                next: (value) => {
                    // Set the span status to OK
                    span.setStatus({ code: SpanStatusCode.OK });
                    // End the span
                    span.end();
                    return value;
                },
            }));
        });
    }
};
ControllerMethodTraceInterceptor = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [LoggerService])
], ControllerMethodTraceInterceptor);
export { ControllerMethodTraceInterceptor };
//# sourceMappingURL=controller-method-trace.interceptor.js.map