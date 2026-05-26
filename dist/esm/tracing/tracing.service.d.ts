import type { Span, Tracer } from '@opentelemetry/api';
export declare class TracingService {
    private readonly tracer;
    constructor();
    addSpanEvent(name: string, attributes?: Record<string, boolean | number | string>): void;
    createSpan<T>(spanName: string, fn: (span: Span) => T): T;
    endActiveSpan(): void;
    getActiveSpan(): Span | undefined;
    getSpanId(): string | undefined;
    getTraceId(): string | undefined;
    getTracer(): Tracer;
    isTracingEnabled(): boolean;
    recordException(exception: Error): void;
    setSpanAttribute(key: string, value: boolean | number | string): void;
    setSpanAttributes(attributes: Record<string, boolean | number | string>): void;
    setSpanStatus(status: 'ERROR' | 'OK', message?: string): void;
    startSpan(spanName: string): Span;
    withSpan<T>(spanName: string, attributes: Record<string, boolean | number | string> | undefined, fn: () => T): T;
}
//# sourceMappingURL=tracing.service.d.ts.map