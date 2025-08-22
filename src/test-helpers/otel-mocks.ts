/**
 * Centralized OpenTelemetry Mocking Utilities
 * 
 * This module provides comprehensive mocking for OpenTelemetry APIs
 * to ensure consistent testing across all components.
 */

import { vi } from 'vitest';

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

export interface MockTracer {
  startSpan: ReturnType<typeof vi.fn>;
}

export interface MockTracerProvider {
  getTracer: ReturnType<typeof vi.fn>;
}

export interface MockSpan {
  setAttributes: ReturnType<typeof vi.fn>;
  setStatus: ReturnType<typeof vi.fn>;
  recordException: ReturnType<typeof vi.fn>;
  addEvent: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  spanContext: ReturnType<typeof vi.fn>;
}

export interface MockSpanContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
}

export interface MockNodeSDK {
  start: ReturnType<typeof vi.fn>;
  shutdown: ReturnType<typeof vi.fn>;
}

export interface MockCounter {
  add: ReturnType<typeof vi.fn>;
}

export interface MockHistogram {
  record: ReturnType<typeof vi.fn>;
}

export interface MockGauge {
  addCallback: ReturnType<typeof vi.fn>;
}

/**
 * Environment variable management for tests
 */
export class TestEnvironment {
  private originalEnv: Record<string, string | undefined> = {};

