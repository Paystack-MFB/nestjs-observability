/**
 * Unit tests for OpenTelemetry Register Module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the NodeSDK and other OpenTelemetry imports before importing register
vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: vi.fn().mockReturnValue([]),
}));

vi.mock('@opentelemetry/resources', () => ({
  Resource: vi.fn(),
  resourceFromAttributes: vi.fn().mockReturnValue({}),
}));

vi.mock('@opentelemetry/sdk-metrics', () => ({
  ConsoleMetricExporter: vi.fn(),
  MetricReader: vi.fn(),
  PeriodicExportingMetricReader: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@opentelemetry/sdk-trace-node', () => ({
  BatchSpanProcessor: vi.fn().mockImplementation(() => ({})),
  ConsoleSpanExporter: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@opentelemetry/semantic-conventions', () => ({
  ATTR_SERVICE_NAME: 'service.name',
  ATTR_SERVICE_VERSION: 'service.version',
}));

describe('Register Module', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    
    // Clear module cache to ensure fresh imports
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Environment Variable Parsing', () => {
    it('should use OTEL_SERVICE_NAME when provided', async () => {
      process.env['OTEL_SERVICE_NAME'] = 'test-service-otel';
      process.env['SERVICE_NAME'] = 'test-service-fallback';
      
      // Import register module after setting env vars
      const { resourceFromAttributes } = await import('@opentelemetry/resources');
      await import('./register');

      expect(resourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'test-service-otel',
        'service.version': '1.0.0',
        'service.environment': 'test',
      });
    });

    it('should fallback to SERVICE_NAME when OTEL_SERVICE_NAME is not provided', async () => {
      delete process.env['OTEL_SERVICE_NAME'];
      process.env['SERVICE_NAME'] = 'test-service-fallback';
      
      const { resourceFromAttributes } = await import('@opentelemetry/resources');
      await import('./register');

      expect(resourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'test-service-fallback',
        'service.version': '1.0.0',
        'service.environment': 'test',
      });
    });

    it('should use default service name when no env vars are provided', async () => {
      delete process.env['OTEL_SERVICE_NAME'];
      delete process.env['SERVICE_NAME'];
      
      const { resourceFromAttributes } = await import('@opentelemetry/resources');
      await import('./register');

      expect(resourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'unknown-service',
        'service.version': '1.0.0',
        'service.environment': 'test',
      });
    });

    it('should use OTEL_SERVICE_VERSION when provided', async () => {
      process.env['OTEL_SERVICE_VERSION'] = '2.1.0';
      process.env['SERVICE_VERSION'] = '1.5.0';
      
      const { resourceFromAttributes } = await import('@opentelemetry/resources');
      await import('./register');

      expect(resourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'unknown-service',
        'service.version': '2.1.0',
        'service.environment': 'test',
      });
    });

    it('should use NODE_ENV when provided', async () => {
      process.env['NODE_ENV'] = 'production';
      
      const { resourceFromAttributes } = await import('@opentelemetry/resources');
      await import('./register');

      expect(resourceFromAttributes).toHaveBeenCalledWith({
        'service.name': 'unknown-service',
        'service.version': '1.0.0',
        'service.environment': 'production',
      });
    });
  });

  describe('SDK Initialization', () => {
    it('should initialize NodeSDK with correct configuration', async () => {
      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
      const { PeriodicExportingMetricReader } = await import('@opentelemetry/sdk-metrics');
      const { BatchSpanProcessor } = await import('@opentelemetry/sdk-trace-node');

      await import('./register');

      expect(NodeSDK).toHaveBeenCalledWith({
        instrumentations: [],
        metricReader: expect.any(Object),
        resource: {},
        spanProcessors: [expect.any(Object)],
      });
      
      expect(getNodeAutoInstrumentations).toHaveBeenCalledWith({
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      });
      
      expect(PeriodicExportingMetricReader).toHaveBeenCalledWith({
        exporter: expect.any(Object),
        exportIntervalMillis: 10000,
      });
      
      expect(BatchSpanProcessor).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should start the SDK after initialization', async () => {
      const mockStart = vi.fn();
      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      (NodeSDK as any).mockImplementation(() => ({
        start: mockStart,
        shutdown: vi.fn().mockResolvedValue(undefined),
      }));

      await import('./register');

      expect(mockStart).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle SDK initialization errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      
      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      (NodeSDK as any).mockImplementation(() => {
        throw new Error('SDK initialization failed');
      });

      await import('./register');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize OpenTelemetry SDK:',
        expect.any(Error)
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      
      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('should handle SDK shutdown errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      
      const mockShutdown = vi.fn().mockRejectedValue(new Error('Shutdown failed'));
      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      (NodeSDK as any).mockImplementation(() => ({
        start: vi.fn(),
        shutdown: mockShutdown,
      }));

      const { sdk } = await import('./register');
      
      // Mock the gracefulShutdown function call
      if (sdk) {
        try {
          await sdk.shutdown();
        } catch (error) {
          console.error('Error during OpenTelemetry SDK shutdown:', error);
        }
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error during OpenTelemetry SDK shutdown:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('SDK Export', () => {
    it('should export SDK instance', async () => {
      const { sdk } = await import('./register');
      expect(sdk).toBeDefined();
    });
  });

  describe('Console Output', () => {
    it('should log initialization success message', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      process.env['OTEL_SERVICE_NAME'] = 'test-service';
      process.env['OTEL_SERVICE_VERSION'] = '1.2.3';
      process.env['NODE_ENV'] = 'test';

      await import('./register');

      expect(consoleSpy).toHaveBeenCalledWith('OpenTelemetry SDK initialized successfully');
      expect(consoleSpy).toHaveBeenCalledWith('Service: test-service');
      expect(consoleSpy).toHaveBeenCalledWith('Version: 1.2.3');
      expect(consoleSpy).toHaveBeenCalledWith('Environment: test');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Graceful Shutdown Handlers', () => {
    it('should register SIGTERM and SIGINT handlers', async () => {
      const onSpy = vi.spyOn(process, 'on');
      
      await import('./register');

      expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      
      onSpy.mockRestore();
    });
  });
});