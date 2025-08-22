import { Test, TestingModule } from '@nestjs/testing';
import { trace } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoggerService } from './logger.service';

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
  let mockOtelLogger: any;
  let mockLoggerProvider: any;

  beforeEach(async () => {
    // Mock OpenTelemetry logger
    mockOtelLogger = {
      emit: vi.fn(),
    };

    mockLoggerProvider = {
      getLogger: vi.fn().mockReturnValue(mockOtelLogger),
    };

    vi.mocked(logs.getLoggerProvider).mockReturnValue(mockLoggerProvider);
    vi.mocked(trace.getActiveSpan).mockReturnValue(undefined);

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
      expect(logs.getLoggerProvider).toHaveBeenCalled();
      expect(mockLoggerProvider.getLogger).toHaveBeenCalledWith('nestjs-app', '1.0.0');
    });
  });

  describe('Basic Logging Methods', () => {
    it('should emit log messages with correct severity levels', () => {
      service.log('Info message');
      service.error('Error message');
      service.warn('Warning message');
      service.debug('Debug message');

      expect(mockOtelLogger.emit).toHaveBeenCalledTimes(4);

      // Check severity levels
      expect(mockOtelLogger.emit).toHaveBeenNthCalledWith(1, {
        severityText: 'INFO',
        body: 'Info message',
        attributes: {},
      });

      expect(mockOtelLogger.emit).toHaveBeenNthCalledWith(2, {
        severityText: 'ERROR',
        body: 'Error message',
        attributes: {},
      });

      expect(mockOtelLogger.emit).toHaveBeenNthCalledWith(3, {
        severityText: 'WARN',
        body: 'Warning message',
        attributes: {},
      });

      expect(mockOtelLogger.emit).toHaveBeenNthCalledWith(4, {
        severityText: 'DEBUG',
        body: 'Debug message',
        attributes: {},
      });
    });

    it('should handle Error objects correctly', () => {
      const error = new Error('Test error message');
      service.error(error);

      expect(mockOtelLogger.emit).toHaveBeenCalledWith({
        severityText: 'ERROR',
        body: 'Test error message',
        attributes: {},
        exception: error,
      });
    });

    it('should include additional data in attributes', () => {
      const data = { userId: '123', requestId: 'req-456' };
      service.log('Message with data', data);

      expect(mockOtelLogger.emit).toHaveBeenCalledWith({
        severityText: 'INFO',
        body: 'Message with data',
        attributes: data,
      });
    });
  });

  describe('Context Management', () => {
    it('should set and persist context across log calls', () => {
      service.setContext({ sessionId: 'session-123', userId: 'user-456' });

      service.log('First message');
      service.warn('Second message');

      expect(mockOtelLogger.emit).toHaveBeenCalledTimes(2);

      // Both calls should include the persistent context
      expect(mockOtelLogger.emit).toHaveBeenNthCalledWith(1, {
        severityText: 'INFO',
        body: 'First message',
        attributes: {
          sessionId: 'session-123',
          userId: 'user-456',
        },
      });

      expect(mockOtelLogger.emit).toHaveBeenNthCalledWith(2, {
        severityText: 'WARN',
        body: 'Second message',
        attributes: {
          sessionId: 'session-123',
          userId: 'user-456',
        },
      });
    });

    it('should add individual context keys', () => {
      service.addContext('operationId', 'op-789');
      service.addContext('tenantId', 'tenant-abc');

      service.log('Message with added context');

      expect(mockOtelLogger.emit).toHaveBeenCalledWith({
        severityText: 'INFO',
        body: 'Message with added context',
        attributes: {
          operationId: 'op-789',
          tenantId: 'tenant-abc',
        },
      });
    });

    it('should clear all context', () => {
      service.setContext({ sessionId: 'session-123', userId: 'user-456' });
      service.clearContext();

      service.log('Message after clear');

      expect(mockOtelLogger.emit).toHaveBeenCalledWith({
        severityText: 'INFO',
        body: 'Message after clear',
        attributes: {},
      });
    });

    it('should merge context with additional data', () => {
      service.setContext({ sessionId: 'session-123' });
      
      const additionalData = { requestId: 'req-456', userId: 'user-789' };
      service.log('Message with merged data', additionalData);

      expect(mockOtelLogger.emit).toHaveBeenCalledWith({
        severityText: 'INFO',
        body: 'Message with merged data',
        attributes: {
          sessionId: 'session-123',
          requestId: 'req-456',
          userId: 'user-789',
        },
      });
    });
  });

  describe('OpenTelemetry Trace Context Integration', () => {
    it('should include trace context when active span is available', () => {
      const mockSpan = {
        spanContext: () => ({
          traceId: 'trace-123',
          spanId: 'span-456',
          traceFlags: 1,
        }),
      };

      vi.mocked(trace.getActiveSpan).mockReturnValue(mockSpan as any);

      service.log('Message with trace context');

      expect(mockOtelLogger.emit).toHaveBeenCalledWith({
        severityText: 'INFO',
        body: 'Message with trace context',
        attributes: {
          traceId: 'trace-123',
          spanId: 'span-456',
          traceFlags: 1,
        },
      });
    });

    it('should handle missing active span gracefully', () => {
      vi.mocked(trace.getActiveSpan).mockReturnValue(undefined);

      service.log('Message without trace');

      expect(mockOtelLogger.emit).toHaveBeenCalledWith({
        severityText: 'INFO',
        body: 'Message without trace',
        attributes: {},
      });
    });

    it('should handle trace context extraction errors gracefully', () => {
      vi.mocked(trace.getActiveSpan).mockImplementation(() => {
        throw new Error('Trace error');
      });

      expect(() => {
        service.log('Message with broken trace');
      }).not.toThrow();

      expect(mockOtelLogger.emit).toHaveBeenCalledWith({
        severityText: 'INFO',
        body: 'Message with broken trace',
        attributes: {},
      });
    });

    it('should merge trace context with persistent context and additional data', () => {
      const mockSpan = {
        spanContext: () => ({
          traceId: 'trace-123',
          spanId: 'span-456',
          traceFlags: 1,
        }),
      };

      vi.mocked(trace.getActiveSpan).mockReturnValue(mockSpan as any);

      service.setContext({ sessionId: 'session-789' });
      service.log('Complete context message', { requestId: 'req-abc' });

      expect(mockOtelLogger.emit).toHaveBeenCalledWith({
        severityText: 'INFO',
        body: 'Complete context message',
        attributes: {
          requestId: 'req-abc',
          sessionId: 'session-789',
          traceId: 'trace-123',
          spanId: 'span-456',
          traceFlags: 1,
        },
      });
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with inherited context', () => {
      service.setContext({ parentContext: 'parent-value', sessionId: 'session-123' });

      const childLogger = service.createChildLogger();
      childLogger.log('Child message');

      expect(mockOtelLogger.emit).toHaveBeenCalledWith({
        severityText: 'INFO',
        body: 'Child message',
        attributes: {
          parentContext: 'parent-value',
          sessionId: 'session-123',
        },
      });
    });

    it('should isolate child logger context from parent', () => {
      service.setContext({ parentContext: 'parent-value' });

      const childLogger = service.createChildLogger();
      childLogger.addContext('childContext', 'child-value');

      // Parent should not have child context
      service.log('Parent message');
      expect(mockOtelLogger.emit).toHaveBeenLastCalledWith({
        severityText: 'INFO',
        body: 'Parent message',
        attributes: {
          parentContext: 'parent-value',
        },
      });

      // Child should have both contexts
      childLogger.log('Child message');
      expect(mockOtelLogger.emit).toHaveBeenLastCalledWith({
        severityText: 'INFO',
        body: 'Child message',
        attributes: {
          parentContext: 'parent-value',
          childContext: 'child-value',
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should fallback to console logging when OpenTelemetry fails', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockOtelLogger.emit.mockImplementation(() => {
        throw new Error('OpenTelemetry failure');
      });

      service.log('Failed message', { data: 'test' });

      expect(consoleErrorSpy).toHaveBeenCalledWith('LoggerService emit failed:', expect.any(Error));
      expect(consoleSpy).toHaveBeenCalledWith('[INFO] Failed message', { data: 'test' });

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle Error object fallback correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockOtelLogger.emit.mockImplementation(() => {
        throw new Error('OpenTelemetry failure');
      });

      const error = new Error('Test error');
      service.error(error, { context: 'test' });

      expect(consoleErrorSpy).toHaveBeenCalledWith('LoggerService emit failed:', expect.any(Error));
      expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Test error', { context: 'test' });

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Singleton Behavior', () => {
    it('should maintain context across multiple service instances from DI', async () => {
      const service1 = module.get<LoggerService>(LoggerService);
      const service2 = module.get<LoggerService>(LoggerService);

      // Should be the same instance (singleton)
      expect(service1).toBe(service2);

      service1.setContext({ sharedContext: 'shared-value' });
      service2.log('Message from service2');

      expect(mockOtelLogger.emit).toHaveBeenCalledWith({
        severityText: 'INFO',
        body: 'Message from service2',
        attributes: {
          sharedContext: 'shared-value',
        },
      });
    });
  });
});