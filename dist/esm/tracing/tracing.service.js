import { __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { getServiceAttributes, getServiceName, getServiceVersion } from '../sdk-core.js';
let TracingService = class TracingService {
    tracer;
    constructor() {
        const tracerProvider = typeof trace.getTracerProvider === 'function' ? trace.getTracerProvider() : undefined;
        const resolvedTracer = tracerProvider && typeof tracerProvider.getTracer === 'function'
            ? tracerProvider.getTracer(getServiceName(), getServiceVersion())
            : {
                startActiveSpan: (_name, fn) => {
                    const noOpSpan = {
                        addEvent: () => undefined,
                        end: () => undefined,
                        recordException: () => undefined,
                        setAttribute: () => undefined,
                        setAttributes: () => undefined,
                        setStatus: () => undefined,
                        spanContext: () => ({ spanId: '', traceFlags: 0, traceId: '' }),
                    };
                    return fn(noOpSpan);
                },
                startSpan: () => ({
                    addEvent: () => undefined,
                    end: () => undefined,
                    recordException: () => undefined,
                    setAttribute: () => undefined,
                    setAttributes: () => undefined,
                    setStatus: () => undefined,
                    spanContext: () => ({ spanId: '', traceFlags: 0, traceId: '' }),
                }),
            };
        this.tracer = resolvedTracer;
    }
    addSpanEvent(name, attributes) {
        const span = this.getActiveSpan();
        if (!span) {
            return;
        }
        span.addEvent(name, attributes);
    }
    createSpan(spanName, fn) {
        return this.tracer.startActiveSpan(spanName, (span) => {
            try {
                span.setAttributes(getServiceAttributes());
                const result = fn(span);
                if (result && typeof result === 'object' && 'then' in result) {
                    return result
                        .then((value) => {
                        span.setStatus({ code: 1 });
                        return value;
                    })
                        .catch((error) => {
                        span.setStatus({ code: 2, message: error.message });
                        span.recordException(error);
                        throw error;
                    })
                        .finally(() => {
                        span.end();
                    });
                }
                span.setStatus({ code: 1 });
                span.end();
                return result;
            }
            catch (error) {
                span.setStatus({ code: 2, message: error.message });
                span.recordException(error);
                span.end();
                throw error;
            }
        });
    }
    endActiveSpan() {
        const span = this.getActiveSpan();
        if (!span) {
            return;
        }
        span.end();
    }
    getActiveSpan() {
        return trace.getActiveSpan();
    }
    getSpanId() {
        const span = this.getActiveSpan();
        if (!span) {
            return;
        }
        const spanContext = span.spanContext();
        return spanContext.spanId;
    }
    getTraceId() {
        const span = this.getActiveSpan();
        if (!span) {
            return;
        }
        const spanContext = span.spanContext();
        return spanContext.traceId;
    }
    getTracer() {
        return this.tracer;
    }
    isTracingEnabled() {
        try {
            const provider = trace.getTracerProvider();
            return !!provider;
        }
        catch {
            return false;
        }
    }
    recordException(exception) {
        const span = this.getActiveSpan();
        if (!span) {
            return;
        }
        span.recordException(exception);
        span.setStatus({ code: 2, message: exception.message });
    }
    setSpanAttribute(key, value) {
        const span = this.getActiveSpan();
        if (!span) {
            return;
        }
        span.setAttribute(key, value);
    }
    setSpanAttributes(attributes) {
        const span = this.getActiveSpan();
        if (!span) {
            return;
        }
        span.setAttributes(attributes);
    }
    setSpanStatus(status, message) {
        const span = this.getActiveSpan();
        if (!span) {
            return;
        }
        const code = status === 'OK' ? 1 : 2;
        if (message) {
            span.setStatus({ code, message });
        }
        else {
            span.setStatus({ code });
        }
    }
    startSpan(spanName) {
        const span = this.tracer.startSpan(spanName);
        span.setAttributes(getServiceAttributes());
        return span;
    }
    withSpan(spanName, attributes = {}, fn) {
        return this.tracer.startActiveSpan(spanName, (span) => {
            span.setAttributes({
                ...getServiceAttributes(),
                ...attributes,
            });
            try {
                const result = fn();
                if (result && typeof result === 'object' && 'then' in result) {
                    return result
                        .then((value) => {
                        span.setStatus({ code: 1 });
                        return value;
                    })
                        .catch((error) => {
                        span.setStatus({ code: 2, message: error.message });
                        span.recordException(error);
                        throw error;
                    })
                        .finally(() => {
                        span.end();
                    });
                }
                span.setStatus({ code: 1 });
                span.end();
                return result;
            }
            catch (error) {
                span.setStatus({ code: 2, message: error.message });
                span.recordException(error);
                span.end();
                throw error;
            }
        });
    }
};
TracingService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [])
], TracingService);
export { TracingService };
//# sourceMappingURL=tracing.service.js.map