  /**
   * Set test environment variables and backup originals
   */
  setEnvironment(env: Record<string, string>): void {
    Object.entries(env).forEach(([key, value]) => {
      this.originalEnv[key] = process.env[key];
      process.env[key] = value;
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
   * Clear specific environment variables
   */
  clearEnvironment(keys: string[]): void {
    keys.forEach(key => {
      this.originalEnv[key] = process.env[key];
      delete process.env[key];
    });
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
  public mockTracer: MockTracer;
  public mockTracerProvider: MockTracerProvider;
  public mockSpan: MockSpan;
  public mockSpanContext: MockSpanContext;

  constructor() {
    this.mockSpanContext = {
      traceId: 'test-trace-id-123456789abcdef',
      spanId: 'test-span-id-abcdef',
      traceFlags: 1,
    };

    this.mockSpan = {
      setAttributes: vi.fn(),
      setStatus: vi.fn(),
      recordException: vi.fn(),
      addEvent: vi.fn(),
      end: vi.fn(),
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
   * Setup mocks for OpenTelemetry APIs
   */
  setupMocks(): void {
    // Mock @opentelemetry/api
    vi.doMock('@opentelemetry/api', () => ({
      trace: {
        getActiveSpan: vi.fn().mockReturnValue(this.mockSpan),
        getTracerProvider: vi.fn().mockReturnValue(this.mockTracerProvider),
        setSpan: vi.fn(),
        getSpan: vi.fn().mockReturnValue(this.mockSpan),
      },
      metrics: {
        getMeterProvider: vi.fn().mockReturnValue(this.mockMeterProvider),
      },
      SpanStatusCode: {
        OK: 1,
        ERROR: 2,
      },
      SpanKind: {
        INTERNAL: 0,
        SERVER: 1,
        CLIENT: 2,
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
        start: vi.fn(),
        shutdown: vi.fn().mockResolvedValue(undefined),
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
      ConsoleLogRecordExporter: vi.fn(),
      LoggerProvider: vi.fn(),
      BatchLogRecordProcessor: vi.fn(),
    }));
  }

  /**
   * Clear all mocks
   */
  clearMocks(): void {
    Object.values(this).forEach(mock => {
      if (mock && typeof mock === 'object' && 'mockClear' in mock) {
        (mock as any).mockClear();
      } else if (mock && typeof mock === 'object') {
        Object.values(mock).forEach(nestedMock => {
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
    Object.values(this).forEach(mock => {
      if (mock && typeof mock === 'object' && 'mockReset' in mock) {
        (mock as any).mockReset();
      } else if (mock && typeof mock === 'object') {
        Object.values(mock).forEach(nestedMock => {
          if (nestedMock && typeof nestedMock === 'object' && 'mockReset' in nestedMock) {
            (nestedMock as any).mockReset();
          }
        });
      }
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
   * Setup test environment with default configuration
   */
  setupDefault(): void {
    this.environment.setEnvironment({
      OTEL_SERVICE_NAME: 'test-service',
      OTEL_SERVICE_VERSION: '1.0.0-test',
      NODE_ENV: 'test',
      OTEL_TRACES_EXPORTER: 'console',
      OTEL_METRICS_EXPORTER: 'console',
      OTEL_LOGS_EXPORTER: 'console',
      OTEL_TRACES_SAMPLER: 'always_on',
      OTEL_METRICS_ENABLED: 'true',
    });
    this.otelMocks.setupMocks();
  }

  /**
   * Setup test environment for OTLP configuration
   */
  setupOTLP(): void {
    this.environment.setEnvironment({
      OTEL_SERVICE_NAME: 'test-otlp-service',
      OTEL_SERVICE_VERSION: '1.0.0-otlp',
      NODE_ENV: 'test',
      OTEL_TRACES_EXPORTER: 'otlp',
      OTEL_METRICS_EXPORTER: 'otlp',
      OTEL_LOGS_EXPORTER: 'otlp',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4317',
      OTEL_EXPORTER_OTLP_HEADERS: 'authorization=Bearer test-token',
      OTEL_TRACES_SAMPLER: 'traceidratio',
      OTEL_TRACES_SAMPLER_ARG: '0.1',
    });
    this.otelMocks.setupMocks();
  }

  /**
   * Setup test environment with disabled features
   */
  setupDisabled(): void {
    this.environment.setEnvironment({
      OTEL_SERVICE_NAME: 'test-disabled-service',
      OTEL_SERVICE_VERSION: '1.0.0-disabled',
      NODE_ENV: 'test',
      OTEL_TRACES_EXPORTER: 'none',
      OTEL_METRICS_EXPORTER: 'none',
      OTEL_LOGS_EXPORTER: 'none',
      OTEL_METRICS_ENABLED: 'false',
    });
    this.otelMocks.setupMocks();
  }

  /**
   * Cleanup after tests
   */
  cleanup(): void {
    this.environment.restoreEnvironment();
    this.otelMocks.clearMocks();
    vi.clearAllMocks();
  }
}

/**
 * Async operation utilities for testing
 */
export class AsyncTestUtils {
  /**
   * Wait for a specified number of milliseconds
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for a condition to be true with timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeoutMs: number = 5000,
    intervalMs: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (await condition()) {
        return;
      }
      await this.delay(intervalMs);
    }
    
    throw new Error(`Condition not met within ${timeoutMs}ms`);
  }

  /**
   * Execute multiple operations concurrently and wait for completion
   */
  static async concurrent<T>(operations: (() => Promise<T>)[]): Promise<T[]> {
    return Promise.all(operations.map(op => op()));
  }
}

/**
 * Mock factory for creating standardized mocks
 */
export class MockFactory {
  /**
   * Create a mock counter with standard methods
   */
  static createMockCounter(): MockCounter {
    return {
      add: vi.fn(),
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
   * Create a mock gauge with standard methods
   */
  static createMockGauge(): MockGauge {
    return {
      addCallback: vi.fn(),
    };
  }

  /**
   * Create a mock span with comprehensive methods
   */
  static createMockSpan(options: Partial<MockSpanContext> = {}): MockSpan {
    const spanContext: MockSpanContext = {
      traceId: options.traceId || 'mock-trace-id-123',
      spanId: options.spanId || 'mock-span-id-abc',
      traceFlags: options.traceFlags || 1,
    };

    return {
      setAttributes: vi.fn(),
      setStatus: vi.fn(),
      recordException: vi.fn(),
      addEvent: vi.fn(),
      end: vi.fn(),
      spanContext: vi.fn().mockReturnValue(spanContext),
    };
  }

  /**
   * Create mock environment variables for different scenarios
   */
  static createEnvironment(scenario: 'development' | 'production' | 'test' | 'disabled'): Record<string, string> {
    const base = {
      OTEL_SERVICE_NAME: `test-service-${scenario}`,
      OTEL_SERVICE_VERSION: '1.0.0-test',
      NODE_ENV: scenario === 'production' ? 'production' : 'test',
    };

    switch (scenario) {
      case 'development':
        return {
          ...base,
          OTEL_TRACES_EXPORTER: 'console',
          OTEL_METRICS_EXPORTER: 'console',
          OTEL_LOGS_EXPORTER: 'console',
          OTEL_TRACES_SAMPLER: 'always_on',
          OTEL_METRICS_ENABLED: 'true',
        };

      case 'production':
        return {
          ...base,
          OTEL_TRACES_EXPORTER: 'otlp',
          OTEL_METRICS_EXPORTER: 'otlp',
          OTEL_LOGS_EXPORTER: 'otlp',
          OTEL_EXPORTER_OTLP_ENDPOINT: 'https://api.example.com',
          OTEL_EXPORTER_OTLP_HEADERS: 'authorization=Bearer prod-token',
          OTEL_TRACES_SAMPLER: 'traceidratio',
          OTEL_TRACES_SAMPLER_ARG: '0.1',
          OTEL_METRICS_ENABLED: 'true',
        };

      case 'test':
        return {
          ...base,
          OTEL_TRACES_EXPORTER: 'console',
          OTEL_METRICS_EXPORTER: 'console',
          OTEL_LOGS_EXPORTER: 'console',
          OTEL_TRACES_SAMPLER: 'always_on',
          OTEL_METRICS_ENABLED: 'true',
        };

      case 'disabled':
        return {
          ...base,
          OTEL_TRACES_EXPORTER: 'none',
          OTEL_METRICS_EXPORTER: 'none',
          OTEL_LOGS_EXPORTER: 'none',
          OTEL_METRICS_ENABLED: 'false',
        };

      default:
        return base;
    }
  }
}

// Export singleton instances for convenience
export const testEnvironment = new TestEnvironment();
export const otelMocks = new OtelProviderMocks();
export const testSetup = new TestSetup();
