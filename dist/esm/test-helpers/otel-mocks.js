import { vi } from 'vitest';
export const AsyncTestUtils = {
    async concurrent(operations) {
        return Promise.all(operations.map((op) => op()));
    },
    async delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    },
    async waitFor(condition, timeoutMs = 5000, intervalMs = 100) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            if (await condition()) {
                return;
            }
            await AsyncTestUtils.delay(intervalMs);
        }
        throw new Error(`Condition not met within ${timeoutMs.toString()}ms`);
    },
};
export const MockFactory = {
    createEnvironment(scenario) {
        const base = {
            NODE_ENV: scenario === 'production' ? 'production' : 'test',
            OTEL_SERVICE_NAME: `test-service-${scenario}`,
            OTEL_SERVICE_VERSION: '1.0.0-test',
        };
        switch (scenario) {
            case 'development':
                return {
                    ...base,
                    OTEL_LOGS_EXPORTER: 'console',
                    OTEL_METRICS_ENABLED: 'true',
                    OTEL_METRICS_EXPORTER: 'console',
                    OTEL_TRACES_EXPORTER: 'console',
                    OTEL_TRACES_SAMPLER: 'always_on',
                };
            case 'disabled':
                return {
                    ...base,
                    OTEL_LOGS_EXPORTER: 'none',
                    OTEL_METRICS_ENABLED: 'false',
                    OTEL_METRICS_EXPORTER: 'none',
                    OTEL_TRACES_EXPORTER: 'none',
                };
            case 'production':
                return {
                    ...base,
                    OTEL_EXPORTER_OTLP_ENDPOINT: 'https://api.example.com',
                    OTEL_EXPORTER_OTLP_HEADERS: 'authorization=Bearer prod-token',
                    OTEL_LOGS_EXPORTER: 'otlp',
                    OTEL_METRICS_ENABLED: 'true',
                    OTEL_METRICS_EXPORTER: 'otlp',
                    OTEL_TRACES_EXPORTER: 'otlp',
                    OTEL_TRACES_SAMPLER: 'traceidratio',
                    OTEL_TRACES_SAMPLER_ARG: '0.1',
                };
            case 'test':
                return {
                    ...base,
                    OTEL_LOGS_EXPORTER: 'console',
                    OTEL_METRICS_ENABLED: 'true',
                    OTEL_METRICS_EXPORTER: 'console',
                    OTEL_TRACES_EXPORTER: 'console',
                    OTEL_TRACES_SAMPLER: 'always_on',
                };
            default:
                return base;
        }
    },
    createMockCounter() {
        return {
            add: vi.fn(),
        };
    },
    createMockGauge() {
        return {
            addCallback: vi.fn(),
        };
    },
    createMockHistogram() {
        return {
            record: vi.fn(),
        };
    },
    createMockSpan(options = {}) {
        const spanContext = {
            spanId: options.spanId ?? 'mock-span-id-abc',
            traceFlags: options.traceFlags ?? 1,
            traceId: options.traceId ?? 'mock-trace-id-123',
        };
        return {
            addEvent: vi.fn(),
            end: vi.fn(),
            recordException: vi.fn(),
            setAttributes: vi.fn(),
            setStatus: vi.fn(),
            spanContext: vi.fn().mockReturnValue(spanContext),
        };
    },
};
export class OtelProviderMocks {
    mockLogger;
    mockLoggerProvider;
    mockMeter;
    mockMeterProvider;
    mockSpan;
    mockSpanContext;
    mockTracer;
    mockTracerProvider;
    constructor() {
        this.mockSpanContext = {
            spanId: 'test-span-id-abcdef',
            traceFlags: 1,
            traceId: 'test-trace-id-123456789abcdef',
        };
        this.mockSpan = {
            addEvent: vi.fn(),
            end: vi.fn(),
            recordException: vi.fn(),
            setAttributes: vi.fn(),
            setStatus: vi.fn(),
            spanContext: vi.fn().mockReturnValue(this.mockSpanContext),
        };
        this.mockTracer = {
            startSpan: vi.fn().mockReturnValue(this.mockSpan),
        };
        this.mockTracerProvider = {
            getTracer: vi.fn().mockReturnValue(this.mockTracer),
        };
        this.mockLogger = {
            emit: vi.fn(),
        };
        this.mockLoggerProvider = {
            getLogger: vi.fn().mockReturnValue(this.mockLogger),
        };
        this.mockMeter = {
            createCounter: vi.fn().mockReturnValue({ add: vi.fn() }),
            createHistogram: vi.fn().mockReturnValue({ record: vi.fn() }),
            createObservableGauge: vi.fn().mockReturnValue({ addCallback: vi.fn() }),
        };
        this.mockMeterProvider = {
            getMeter: vi.fn().mockReturnValue(this.mockMeter),
        };
    }
    clearMocks() {
        Object.values(this).forEach((mock) => {
            if (mock && typeof mock === 'object' && 'mockClear' in mock) {
                mock.mockClear?.();
            }
            else if (mock && typeof mock === 'object') {
                Object.values(mock).forEach((nestedMock) => {
                    if (nestedMock && typeof nestedMock === 'object' && 'mockClear' in nestedMock) {
                        nestedMock.mockClear?.();
                    }
                });
            }
        });
    }
    resetMocks() {
        Object.values(this).forEach((mock) => {
            if (mock && typeof mock === 'object' && 'mockReset' in mock) {
                mock.mockReset?.();
            }
            else if (mock && typeof mock === 'object') {
                Object.values(mock).forEach((nestedMock) => {
                    if (nestedMock && typeof nestedMock === 'object' && 'mockReset' in nestedMock) {
                        nestedMock.mockReset?.();
                    }
                });
            }
        });
    }
    setupMocks() {
        vi.doMock('@opentelemetry/api', () => ({
            metrics: {
                getMeterProvider: vi.fn().mockReturnValue(this.mockMeterProvider),
            },
            SpanKind: {
                CLIENT: 2,
                INTERNAL: 0,
                SERVER: 1,
            },
            SpanStatusCode: {
                ERROR: 2,
                OK: 1,
            },
            trace: {
                getActiveSpan: vi.fn().mockReturnValue(this.mockSpan),
                getSpan: vi.fn().mockReturnValue(this.mockSpan),
                getTracerProvider: vi.fn().mockReturnValue(this.mockTracerProvider),
                setSpan: vi.fn(),
            },
        }));
        vi.doMock('@opentelemetry/api-logs', () => ({
            logs: {
                getLoggerProvider: vi.fn().mockReturnValue(this.mockLoggerProvider),
            },
        }));
        vi.doMock('@opentelemetry/resources', () => ({
            Resource: vi.fn(),
            resourceFromAttributes: vi.fn().mockReturnValue({}),
        }));
        vi.doMock('@opentelemetry/sdk-node', () => ({
            NodeSDK: vi.fn().mockImplementation(() => ({
                shutdown: vi.fn().mockResolvedValue(undefined),
                start: vi.fn(),
            })),
        }));
        vi.doMock('@opentelemetry/auto-instrumentations-node', () => ({
            getNodeAutoInstrumentations: vi.fn().mockReturnValue([]),
        }));
        vi.doMock('@opentelemetry/exporter-trace-otlp-http', () => ({
            OTLPTraceExporter: vi.fn(),
        }));
        vi.doMock('@opentelemetry/exporter-metrics-otlp-http', () => ({
            OTLPMetricExporter: vi.fn(),
        }));
        vi.doMock('@opentelemetry/exporter-logs-otlp-http', () => ({
            OTLPLogExporter: vi.fn(),
        }));
        vi.doMock('@opentelemetry/sdk-metrics', () => ({
            ConsoleMetricExporter: vi.fn(),
            MetricReader: vi.fn(),
            PeriodicExportingMetricReader: vi.fn().mockImplementation(() => ({})),
        }));
        vi.doMock('@opentelemetry/sdk-logs', () => ({
            BatchLogRecordProcessor: vi.fn(),
            ConsoleLogRecordExporter: vi.fn(),
            LoggerProvider: vi.fn(),
        }));
    }
}
export class TestEnvironment {
    originalEnv = {};
    clearEnvironment(keys) {
        keys.forEach((key) => {
            this.originalEnv[key] = process.env[key];
            Reflect.deleteProperty(process.env, key);
        });
    }
    restoreEnvironment() {
        Object.entries(this.originalEnv).forEach(([key, value]) => {
            if (value === undefined) {
                Reflect.deleteProperty(process.env, key);
            }
            else {
                process.env[key] = value;
            }
        });
        this.originalEnv = {};
    }
    setEnvironment(env) {
        Object.entries(env).forEach(([key, value]) => {
            this.originalEnv[key] = process.env[key];
            process.env[key] = value;
        });
    }
}
export class TestSetup {
    environment;
    otelMocks;
    constructor() {
        this.environment = new TestEnvironment();
        this.otelMocks = new OtelProviderMocks();
    }
    cleanup() {
        this.environment.restoreEnvironment();
        this.otelMocks.clearMocks();
        vi.clearAllMocks();
    }
    setupDefault() {
        this.environment.setEnvironment({
            NODE_ENV: 'test',
            OTEL_LOGS_EXPORTER: 'console',
            OTEL_METRICS_ENABLED: 'true',
            OTEL_METRICS_EXPORTER: 'console',
            OTEL_SERVICE_NAME: 'test-service',
            OTEL_SERVICE_VERSION: '1.0.0-test',
            OTEL_TRACES_EXPORTER: 'console',
            OTEL_TRACES_SAMPLER: 'always_on',
        });
        this.otelMocks.setupMocks();
    }
    setupDisabled() {
        this.environment.setEnvironment({
            NODE_ENV: 'test',
            OTEL_LOGS_EXPORTER: 'none',
            OTEL_METRICS_ENABLED: 'false',
            OTEL_METRICS_EXPORTER: 'none',
            OTEL_SERVICE_NAME: 'test-disabled-service',
            OTEL_SERVICE_VERSION: '1.0.0-disabled',
            OTEL_TRACES_EXPORTER: 'none',
        });
        this.otelMocks.setupMocks();
    }
    setupOTLP() {
        this.environment.setEnvironment({
            NODE_ENV: 'test',
            OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4317',
            OTEL_EXPORTER_OTLP_HEADERS: 'authorization=Bearer test-token',
            OTEL_LOGS_EXPORTER: 'otlp',
            OTEL_METRICS_EXPORTER: 'otlp',
            OTEL_SERVICE_NAME: 'test-otlp-service',
            OTEL_SERVICE_VERSION: '1.0.0-otlp',
            OTEL_TRACES_EXPORTER: 'otlp',
            OTEL_TRACES_SAMPLER: 'traceidratio',
            OTEL_TRACES_SAMPLER_ARG: '0.1',
        });
        this.otelMocks.setupMocks();
    }
}
export const testEnvironment = new TestEnvironment();
export const otelMocks = new OtelProviderMocks();
export const testSetup = new TestSetup();
//# sourceMappingURL=otel-mocks.js.map