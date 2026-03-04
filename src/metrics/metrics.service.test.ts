import { Test, TestingModule } from '@nestjs/testing';
import { metrics } from '@opentelemetry/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoggerService } from '../logger/logger.service';
import { getServiceName, getServiceVersion } from '../sdk-core';
import { MetricsService } from './metrics.service';

interface MockLoggerService {
  debug: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  log: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
}

// Test types
interface MockMeter {
  addBatchObservableCallback: ReturnType<typeof vi.fn>;
  createCounter: ReturnType<typeof vi.fn>;
  createHistogram: ReturnType<typeof vi.fn>;
  createObservableGauge: ReturnType<typeof vi.fn>;
}

interface MockMeterProvider {
  getMeter: ReturnType<typeof vi.fn>;
}

// Mock OpenTelemetry API
vi.mock('@opentelemetry/api', () => ({
  context: {
    active: vi.fn().mockReturnValue({
      getValue: vi.fn(),
      setValue: vi.fn().mockReturnValue({}),
    }),
    with: vi.fn((_ctx: unknown, fn: () => unknown) => fn()),
  },
  createContextKey: vi.fn((name: string) => Symbol(name)),
  metrics: {
    getMeterProvider: vi.fn(),
  },
}));

describe('MetricsService', () => {
  let service: MetricsService;
  let module: TestingModule;
  let mockMeter: MockMeter;
  let mockMeterProvider: MockMeterProvider;
  let mockLoggerService: MockLoggerService;

  // Helper function to avoid unbound method warnings
  const getMockedGetMeterProvider = (): ReturnType<typeof vi.mocked<typeof metrics.getMeterProvider>> =>
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(metrics.getMeterProvider);

  // Helper functions to access mock methods safely
  const getMockMeterMethod = (method: keyof MockMeter): ReturnType<typeof vi.fn> =>
    (mockMeter as unknown as Record<string, ReturnType<typeof vi.fn>>)[method];
  const getMockMeterProviderMethod = (method: keyof MockMeterProvider): ReturnType<typeof vi.fn> =>
    (mockMeterProvider as unknown as Record<string, ReturnType<typeof vi.fn>>)[method];

  beforeEach(async () => {
    // Mock OpenTelemetry meter
    mockMeter = {
      addBatchObservableCallback: vi.fn(),
      createCounter: vi.fn().mockReturnValue({ add: vi.fn() }),
      createHistogram: vi.fn().mockReturnValue({ record: vi.fn() }),
      createObservableGauge: vi.fn().mockReturnValue({ addCallback: vi.fn() }),
    };

    mockMeterProvider = {
      getMeter: vi.fn().mockReturnValue(mockMeter),
    };

    getMockedGetMeterProvider().mockReturnValue(
      mockMeterProvider as unknown as ReturnType<typeof metrics.getMeterProvider>
    );

    // Mock LoggerService
    mockLoggerService = {
      debug: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  afterEach(async () => {
    await module.close();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with OpenTelemetry global meter provider', () => {
      expect(getMockedGetMeterProvider()).toHaveBeenCalled();
      expect(getMockMeterProviderMethod('getMeter')).toHaveBeenCalledWith(getServiceName(), getServiceVersion());
    });

    it('should initialize without throwing errors', () => {
      expect(service).toBeDefined();
      expect(service.getMeter()).toBe(mockMeter);
    });
  });

  describe('Counter Creation', () => {
    it('should create OpenTelemetry counter with correct parameters', () => {
      const counter = service.createCounter('test_counter', 'Test counter description');

      expect(getMockMeterMethod('createCounter')).toHaveBeenCalledWith('test_counter', {
        description: 'Test counter description',
      });
      expect(counter).toBeDefined();
    });
  });

  describe('Histogram Creation', () => {
    it('should create OpenTelemetry histogram with correct parameters', () => {
      const histogram = service.createHistogram('test_histogram', 'Test histogram description');

      expect(getMockMeterMethod('createHistogram')).toHaveBeenCalledWith('test_histogram', {
        description: 'Test histogram description',
      });
      expect(histogram).toBeDefined();
    });
  });

  describe('Gauge Creation', () => {
    it('should create OpenTelemetry observable gauge with correct parameters', () => {
      const gauge = service.createGauge('test_gauge', 'Test gauge description');

      expect(getMockMeterMethod('createObservableGauge')).toHaveBeenCalledWith('test_gauge', {
        description: 'Test gauge description',
      });
      expect(gauge).toBeDefined();
    });

    it('should create gauge with callback function', () => {
      const callback = vi.fn().mockReturnValue(42);
      service.createGauge('test_gauge', 'Test gauge', callback);

      expect(getMockMeterMethod('createObservableGauge')).toHaveBeenCalledWith('test_gauge', {
        description: 'Test gauge',
      });
      expect(getMockMeterMethod('addBatchObservableCallback')).toHaveBeenCalled();
    });
  });

  describe('Summary Creation', () => {
    it('should create histogram for summary (OpenTelemetry does not have native summaries)', () => {
      const summary = service.createSummary('test_summary', 'Test summary description');

      expect(getMockMeterMethod('createHistogram')).toHaveBeenCalledWith('test_summary', {
        description: 'Test summary description',
      });
      expect(summary).toBeDefined();
    });
  });

  describe('Metrics Export', () => {
    it('should return Prometheus metrics in string format', async () => {
      const metrics = await service.getMetrics();
      expect(typeof metrics).toBe('string');
    });

    it('should provide access to Prometheus registry', () => {
      const registry = service.getRegistry();
      expect(registry).toBeDefined();
      expect(typeof registry.metrics).toBe('function');
    });

    it('should provide access to OpenTelemetry meter', () => {
      const meter = service.getMeter();
      expect(meter).toBe(mockMeter);
    });
  });

  describe('Environment Variable Integration', () => {
    it('should handle environment variables gracefully', () => {
      // Service should initialize regardless of environment variable state
      expect(service).toBeDefined();
      expect(service.getRegistry()).toBeDefined();
    });
  });

  describe('Module Lifecycle', () => {
    it('should handle onModuleInit without errors', () => {
      expect(() => {
        service.onModuleInit();
      }).not.toThrow();

      // The logger might be called during initialization if default metrics are enabled
      // This test just ensures onModuleInit completes without throwing
      expect(service).toBeDefined();
    });
  });

  describe('Global OpenTelemetry Integration', () => {
    it('should use global meter provider', () => {
      expect(getMockedGetMeterProvider()).toHaveBeenCalled();
      expect(getMockMeterProviderMethod('getMeter')).toHaveBeenCalledWith(getServiceName(), getServiceVersion());
    });

    it('should create metrics without configuration dependency', () => {
      // Should be able to create metrics without ObservabilityConfig
      const counter = service.createCounter('no_config_counter', 'Counter without config');
      const histogram = service.createHistogram('no_config_histogram', 'Histogram without config');
      const gauge = service.createGauge('no_config_gauge', 'Gauge without config');

      expect(counter).toBeDefined();
      expect(histogram).toBeDefined();
      expect(gauge).toBeDefined();
    });

    it('should maintain backward compatibility with Prometheus', () => {
      const registry = service.getRegistry();

      // Should have standard Prometheus registry methods
      expect(typeof registry.metrics).toBe('function');
      expect(typeof registry.registerMetric).toBe('function');
      expect(typeof registry.setDefaultLabels).toBe('function');
    });
  });
});
