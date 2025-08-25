/**
 * Centralized OpenTelemetry Mocking Utilities
 *
 * This module provides comprehensive mocking for OpenTelemetry APIs
 * to ensure consistent testing across all components.
 */

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

// Type definitions for mocks
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

/**
 * Async operation utilities for testing
 */
export class AsyncTestUtils {
  /**
   * Execute multiple operations concurrently and wait for completion
   */
  static async concurrent<T>(operations: (() => Promise<T>)[]): Promise<T[]> {
    return Promise.all(operations.map((op) => op()));
  }

  /**
   * Wait for a specified number of milliseconds
   */
  static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Wait for a condition to be true with timeout
   */
  static async waitFor(condition: () => boolean | Promise<boolean>, timeoutMs = 5000, intervalMs = 100): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (await condition()) {
        return;
      }
      await this.delay(intervalMs);
    }

    throw new Error(`Condition not met within ${timeoutMs}ms`);
  }
}

/**
 * Mock factory for creating standardized mocks
 */
export class MockFactory {
  /**
   * Create mock environment variables for different scenarios
   */
  static createEnvironment(scenario: 'development' | 'disabled' | 'production' | 'test'): Record<string, string> {
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
  }

  /**
   * Create a mock counter with standard methods
   */
  static createMockCounter(): MockCounter {
    return {
      add: vi.fn(),
    };
  }

  /**
   * Create a mock gauge with standard methods
   */
  static createMockGauge(): MockGauge {
    return {
      addCallback: vi.fn(),
    };
  }

  /**
   * Create a mock histogram with standard methods
   */
  static createMockHistogram(): MockHistogram {
    return {
      record: vi.fn(),
    };
  }

  /**
   * Create a mock span with comprehensive methods
   */
  static createMockSpan(options: Partial<MockSpanContext> = {}): MockSpan {
    const spanContext: MockSpanContext = {
      spanId: options.spanId || 'mock-span-id-abc',
      traceFlags: options.traceFlags || 1,
      traceId: options.traceId || 'mock-trace-id-123',
    };

    return {
      addEvent: vi.fn(),
      end: vi.fn(),
      recordException: vi.fn(),
      setAttributes: vi.fn(),
      setStatus: vi.fn(),
      spanContext: vi.fn().mockReturnValue(spanContext),
    };
  }
}

/**
 * OpenTelemetry Global Provider Mocks
 */
export class OtelProviderMocks {
  public mockLogger: MockLogger;
  public mockLoggerProvider: MockLoggerProvider;
  public mockMeter: MockMeter;
  public mockMeterProvider: MockMeterProvider;
  public mockSpan: MockSpan;
  public mockSpanContext: MockSpanContext;
  public mockTracer: MockTracer;
  public mockTracerProvider: MockTracerProvider;

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

  /**
   * Clear all mocks
   */
  clearMocks(): void {
    Object.values(this).forEach((mock) => {
      if (mock && typeof mock === 'object' && 'mockClear' in mock) {
        mock.mockClear();
      } else if (mock && typeof mock === 'object') {
        Object.values(mock).forEach((nestedMock) => {
          if (nestedMock && typeof nestedMock === 'object' && 'mockClear' in nestedMock) {
            (nestedMock as any).mockClear();
          }
        });
      }
    });
  }

  /**
   * Reset all mocks to initial state
   */
  resetMocks(): void {
    Object.values(this).forEach((mock) => {
      if (mock && typeof mock === 'object' && 'mockReset' in mock) {
        mock.mockReset();
      } else if (mock && typeof mock === 'object') {
        Object.values(mock).forEach((nestedMock) => {
          if (nestedMock && typeof nestedMock === 'object' && 'mockReset' in nestedMock) {
            (nestedMock as any).mockReset();
          }
        });
      }
    });
  }

  /**
   * Setup mocks for OpenTelemetry APIs
   */
  setupMocks(): void {
    // Mock @opentelemetry/api
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

    // Mock @opentelemetry/api-logs
    vi.doMock('@opentelemetry/api-logs', () => ({
      logs: {
        getLoggerProvider: vi.fn().mockReturnValue(this.mockLoggerProvider),
      },
    }));

    // Mock @opentelemetry/resources
    vi.doMock('@opentelemetry/resources', () => ({
      Resource: vi.fn(),
      resourceFromAttributes: vi.fn().mockReturnValue({}),
    }));

    // Mock @opentelemetry/sdk-node
    vi.doMock('@opentelemetry/sdk-node', () => ({
      NodeSDK: vi.fn().mockImplementation(() => ({
        shutdown: vi.fn().mockResolvedValue(undefined),
        start: vi.fn(),
      })),
    }));

    // Mock auto-instrumentations
    vi.doMock('@opentelemetry/auto-instrumentations-node', () => ({
      getNodeAutoInstrumentations: vi.fn().mockReturnValue([]),
    }));

    // Mock exporters
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

/**
 * Environment variable management for tests
 */
export class TestEnvironment {
  private originalEnv: Record<string, string | undefined> = {};

  /**
   * Clear specific environment variables
   */
  clearEnvironment(keys: string[]): void {
    keys.forEach((key) => {
      this.originalEnv[key] = process.env[key];
      delete process.env[key];
    });
  }

  /**
   * Restore original environment variables
   */
  restoreEnvironment(): void {
    Object.entries(this.originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
    this.originalEnv = {};
  }

  /**
   * Set test environment variables and backup originals
   */
  setEnvironment(env: Record<string, string>): void {
    Object.entries(env).forEach(([key, value]) => {
      this.originalEnv[key] = process.env[key];
      process.env[key] = value;
    });
  }
}

/**
 * Test Setup Helper
 */
export class TestSetup {
  public environment: TestEnvironment;
  public otelMocks: OtelProviderMocks;

  constructor() {
    this.environment = new TestEnvironment();
    this.otelMocks = new OtelProviderMocks();
  }

  /**
   * Cleanup after tests
   */
  cleanup(): void {
    this.environment.restoreEnvironment();
    this.otelMocks.clearMocks();
    vi.clearAllMocks();
  }

  /**
   * Setup test environment with default configuration
   */
  setupDefault(): void {
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

  /**
   * Setup test environment with disabled features
   */
  setupDisabled(): void {
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

  /**
   * Setup test environment for OTLP configuration
   */
  setupOTLP(): void {
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

// Export singleton instances for convenience
export const testEnvironment = new TestEnvironment();
export const otelMocks = new OtelProviderMocks();
export const testSetup = new TestSetup();
