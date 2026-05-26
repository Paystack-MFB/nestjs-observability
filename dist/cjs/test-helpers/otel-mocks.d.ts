import { vi } from 'vitest';
export interface MockCounter {
    add: ReturnType<typeof vi.fn>;
}
export interface MockGauge {
    addCallback: ReturnType<typeof vi.fn>;
}
export interface MockHistogram {
    record: ReturnType<typeof vi.fn>;
}
export interface MockLogger {
    emit: ReturnType<typeof vi.fn>;
}
export interface MockLoggerProvider {
    getLogger: ReturnType<typeof vi.fn>;
}
export interface MockMeter {
    createCounter: ReturnType<typeof vi.fn>;
    createHistogram: ReturnType<typeof vi.fn>;
    createObservableGauge: ReturnType<typeof vi.fn>;
}
export interface MockMeterProvider {
    getMeter: ReturnType<typeof vi.fn>;
}
export interface MockNodeSDK {
    shutdown: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
}
export interface MockSpan {
    addEvent: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
    recordException: ReturnType<typeof vi.fn>;
    setAttributes: ReturnType<typeof vi.fn>;
    setStatus: ReturnType<typeof vi.fn>;
    spanContext: ReturnType<typeof vi.fn>;
}
export interface MockSpanContext {
    spanId: string;
    traceFlags: number;
    traceId: string;
}
export interface MockTracer {
    startSpan: ReturnType<typeof vi.fn>;
}
export interface MockTracerProvider {
    getTracer: ReturnType<typeof vi.fn>;
}
export declare const AsyncTestUtils: {
    readonly concurrent: <T>(operations: (() => Promise<T>)[]) => Promise<T[]>;
    readonly delay: (ms: number) => Promise<void>;
    readonly waitFor: (condition: () => boolean | Promise<boolean>, timeoutMs?: number, intervalMs?: number) => Promise<void>;
};
export declare const MockFactory: {
    readonly createEnvironment: (scenario: "development" | "disabled" | "production" | "test") => Record<string, string>;
    readonly createMockCounter: () => MockCounter;
    readonly createMockGauge: () => MockGauge;
    readonly createMockHistogram: () => MockHistogram;
    readonly createMockSpan: (options?: Partial<MockSpanContext>) => MockSpan;
};
export declare class OtelProviderMocks {
    mockLogger: MockLogger;
    mockLoggerProvider: MockLoggerProvider;
    mockMeter: MockMeter;
    mockMeterProvider: MockMeterProvider;
    mockSpan: MockSpan;
    mockSpanContext: MockSpanContext;
    mockTracer: MockTracer;
    mockTracerProvider: MockTracerProvider;
    constructor();
    clearMocks(): void;
    resetMocks(): void;
    setupMocks(): void;
}
export declare class TestEnvironment {
    private originalEnv;
    clearEnvironment(keys: string[]): void;
    restoreEnvironment(): void;
    setEnvironment(env: Record<string, string>): void;
}
export declare class TestSetup {
    environment: TestEnvironment;
    otelMocks: OtelProviderMocks;
    constructor();
    cleanup(): void;
    setupDefault(): void;
    setupDisabled(): void;
    setupOTLP(): void;
}
export declare const testEnvironment: TestEnvironment;
export declare const otelMocks: OtelProviderMocks;
export declare const testSetup: TestSetup;
//# sourceMappingURL=otel-mocks.d.ts.map