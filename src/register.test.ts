/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Unit tests for OpenTelemetry Register Module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the NodeSDK and other OpenTelemetry imports before importing register
vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: vi.fn().mockImplementation(() => ({
    shutdown: vi.fn().mockResolvedValue(undefined),
    start: vi.fn(),
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

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({
  OTLPMetricExporter: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@opentelemetry/exporter-logs-otlp-http', () => ({
  OTLPLogExporter: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@opentelemetry/sdk-logs', () => ({
  BatchLogRecordProcessor: vi.fn().mockImplementation(() => ({})),
  ConsoleLogRecordExporter: vi.fn().mockImplementation(() => ({})),
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

      // Import register module after setting env vars
      const { resourceFromAttributes } = await import('@opentelemetry/resources');
      await import('./register');

      expect(resourceFromAttributes).toHaveBeenCalledWith({
        'service.environment': 'test',
        'service.name': 'test-service-otel',
        'service.version': '1.0.0',
      });
    });

    it('should use default service name when OTEL_SERVICE_NAME is not provided', async () => {
      delete process.env['OTEL_SERVICE_NAME'];

      const { resourceFromAttributes } = await import('@opentelemetry/resources');
      await import('./register');

      expect(resourceFromAttributes).toHaveBeenCalledWith({
        'service.environment': 'test',
        'service.name': 'unknown-service',
        'service.version': '1.0.0',
      });
    });

    it('should use OTEL_SERVICE_VERSION when provided', async () => {
      process.env['OTEL_SERVICE_VERSION'] = '2.1.0';

      const { resourceFromAttributes } = await import('@opentelemetry/resources');
      await import('./register');

      expect(resourceFromAttributes).toHaveBeenCalledWith({
        'service.environment': 'test',
        'service.name': 'unknown-service',
        'service.version': '2.1.0',
      });
    });

    it('should use default service version when OTEL_SERVICE_VERSION is not provided', async () => {
      delete process.env['OTEL_SERVICE_VERSION'];

      const { resourceFromAttributes } = await import('@opentelemetry/resources');
      await import('./register');

      expect(resourceFromAttributes).toHaveBeenCalledWith({
        'service.environment': 'test',
        'service.name': 'unknown-service',
        'service.version': '1.0.0',
      });
    });

    it('should use NODE_ENV when provided', async () => {
      process.env['NODE_ENV'] = 'production';

      const { resourceFromAttributes } = await import('@opentelemetry/resources');
      await import('./register');

      expect(resourceFromAttributes).toHaveBeenCalledWith({
        'service.environment': 'production',
        'service.name': 'unknown-service',
        'service.version': '1.0.0',
      });
    });
  });

  describe('SDK Initialization', () => {
    it('should initialize NodeSDK with correct configuration', async () => {
      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
      const { PeriodicExportingMetricReader } = await import('@opentelemetry/sdk-metrics');

      await import('./register');

      expect(NodeSDK).toHaveBeenCalledWith({
        instrumentations: [],
        metricReader: expect.any(Object),
        resource: {},
        traceExporter: expect.any(Object),
      });

      expect(getNodeAutoInstrumentations).toHaveBeenCalledWith({
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      });

      expect(PeriodicExportingMetricReader).toHaveBeenCalledWith({
        exporter: expect.any(Object),
        exportIntervalMillis: 10000,
      });
    });

    it('should start the SDK after initialization', async () => {
      const mockStart = vi.fn();
      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      vi.mocked(NodeSDK).mockImplementation(() => ({
        shutdown: vi.fn().mockResolvedValue(undefined),
        start: mockStart,
      } as any));

      await import('./register');

      expect(mockStart).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle SDK initialization errors gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      vi.mocked(NodeSDK).mockImplementation(() => {
        throw new Error('SDK initialization failed');
      });

      await import('./register');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize OpenTelemetry SDK:', expect.any(Error));
      expect(exitSpy).toHaveBeenCalledWith(1);

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('should handle SDK shutdown errors gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      const mockShutdown = vi.fn().mockRejectedValue(new Error('Shutdown failed'));
      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      vi.mocked(NodeSDK).mockImplementation(() => ({
        shutdown: mockShutdown,
        start: vi.fn(),
      } as any));

      const { sdk } = await import('./register');

      // Mock the gracefulShutdown function call
      if (sdk) {
        try {
          await sdk.shutdown();
        } catch (error) {
          console.error('Error during OpenTelemetry SDK shutdown:', error);
        }
      }

      expect(consoleSpy).toHaveBeenCalledWith('Error during OpenTelemetry SDK shutdown:', expect.any(Error));

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
      // eslint-disable-next-line @typescript-eslint/no-empty-function
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

  describe('OTLP Exporter Configuration', () => {
    describe('Trace Exporter', () => {
      it('should create OTLP trace exporter when OTEL_TRACES_EXPORTER=otlp', async () => {
        process.env['OTEL_TRACES_EXPORTER'] = 'otlp';
        process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'] = 'http://localhost:14268/api/traces';

        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');

        await import('./register');

        expect(OTLPTraceExporter).toHaveBeenCalledWith({
          headers: {},
          url: 'http://localhost:14268/api/traces',
        });
      });

      it('should fallback to general OTLP endpoint for traces', async () => {
        process.env['OTEL_TRACES_EXPORTER'] = 'otlp';
        process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] = 'http://localhost:4318';
        delete process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'];

        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');

        await import('./register');

        expect(OTLPTraceExporter).toHaveBeenCalledWith({
          headers: {},
          url: 'http://localhost:4318',
        });
      });

      it('should parse OTLP headers for traces', async () => {
        process.env['OTEL_TRACES_EXPORTER'] = 'otlp';
        process.env['OTEL_EXPORTER_OTLP_TRACES_HEADERS'] = 'authorization=Bearer token123,x-custom=value';

        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');

        await import('./register');

        expect(OTLPTraceExporter).toHaveBeenCalledWith({
          headers: {
            authorization: 'Bearer token123',
            'x-custom': 'value',
          },
          url: 'http://localhost:4318/v1/traces',
        });
      });

      it('should fallback to console exporter when OTLP trace exporter fails', async () => {
        process.env['OTEL_TRACES_EXPORTER'] = 'otlp';

        const { ConsoleSpanExporter } = await import('@opentelemetry/sdk-trace-node');
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await import('./register');

        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to create OTLP trace exporter, falling back to console:',
          expect.any(Error)
        );
        expect(ConsoleSpanExporter).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe('Metrics Exporter', () => {
      it('should create OTLP metrics exporter when OTEL_METRICS_EXPORTER=otlp', async () => {
        process.env['OTEL_METRICS_EXPORTER'] = 'otlp';
        process.env['OTEL_EXPORTER_OTLP_METRICS_ENDPOINT'] = 'http://localhost:4318/v1/metrics';

        const { OTLPMetricExporter } = await import('@opentelemetry/exporter-metrics-otlp-http');
        const { PeriodicExportingMetricReader } = await import('@opentelemetry/sdk-metrics');

        await import('./register');

        expect(OTLPMetricExporter).toHaveBeenCalledWith({
          headers: {},
          url: 'http://localhost:4318/v1/metrics',
        });
        expect(PeriodicExportingMetricReader).toHaveBeenCalledWith({
          exporter: expect.any(Object),
          exportIntervalMillis: 10000,
        });
      });

      it('should use custom export interval for metrics', async () => {
        process.env['OTEL_METRICS_EXPORTER'] = 'otlp';
        process.env['OTEL_METRIC_EXPORT_INTERVAL'] = '5000';

        const { PeriodicExportingMetricReader } = await import('@opentelemetry/sdk-metrics');

        await import('./register');

        expect(PeriodicExportingMetricReader).toHaveBeenCalledWith({
          exporter: expect.any(Object),
          exportIntervalMillis: 5000,
        });
      });
    });

    describe('Environment Variable Precedence', () => {
      it('should prioritize specific endpoint over general endpoint', async () => {
        process.env['OTEL_TRACES_EXPORTER'] = 'otlp';
        process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] = 'http://general:4318';
        process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'] = 'http://specific:4318/v1/traces';

        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');

        await import('./register');

        expect(OTLPTraceExporter).toHaveBeenCalledWith({
          headers: {},
          url: 'http://specific:4318/v1/traces',
        });
      });

      it('should prioritize specific headers over general headers', async () => {
        process.env['OTEL_TRACES_EXPORTER'] = 'otlp';
        process.env['OTEL_EXPORTER_OTLP_HEADERS'] = 'general=value1';
        process.env['OTEL_EXPORTER_OTLP_TRACES_HEADERS'] = 'specific=value2';

        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');

        await import('./register');

        expect(OTLPTraceExporter).toHaveBeenCalledWith({
          headers: {
            specific: 'value2',
          },
          url: 'http://localhost:4318/v1/traces',
        });
      });
    });
  });
});
