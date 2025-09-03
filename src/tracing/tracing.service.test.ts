import { Test, TestingModule } from '@nestjs/testing';
import { trace } from '@opentelemetry/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getServiceName, getServiceVersion } from '../register';
import { TracingService } from './tracing.service';

// Test types
interface MockSpan {
  addEvent: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  recordException: ReturnType<typeof vi.fn>;
  setAttribute: ReturnType<typeof vi.fn>;
  setAttributes: ReturnType<typeof vi.fn>;
  setStatus: ReturnType<typeof vi.fn>;
  spanContext: ReturnType<typeof vi.fn>;
}

interface MockTracer {
  startActiveSpan: ReturnType<typeof vi.fn>;
  startSpan: ReturnType<typeof vi.fn>;
}

interface MockTracerProvider {
  getTracer: ReturnType<typeof vi.fn>;
}

type SpanCallback<T = unknown> = (span: MockSpan) => T;

// Mock OpenTelemetry API
vi.mock('@opentelemetry/api', () => ({
  trace: {
    getActiveSpan: vi.fn(),
    getTracerProvider: vi.fn(),
  },
}));

describe('TracingService', () => {
  // Helper functions to get mocked versions
  // Store trace functions to avoid unbound method warnings
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { getActiveSpan, getTracerProvider } = trace;
  const getMockedGetTracerProvider = (): ReturnType<typeof vi.mocked<typeof trace.getTracerProvider>> =>
    vi.mocked(getTracerProvider);
  const getMockedGetActiveSpan = (): ReturnType<typeof vi.mocked<typeof trace.getActiveSpan>> =>
    vi.mocked(getActiveSpan);
  let service: TracingService;
  let module: TestingModule;
  let mockTracer: MockTracer;
  let mockTracerProvider: MockTracerProvider;
  let mockSpan: MockSpan;

  beforeEach(async () => {
    // Mock OpenTelemetry span
    mockSpan = {
      addEvent: vi.fn(),
      end: vi.fn(),
      recordException: vi.fn(),
      setAttribute: vi.fn(),
      setAttributes: vi.fn(),
      setStatus: vi.fn(),
      spanContext: vi.fn().mockReturnValue({
        spanId: 'span-456',
        traceId: 'trace-123',
      }),
    };

    // Mock OpenTelemetry tracer
    mockTracer = {
      startActiveSpan: vi.fn(),
      startSpan: vi.fn().mockReturnValue(mockSpan),
    };

    // Mock OpenTelemetry tracer provider
    mockTracerProvider = {
      getTracer: vi.fn().mockReturnValue(mockTracer),
    };

    getMockedGetTracerProvider().mockReturnValue(
      mockTracerProvider as unknown as ReturnType<typeof trace.getTracerProvider>
    );
    getMockedGetActiveSpan().mockReturnValue(mockSpan as unknown as ReturnType<typeof trace.getActiveSpan>);

    module = await Test.createTestingModule({
      providers: [TracingService],
    }).compile();

    service = module.get<TracingService>(TracingService);
  });

  afterEach(async () => {
    await module.close();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with OpenTelemetry global tracer provider', () => {
      expect(getMockedGetTracerProvider()).toHaveBeenCalled();
      expect(mockTracerProvider.getTracer).toHaveBeenCalledWith(getServiceName(), getServiceVersion());
    });

    it('should provide access to the tracer instance', () => {
      const tracer = service.getTracer();
      expect(tracer).toBe(mockTracer);
    });
  });

  describe('Active Span Management', () => {
    it('should get the currently active span', () => {
      const span = service.getActiveSpan();
      expect(trace.getActiveSpan).toHaveBeenCalled();
      expect(span).toBe(mockSpan);
    });

    it('should get trace ID from active span', () => {
      const traceId = service.getTraceId();
      expect(traceId).toBe('trace-123');
    });

    it('should get span ID from active span', () => {
      const spanId = service.getSpanId();
      expect(spanId).toBe('span-456');
    });

    it('should return undefined when no active span', () => {
      getMockedGetActiveSpan().mockReturnValue(undefined);

      const traceId = service.getTraceId();
      const spanId = service.getSpanId();

      expect(traceId).toBeUndefined();
      expect(spanId).toBeUndefined();
    });
  });

  describe('Manual Span Creation', () => {
    it('should start a span with correct attributes', () => {
      const span = service.startSpan('test-span');

      expect(mockTracer.startSpan).toHaveBeenCalledWith('test-span');
      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'instrumentation.type': 'manual',
        'service.environment': 'local',
        'service.name': 'test-service',
        'service.version': '1.0.0-test',
      });
      expect(span).toBe(mockSpan);
    });

    it('should create span with function execution (sync)', () => {
      const mockFn = vi.fn().mockReturnValue('result');

      mockTracer.startActiveSpan.mockImplementation((_name: string, fn: SpanCallback) => {
        return fn(mockSpan);
      });

      const result = service.createSpan('test-span', mockFn) as string;

      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith('test-span', expect.any(Function));
      expect(mockFn).toHaveBeenCalledWith(mockSpan);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 1 }); // OK
      expect(mockSpan.end).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should handle errors in span execution', () => {
      const error = new Error('Test error');
      const mockFn = vi.fn().mockImplementation(() => {
        throw error;
      });

      mockTracer.startActiveSpan.mockImplementation((_name: string, fn: SpanCallback) => {
        return fn(mockSpan);
      });

      expect(() => service.createSpan('test-span', mockFn) as unknown).toThrow('Test error');

      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 2, message: 'Test error' }); // ERROR
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle async function execution', async () => {
      const mockFn = vi.fn().mockResolvedValue('async-result');

      mockTracer.startActiveSpan.mockImplementation((_name: string, fn: SpanCallback) => {
        return fn(mockSpan);
      });

      const result = (await service.createSpan('test-span', mockFn)) as string;

      expect(result).toBe('async-result');
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 1 }); // OK
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('Span Attribute Management', () => {
    it('should set single attribute on active span', () => {
      service.setSpanAttribute('test.key', 'test-value');

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('test.key', 'test-value');
    });

    it('should set multiple attributes on active span', () => {
      const attributes = {
        key1: 'value1',
        key2: 42,
        key3: true,
      };

      service.setSpanAttributes(attributes);

      expect(mockSpan.setAttributes).toHaveBeenCalledWith(attributes);
    });

    it('should handle missing active span gracefully', () => {
      getMockedGetActiveSpan().mockReturnValue(undefined);

      // These should not throw and should handle missing span gracefully
      expect(() => {
        service.setSpanAttribute('test.key', 'test-value');
        service.setSpanAttributes({ key: 'value' });
      }).not.toThrow();

      // The methods should handle missing spans silently (no logging in this implementation)
      expect(service).toBeDefined();
    });
  });

  describe('Span Events and Status', () => {
    it('should add event to active span', () => {
      const attributes = { key: 'value' };
      service.addSpanEvent('test-event', attributes);

      expect(mockSpan.addEvent).toHaveBeenCalledWith('test-event', attributes);
    });

    it('should add event without attributes', () => {
      service.addSpanEvent('test-event');

      expect(mockSpan.addEvent).toHaveBeenCalledWith('test-event', undefined);
    });

    it('should record exception on active span', () => {
      const error = new Error('Test exception');
      service.recordException(error);

      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 2, message: 'Test exception' });
    });

    it('should set span status', () => {
      service.setSpanStatus('OK');
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 1, message: undefined });

      service.setSpanStatus('ERROR', 'Something went wrong');
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 2, message: 'Something went wrong' });
    });

    it('should end active span', () => {
      service.endActiveSpan();
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('WithSpan Helper', () => {
    it('should execute function with span context', () => {
      const mockFn = vi.fn().mockReturnValue('result');
      const attributes = { custom: 'attribute' };

      mockTracer.startActiveSpan.mockImplementation((_name: string, fn: SpanCallback) => {
        return fn(mockSpan);
      });

      const result = service.withSpan('test-span', attributes, mockFn) as string;

      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith('test-span', expect.any(Function));
      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        custom: 'attribute',
        'instrumentation.type': 'manual',
        'service.environment': 'local',
        'service.name': 'test-service',
        'service.version': '1.0.0-test',
      });
      expect(mockFn).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should handle async execution in withSpan', async () => {
      const mockFn = vi.fn().mockResolvedValue('async-result');

      mockTracer.startActiveSpan.mockImplementation((_name: string, fn: SpanCallback) => {
        return fn(mockSpan);
      });

      const result = (await service.withSpan('test-span', {}, mockFn)) as string;

      expect(result).toBe('async-result');
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 1 }); // OK
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('Environment Integration', () => {
    it('should use service name from environment variables', () => {
      const originalServiceName = process.env['OTEL_SERVICE_NAME'];
      process.env['OTEL_SERVICE_NAME'] = 'test-service-env';

      // Create new service instance to test environment variable usage
      const testService = new TracingService();
      testService.startSpan('test');

      expect(mockSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'service.name': 'test-service-env',
        })
      );

      // Restore original value
      if (originalServiceName) {
        process.env['OTEL_SERVICE_NAME'] = originalServiceName;
      } else {
        delete process.env['OTEL_SERVICE_NAME'];
      }
    });

    it('should fall back to default service name', () => {
      const originalServiceName = process.env['OTEL_SERVICE_NAME'];
      delete process.env['OTEL_SERVICE_NAME'];

      // Create new service instance to test fallback
      const testService = new TracingService();
      testService.startSpan('test');

      expect(mockSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'service.name': getServiceName(),
        })
      );

      // Restore original value if it existed
      if (originalServiceName) {
        process.env['OTEL_SERVICE_NAME'] = originalServiceName;
      }
    });
  });

  describe('Tracing Status', () => {
    it('should check if tracing is enabled', () => {
      const isEnabled = service.isTracingEnabled();
      expect(isEnabled).toBe(true);
    });

    it('should handle tracer provider errors gracefully', () => {
      getMockedGetTracerProvider().mockImplementation(() => {
        throw new Error('Provider error');
      });

      const isEnabled = service.isTracingEnabled();
      expect(isEnabled).toBe(false);
    });
  });

  describe('Global Tracer Integration', () => {
    it('should use global tracer provider without configuration', () => {
      expect(getMockedGetTracerProvider()).toHaveBeenCalled();
      expect(mockTracerProvider.getTracer).toHaveBeenCalledWith(getServiceName(), getServiceVersion());
    });

    it('should work without dependencies on ObservabilityConfig', () => {
      // Service should initialize and work without any configuration
      expect(service).toBeDefined();
      expect(service.getTracer()).toBe(mockTracer);

      // Should be able to create spans
      service.startSpan('test-no-config');
      expect(mockTracer.startSpan).toHaveBeenCalledWith('test-no-config');
    });
  });
});
