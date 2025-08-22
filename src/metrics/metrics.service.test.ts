import { Test, TestingModule } from '@nestjs/testing';
import { metrics } from '@opentelemetry/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoggerService } from '../logger/logger.service';
import { MetricsService } from './metrics.service';

// Mock OpenTelemetry API
vi.mock('@opentelemetry/api', () => ({
  metrics: {
    getMeterProvider: vi.fn(),
  },
}));

describe('MetricsService', () => {
  let service: MetricsService;
  let module: TestingModule;
  let mockMeter: any;
  let mockMeterProvider: any;
  let mockLoggerService: any;

  beforeEach(async () => {
    // Mock OpenTelemetry meter
    mockMeter = {
      createCounter: vi.fn().mockReturnValue({ add: vi.fn() }),
      createHistogram: vi.fn().mockReturnValue({ record: vi.fn() }),
      createObservableGauge: vi.fn().mockReturnValue({ addCallback: vi.fn() }),
      addBatchObservableCallback: vi.fn(),
    };

    mockMeterProvider = {
      getMeter: vi.fn().mockReturnValue(mockMeter),
    };

    vi.mocked(metrics.getMeterProvider).mockReturnValue(mockMeterProvider);

    // Mock LoggerService
    mockLoggerService = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
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
    if (module) {
      await module.close();
    }
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with OpenTelemetry global meter provider', () => {
      expect(metrics.getMeterProvider).toHaveBeenCalled();
      expect(mockMeterProvider.getMeter).toHaveBeenCalledWith('nestjs-app', '1.0.0');
    });

    it('should initialize without throwing errors', () => {
      expect(service).toBeDefined();
      expect(service.getMeter()).toBe(mockMeter);
    });
  });

  describe('Counter Creation', () => {
    it('should create OpenTelemetry counter with correct parameters', () => {
      const counter = service.createCounter('test_counter', 'Test counter description');

      expect(mockMeter.createCounter).toHaveBeenCalledWith('test_counter', {
        description: 'Test counter description',
      });
      expect(counter).toBeDefined();
    });
  });

  describe('Histogram Creation', () => {
    it('should create OpenTelemetry histogram with correct parameters', () => {
      const histogram = service.createHistogram('test_histogram', 'Test histogram description');

      expect(mockMeter.createHistogram).toHaveBeenCalledWith('test_histogram', {
        description: 'Test histogram description',
      });
      expect(histogram).toBeDefined();
    });
  });

  describe('Gauge Creation', () => {
    it('should create OpenTelemetry observable gauge with correct parameters', () => {
      const gauge = service.createGauge('test_gauge', 'Test gauge description');

      expect(mockMeter.createObservableGauge).toHaveBeenCalledWith('test_gauge', {
        description: 'Test gauge description',
      });
      expect(gauge).toBeDefined();
    });

    it('should create gauge with callback function', () => {
      const callback = vi.fn().mockReturnValue(42);
      service.createGauge('test_gauge', 'Test gauge', callback);

      expect(mockMeter.createObservableGauge).toHaveBeenCalledWith('test_gauge', {
        description: 'Test gauge',
      });
      expect(mockMeter.addBatchObservableCallback).toHaveBeenCalled();
    });
  });

  describe('Summary Creation', () => {
    it('should create histogram for summary (OpenTelemetry does not have native summaries)', () => {
      const summary = service.createSummary('test_summary', 'Test summary description');

      expect(mockMeter.createHistogram).toHaveBeenCalledWith('test_summary', {
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
      expect(metrics.getMeterProvider).toHaveBeenCalled();
      expect(mockMeterProvider.getMeter).toHaveBeenCalledWith('nestjs-app', '1.0.0');
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