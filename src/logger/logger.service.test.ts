/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { ConsoleLogger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { trace } from '@opentelemetry/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ObservabilityConfig } from '../config/observability.config';
import { LoggerService } from './logger.service';

// Mock OpenTelemetry

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getActiveSpan: vi.fn(),
  },
}));

describe('LoggerService', () => {
  let service: LoggerService;
  let module: TestingModule;

  // Spies for capturing the actual log output
  let logSpy: ReturnType<typeof vi.spyOn>;

  const createConfig = (overrides: Partial<ObservabilityConfig> = {}): ObservabilityConfig => ({
    environment: 'test',
    logging: {
      consoleOutput: true,
      level: 'debug',
      otlpExport: {
        enabled: false,
        endpoint: 'http://localhost:4318/v1/logs',
      },
    },
    metrics: {
      defaultLabels: {},
      defaultMetrics: true,
      enabled: true,
      endpoint: '/metrics',
    },
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    tracing: {
      autoInstrumentation: {
        captureArguments: true,
        enabled: true,
      },
      enabled: true,
      exporter: {
        endpoint: 'http://localhost:4318/v1/traces',
        type: 'otlp',
      },
      instrumentations: {
        autoInstrumentations: true,
        disabled: [],
        overrides: {},
      },
      sampler: {
        ratio: 1.0,
        type: 'always_on',
      },
    },
    ...overrides,
  });

  const setupModule = async (config: ObservabilityConfig = createConfig()): Promise<TestingModule> => {
    return await Test.createTestingModule({
      providers: [
        {
          provide: 'OBSERVABILITY_CONFIG',
          useValue: config,
        },
        {
          inject: ['OBSERVABILITY_CONFIG'],
          provide: LoggerService,
          useFactory: (config: ObservabilityConfig) => new LoggerService(config),
        },
      ],
    }).compile();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(trace.getActiveSpan).mockReturnValue(undefined);
  });

  afterEach(async () => {
    await module.close();
    vi.restoreAllMocks();
  });

  describe('Structured Logging (Production)', () => {
    beforeEach(async () => {
      const config = createConfig({
        environment: 'production',
      });
      module = await setupModule(config);
      service = module.get<LoggerService>(LoggerService);

      // In production mode, we output directly to console.log, so spy on that instead
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    it('should call parent logger with structured JSON format', () => {
      service.log('Test message', 'TestContext');

      expect(logSpy).toHaveBeenCalledTimes(1);
      const [loggedMessage] = logSpy.mock.calls[0] as [string];

      // Should be valid JSON
      expect(() => JSON.parse(loggedMessage)).not.toThrow();

      const parsed = JSON.parse(loggedMessage);
      expect(parsed).toMatchObject({
        context: 'TestContext',
        environment: 'production',
        level: 'log',
        message: 'Test message',
        pid: expect.any(Number),
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      });
    });

    it('should include trace context when span is available', () => {
      // Mock the trace.getActiveSpan to return a fake span
      const mockSpan = {
        spanContext: () => ({
          spanId: 'abc123',
          traceId: 'def456',
        }),
      };
      vi.mocked(trace.getActiveSpan).mockReturnValue(mockSpan as any);

      service.log('Test message with trace');

      expect(logSpy).toHaveBeenCalledTimes(1);
      const [loggedMessage] = logSpy.mock.calls[0] as [string];
      const parsed = JSON.parse(loggedMessage);

      expect(parsed).toMatchObject({
        level: 'log',
        message: 'Test message with trace',
        spanId: 'abc123',
        traceId: 'def456',
      });
    });

    it('should properly format Error objects with stack traces', () => {
      const error = new Error('Test error message');

      service.error(error, 'ErrorContext');

      expect(logSpy).toHaveBeenCalledTimes(1);
      const [loggedMessage] = logSpy.mock.calls[0] as [string];
      const parsed = JSON.parse(loggedMessage);

      expect(parsed).toMatchObject({
        context: 'ErrorContext',
        environment: 'production',
        level: 'error',
        message: 'Test error message',
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
      });
    });

    it('should merge persistent context with log entries', () => {
      service.addContext({ sessionId: 'session-456', userId: '123' });
      service.log('Test message with context');

      const [loggedMessage] = logSpy.mock.calls[0] as [string];
      const parsed = JSON.parse(loggedMessage);

      expect(parsed).toMatchObject({
        environment: 'production',
        level: 'log',
        message: 'Test message with context',
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        sessionId: 'session-456',
        userId: '123',
      });
    });

    it('should handle object messages and merge additional context', () => {
      const messageObj = {
        data: { key: 'value' },
        message: 'Object message',
        requestId: 'req-123',
      };

      service.log(messageObj, 'ObjectContext');

      const [loggedMessage] = logSpy.mock.calls[0] as [string];
      const parsed = JSON.parse(loggedMessage);

      expect(parsed).toMatchObject({
        context: 'ObjectContext',
        data: { key: 'value' },
        environment: 'production',
        level: 'log',
        message: 'Object message',
        requestId: 'req-123',
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
      });
    });

    it('should handle different log levels correctly', () => {
      service.warn('Warning message');
      service.error('Error message');
      service.debug('Debug message');

      expect(logSpy).toHaveBeenCalledTimes(3);

      // Check warn
      const [warnMessage] = logSpy.mock.calls[0] as [string];
      const warnParsed = JSON.parse(warnMessage);
      expect(warnParsed.level).toBe('warn');
      expect(warnParsed.message).toBe('Warning message');

      // Check error
      const [errorMessage] = logSpy.mock.calls[1] as [string];
      const errorParsed = JSON.parse(errorMessage);
      expect(errorParsed.level).toBe('error');
      expect(errorParsed.message).toBe('Error message');

      // Check debug
      const [debugMessage] = logSpy.mock.calls[2] as [string];
      const debugParsed = JSON.parse(debugMessage);
      expect(debugParsed.level).toBe('debug');
      expect(debugParsed.message).toBe('Debug message');
    });
  });

  describe('Context Management Behavior Verification', () => {
    beforeEach(async () => {
      const config = createConfig({ environment: 'production' });
      module = await setupModule(config);
      service = module.get<LoggerService>(LoggerService);

      // Use console.log spy for production mode
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    it('should persist context across multiple log calls', () => {
      service.addContext({ requestId: 'req-123', userId: 'user-456' });

      service.log('First message');
      service.warn('Second message');
      service.error('Third message');

      expect(logSpy).toHaveBeenCalledTimes(3);

      // Verify all three logs contain the persistent context
      const logs = [
        JSON.parse(logSpy.mock.calls[0][0] as string),
        JSON.parse(logSpy.mock.calls[1][0] as string),
        JSON.parse(logSpy.mock.calls[2][0] as string),
      ];

      logs.forEach((log) => {
        expect(log).toMatchObject({
          requestId: 'req-123',
          userId: 'user-456',
        });
      });
    });

    it('should update context when addContext is called multiple times', () => {
      service.addContext({ sessionId: 'session-456', userId: 'user-123' });
      service.addContext({ userId: 'user-789' }); // Override userId

      service.log('Context test message');

      const [loggedMessage] = logSpy.mock.calls[0] as [string];
      const parsed = JSON.parse(loggedMessage);

      expect(parsed).toMatchObject({
        environment: 'production',
        level: 'log',
        message: 'Context test message',
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        sessionId: 'session-456',
        userId: 'user-789', // Should be overridden value
      });
    });

    it('should clear all context when clearContext is called', () => {
      service.addContext({ sessionId: 'session-456', userId: 'user-123' });
      service.clearContext();
      service.log('Message after clear');

      const [loggedMessage] = logSpy.mock.calls[0] as [string];
      const parsed = JSON.parse(loggedMessage);

      expect(parsed).not.toHaveProperty('sessionId');
      expect(parsed).not.toHaveProperty('userId');
      expect(parsed.message).toBe('Message after clear');
    });
  });

  describe('Child Logger Behavior Verification', () => {
    beforeEach(async () => {
      const config = createConfig({ environment: 'production' });
      module = await setupModule(config);
      service = module.get<LoggerService>(LoggerService);

      // Use console.log spy for production mode
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    it('should create child logger with isolated context', () => {
      service.addContext({ parentContext: 'parent-value' });

      const childLogger = service.createChildLogger('ChildContext', {
        childContext: 'child-value',
        operationId: 'op-123',
      });

      service.log('Parent message');
      childLogger.log('Child message');

      expect(logSpy).toHaveBeenCalledTimes(2);

      const [parentMessage] = logSpy.mock.calls[0] as [string];
      const [childMessage] = logSpy.mock.calls[1] as [string];

      const parentParsed = JSON.parse(parentMessage);
      const childParsed = JSON.parse(childMessage);

      expect(parentParsed).toMatchObject({
        environment: 'production',
        level: 'log',
        message: 'Parent message',
        parentContext: 'parent-value',
      });

      expect(childParsed).toMatchObject({
        childContext: 'child-value',
        environment: 'production',
        level: 'log',
        message: 'Child message',
        operationId: 'op-123',
        parentContext: 'parent-value', // Should inherit from parent
      });
    });

    it('should handle child logger context independently', () => {
      const child1 = service.createChildLogger('Service1', { service1Ctx: 'value1' });
      const child2 = service.createChildLogger('Service2', { service2Ctx: 'value2' });

      child1.log('Message from service 1');
      child2.log('Message from service 2');

      expect(logSpy).toHaveBeenCalledTimes(2);

      const [child1Message] = logSpy.mock.calls[0] as [string];
      const [child2Message] = logSpy.mock.calls[1] as [string];

      const child1Parsed = JSON.parse(child1Message);
      const child2Parsed = JSON.parse(child2Message);

      expect(child1Parsed).toMatchObject({
        environment: 'production',
        level: 'log',
        message: 'Message from service 1',
        service1Ctx: 'value1',
      });
      expect(child1Parsed).not.toHaveProperty('service2Ctx');

      expect(child2Parsed).toMatchObject({
        environment: 'production',
        level: 'log',
        message: 'Message from service 2',
        service2Ctx: 'value2',
      });
      expect(child2Parsed).not.toHaveProperty('service1Ctx');
    });
  });

  describe('OpenTelemetry Integration Verification', () => {
    beforeEach(async () => {
      const config = createConfig({ environment: 'production' });
      module = await setupModule(config);
      service = module.get<LoggerService>(LoggerService);

      // Use console.log spy for production mode
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    it('should not include trace context when no active span', () => {
      vi.mocked(trace.getActiveSpan).mockReturnValue(undefined);

      service.log('Message without trace');

      const [loggedMessage] = logSpy.mock.calls[0] as [string];
      const parsed = JSON.parse(loggedMessage);

      expect(parsed).not.toHaveProperty('traceId');
      expect(parsed).not.toHaveProperty('spanId');
      expect(parsed.message).toBe('Message without trace');
    });

    it('should handle trace extraction errors gracefully', () => {
      vi.mocked(trace.getActiveSpan).mockImplementation(() => {
        throw new Error('Trace error');
      });

      expect(() => {
        service.log('Message with broken trace');
      }).not.toThrow();

      const [loggedMessage] = logSpy.mock.calls[0] as [string];
      const parsed = JSON.parse(loggedMessage);

      // Should still log message even if trace extraction fails
      expect(parsed.message).toBe('Message with broken trace');
      expect(parsed).not.toHaveProperty('traceId');
      expect(parsed).not.toHaveProperty('spanId');
    });
  });

  describe('Configuration Behavior Verification', () => {
    it('should respect consoleOutput: false configuration', async () => {
      const config = createConfig({
        logging: {
          consoleOutput: false,
          level: 'debug',
          otlpExport: { enabled: false, endpoint: '' },
        },
      });

      module = await setupModule(config);
      service = module.get<LoggerService>(LoggerService);

      logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      service.log('This should not output');

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should format differently based on environment', async () => {
      // Test production formatting (structured)
      const prodModule = await setupModule(createConfig({ environment: 'production' }));
      const prodService = prodModule.get<LoggerService>(LoggerService);

      logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      prodService.log('Production message');
      const [prodMessage] = logSpy.mock.calls[0] as [string];

      // Should be JSON
      expect(() => JSON.parse(prodMessage)).not.toThrow();
      const prodParsed = JSON.parse(prodMessage);
      expect(prodParsed.environment).toBe('production');

      await prodModule.close();

      // Test development formatting (pretty)
      logSpy.mockRestore();
      const devModule = await setupModule(createConfig({ environment: 'development' }));
      const devService = devModule.get<LoggerService>(LoggerService);

      logSpy = vi.spyOn(ConsoleLogger.prototype, 'log').mockImplementation(() => undefined);

      devService.log('Development message', 'DevContext');
      const [devMessage] = logSpy.mock.calls[0] as [unknown];

      // Should NOT be JSON format in development - NestJS formats it as a string
      expect(typeof devMessage).toBe('string');
      expect(() => JSON.parse(devMessage as string)).toThrow();

      await devModule.close();
    });
  });
});
