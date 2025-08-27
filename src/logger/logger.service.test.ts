import { Test, TestingModule } from '@nestjs/testing';
import { trace } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getServiceName, getServiceVersion } from '../register';
import { LoggerService } from './logger.service';

interface MockLoggerProvider {
  getLogger: ReturnType<typeof vi.fn>;
}

// Test types
interface MockOtelLogger {
  emit: ReturnType<typeof vi.fn>;
}

// Mock OpenTelemetry APIs
vi.mock('@opentelemetry/api', () => ({
  trace: {
    getActiveSpan: vi.fn(),
  },
}));

vi.mock('@opentelemetry/api-logs', () => ({
  logs: {
    getLoggerProvider: vi.fn(),
  },
}));

describe('LoggerService', () => {
  let service: LoggerService;
  let module: TestingModule;
  let mockOtelLogger: MockOtelLogger;
  let mockLoggerProvider: MockLoggerProvider;

  // Helper function to get typed mock emit
  const getMockEmit = (): ReturnType<typeof vi.fn> => mockOtelLogger.emit;

  // Helper functions to avoid unbound method warnings
  const getMockedGetLoggerProvider = (): ReturnType<typeof vi.mocked<typeof logs.getLoggerProvider>> =>
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(logs.getLoggerProvider);
  const getMockedGetActiveSpan = (): ReturnType<typeof vi.mocked<typeof trace.getActiveSpan>> =>
    vi.mocked(trace.getActiveSpan);

  beforeEach(async () => {
    // Mock OpenTelemetry logger
    mockOtelLogger = {
      emit: vi.fn(),
    };

    mockLoggerProvider = {
      getLogger: vi.fn().mockReturnValue(mockOtelLogger),
    };

    getMockedGetLoggerProvider().mockReturnValue(
      mockLoggerProvider as unknown as ReturnType<typeof logs.getLoggerProvider>
    );
    getMockedGetActiveSpan().mockReturnValue(undefined);

    module = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
  });

  afterEach(async () => {
    await module.close();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with OpenTelemetry global logger provider', () => {
      expect(getMockedGetLoggerProvider()).toHaveBeenCalled();
      expect(mockLoggerProvider.getLogger).toHaveBeenCalledWith(getServiceName(), getServiceVersion());
    });
  });

  describe('Basic Logging Methods', () => {
    it('should emit log messages with correct severity levels', () => {
      service.log('Info message');
      service.error('Error message');
      service.warn('Warning message');
      service.debug('Debug message');

      expect(getMockEmit()).toHaveBeenCalledTimes(4);

      // Check severity levels
      expect(getMockEmit()).toHaveBeenNthCalledWith(1, {
        attributes: {},
        body: 'Info message',
        severityText: 'INFO',
      });

      expect(getMockEmit()).toHaveBeenNthCalledWith(2, {
        attributes: {},
        body: 'Error message',
        severityText: 'ERROR',
      });

      expect(getMockEmit()).toHaveBeenNthCalledWith(3, {
        attributes: {},
        body: 'Warning message',
        severityText: 'WARN',
      });

      expect(getMockEmit()).toHaveBeenNthCalledWith(4, {
        attributes: {},
        body: 'Debug message',
        severityText: 'DEBUG',
      });
    });

    it('should handle Error objects correctly', () => {
      const error = new Error('Test error message');
      service.error(error);

      expect(getMockEmit()).toHaveBeenCalledWith({
        attributes: {},
        body: 'Test error message',
        exception: error,
        severityText: 'ERROR',
      });
    });

    it('should include additional data in attributes', () => {
      const data = { requestId: 'req-456', userId: '123' };
      service.log('Message with data', data);

      expect(getMockEmit()).toHaveBeenCalledWith({
        attributes: data,
        body: 'Message with data',
        severityText: 'INFO',
      });
    });
  });

  describe('Context Management', () => {
    it('should set and persist context across log calls', () => {
      service.setContext({ sessionId: 'session-123', userId: 'user-456' });

      service.log('First message');
      service.warn('Second message');

      expect(getMockEmit()).toHaveBeenCalledTimes(2);

      // Both calls should include the persistent context
      expect(getMockEmit()).toHaveBeenNthCalledWith(1, {
        attributes: {
          sessionId: 'session-123',
          userId: 'user-456',
        },
        body: 'First message',
        severityText: 'INFO',
      });

      expect(getMockEmit()).toHaveBeenNthCalledWith(2, {
        attributes: {
          sessionId: 'session-123',
          userId: 'user-456',
        },
        body: 'Second message',
        severityText: 'WARN',
      });
    });

    it('should add individual context keys', () => {
      service.addContext('operationId', 'op-789');
      service.addContext('tenantId', 'tenant-abc');

      service.log('Message with added context');

      expect(getMockEmit()).toHaveBeenCalledWith({
        attributes: {
          operationId: 'op-789',
          tenantId: 'tenant-abc',
        },
        body: 'Message with added context',
        severityText: 'INFO',
      });
    });

    it('should clear all context', () => {
      service.setContext({ sessionId: 'session-123', userId: 'user-456' });
      service.clearContext();

      service.log('Message after clear');

      expect(getMockEmit()).toHaveBeenCalledWith({
        attributes: {},
        body: 'Message after clear',
        severityText: 'INFO',
      });
    });

    it('should merge context with additional data', () => {
      service.setContext({ sessionId: 'session-123' });

      const additionalData = { requestId: 'req-456', userId: 'user-789' };
      service.log('Message with merged data', additionalData);

      expect(getMockEmit()).toHaveBeenCalledWith({
        attributes: {
          requestId: 'req-456',
          sessionId: 'session-123',
          userId: 'user-789',
        },
        body: 'Message with merged data',
        severityText: 'INFO',
      });
    });
  });

  describe('OpenTelemetry Trace Context Integration', () => {
    it('should include trace context when active span is available', () => {
      const mockSpan = {
        spanContext: () => ({
          spanId: 'span-456',
          traceFlags: 1,
          traceId: 'trace-123',
        }),
      };

      getMockedGetActiveSpan().mockReturnValue(mockSpan as unknown as ReturnType<typeof trace.getActiveSpan>);

      service.log('Message with trace context');

      expect(getMockEmit()).toHaveBeenCalledWith({
        attributes: {
          spanId: 'span-456',
          traceFlags: 1,
          traceId: 'trace-123',
        },
        body: 'Message with trace context',
        severityText: 'INFO',
      });
    });

    it('should handle missing active span gracefully', () => {
      vi.mocked(trace.getActiveSpan).mockReturnValue(undefined);

      service.log('Message without trace');

      expect(getMockEmit()).toHaveBeenCalledWith({
        attributes: {},
        body: 'Message without trace',
        severityText: 'INFO',
      });
    });

    it('should handle trace context extraction errors gracefully', () => {
      vi.mocked(trace.getActiveSpan).mockImplementation(() => {
        throw new Error('Trace error');
      });

      expect(() => {
        service.log('Message with broken trace');
      }).not.toThrow();

      expect(getMockEmit()).toHaveBeenCalledWith({
        attributes: {},
        body: 'Message with broken trace',
        severityText: 'INFO',
      });
    });

    it('should merge trace context with persistent context and additional data', () => {
      const mockSpan = {
        spanContext: () => ({
          spanId: 'span-456',
          traceFlags: 1,
          traceId: 'trace-123',
        }),
      };

      getMockedGetActiveSpan().mockReturnValue(mockSpan as unknown as ReturnType<typeof trace.getActiveSpan>);

      service.setContext({ sessionId: 'session-789' });
      service.log('Complete context message', { requestId: 'req-abc' });

      expect(getMockEmit()).toHaveBeenCalledWith({
        attributes: {
          requestId: 'req-abc',
          sessionId: 'session-789',
          spanId: 'span-456',
          traceFlags: 1,
          traceId: 'trace-123',
        },
        body: 'Complete context message',
        severityText: 'INFO',
      });
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with inherited context', () => {
      service.setContext({ parentContext: 'parent-value', sessionId: 'session-123' });

      const childLogger = service.createChildLogger();
      childLogger.log('Child message');

      expect(getMockEmit()).toHaveBeenCalledWith({
        attributes: {
          parentContext: 'parent-value',
          sessionId: 'session-123',
        },
        body: 'Child message',
        severityText: 'INFO',
      });
    });

    it('should isolate child logger context from parent', () => {
      service.setContext({ parentContext: 'parent-value' });

      const childLogger = service.createChildLogger();
      childLogger.addContext('childContext', 'child-value');

      // Parent should not have child context
      service.log('Parent message');
      expect(getMockEmit()).toHaveBeenLastCalledWith({
        attributes: {
          parentContext: 'parent-value',
        },
        body: 'Parent message',
        severityText: 'INFO',
      });

      // Child should have both contexts
      childLogger.log('Child message');
      expect(getMockEmit()).toHaveBeenLastCalledWith({
        attributes: {
          childContext: 'child-value',
          parentContext: 'parent-value',
        },
        body: 'Child message',
        severityText: 'INFO',
      });
    });
  });

  describe('Error Handling', () => {
    it('should fallback to console logging when OpenTelemetry fails', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        // Mock implementation
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Mock implementation
      });

      getMockEmit().mockImplementation(() => {
        throw new Error('OpenTelemetry failure');
      });

      service.log('Failed message', { data: 'test' });

      expect(consoleErrorSpy).toHaveBeenCalledWith('LoggerService emit failed:', expect.any(Error));
      expect(consoleSpy).toHaveBeenCalledWith('[%s] %s', 'INFO', 'Failed message', { data: 'test' });

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle Error object fallback correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        // Mock implementation
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Mock implementation
      });

      getMockEmit().mockImplementation(() => {
        throw new Error('OpenTelemetry failure');
      });

      const error = new Error('Test error');
      service.error(error, { context: 'test' });

      expect(consoleErrorSpy).toHaveBeenCalledWith('LoggerService emit failed:', expect.any(Error));
      expect(consoleSpy).toHaveBeenCalledWith('[%s] %s', 'ERROR', 'Test error', { context: 'test' });

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Singleton Behavior', () => {
    it('should maintain context across multiple service instances from DI', () => {
      const service1 = module.get<LoggerService>(LoggerService);
      const service2 = module.get<LoggerService>(LoggerService);

      // Should be the same instance (singleton)
      expect(service1).toBe(service2);

      service1.setContext({ sharedContext: 'shared-value' });
      service2.log('Message from service2');

      expect(getMockEmit()).toHaveBeenCalledWith({
        attributes: {
          sharedContext: 'shared-value',
        },
        body: 'Message from service2',
        severityText: 'INFO',
      });
    });
  });
});
