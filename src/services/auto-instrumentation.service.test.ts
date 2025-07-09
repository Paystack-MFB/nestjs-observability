/* eslint-disable @typescript-eslint/unbound-method */
import { Controller, Injectable } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { SpanStatusCode } from '@opentelemetry/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ObservabilityConfig } from '../config/observability.config';
import { NoTrace, NoTraceClass, TraceAllMethods, TraceMethod } from '../decorators/auto-trace.decorators';
import { LoggerService } from '../logger/logger.service';
import { AutoInstrumentationService } from './auto-instrumentation.service';

// Mock OpenTelemetry
const mockSpan = {
  end: vi.fn(),
  recordException: vi.fn(),
  setAttributes: vi.fn(),
  setStatus: vi.fn(),
};

const mockTracer = {
  // @ts-expect-error - mockTracer is a mock object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  startActiveSpan: vi.fn((name: string, callback: (span: any) => unknown) => {
    return callback(mockSpan);
  }),
};

vi.mock('@opentelemetry/api', () => ({
  SpanStatusCode: {
    ERROR: 'ERROR',
    OK: 'OK',
  },
  trace: {
    getTracer: vi.fn(() => mockTracer),
  },
}));

@Controller('error')
class ErrorController {
  async errorMethod(): Promise<string> {
    return await Promise.reject(new Error('Test error'));
  }

  async successMethod(): Promise<string> {
    return await Promise.resolve('success');
  }
}

@Controller('excluded')
@NoTraceClass()
class ExcludedController {
  excludedMethod(): string {
    return 'excluded';
  }
}

// Mock classes for testing
@Controller('test')
class TestController {
  // Made public for testing
  _privateMethod(): string {
    return 'private';
  }

  async asyncMethod(): Promise<string> {
    return Promise.resolve('async-result');
  }

  @TraceMethod('custom-span')
  customMethod(): string {
    return 'custom';
  }

  @NoTrace()
  noTraceMethod(): string {
    return 'no-trace';
  }

  testMethod(): string {
    return 'test';
  }
}

@Injectable()
@TraceAllMethods()
class TracedService {
  async asyncServiceMethod(): Promise<string> {
    return Promise.resolve('async-service');
  }

  @TraceMethod('service-custom')
  customServiceMethod(): string {
    return 'service-custom';
  }

  @NoTrace()
  noTraceServiceMethod(): string {
    return 'no-trace-service';
  }

  serviceMethod(): string {
    return 'service';
  }
}

@Injectable()
class UntracedService {
  untracedMethod(): string {
    return 'untraced';
  }
}

describe('AutoInstrumentationService', () => {
  let service: AutoInstrumentationService;
  let module: TestingModule;
  let loggerService: LoggerService;

  const defaultConfig: ObservabilityConfig = {
    environment: 'test',
    logging: {
      consoleOutput: true,
      level: 'info',
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
  };

  // Mock discovery service
  const mockDiscoveryService = {
    getControllers: vi.fn(),
    getProviders: vi.fn(),
  };

  // Mock logger service
  const mockLogger = {
    debug: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    verbose: vi.fn(),
    warn: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create testing module with proper DI setup using factory pattern
    module = await Test.createTestingModule({
      providers: [
        {
          provide: DiscoveryService,
          useValue: mockDiscoveryService,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
        {
          provide: 'OBSERVABILITY_CONFIG',
          useValue: defaultConfig,
        },
        {
          inject: [DiscoveryService, LoggerService, 'OBSERVABILITY_CONFIG'],
          provide: AutoInstrumentationService,
          useFactory: (discoveryService: DiscoveryService, logger: LoggerService, config: ObservabilityConfig) => {
            return new AutoInstrumentationService(discoveryService, logger, config);
          },
        },
      ],
    }).compile();

    // Get service instances from DI container
    service = module.get<AutoInstrumentationService>(AutoInstrumentationService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await module.close();
  });

  describe('onModuleInit', () => {
    it('should initialize successfully when tracing is enabled', () => {
      const testController = new TestController();
      const tracedService = new TracedService();

      mockDiscoveryService.getControllers.mockReturnValue([{ instance: testController, metatype: TestController }]);
      mockDiscoveryService.getProviders.mockReturnValue([{ instance: tracedService, metatype: TracedService }]);

      service.onModuleInit();

      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Auto-instrumentation completed'),
        'AutoInstrumentationService'
      );
    });

    it('should skip initialization when tracing is disabled', async () => {
      // Override config for this test
      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: DiscoveryService,
            useValue: mockDiscoveryService,
          },
          {
            provide: LoggerService,
            useValue: mockLogger,
          },
          {
            provide: 'OBSERVABILITY_CONFIG',
            useValue: {
              ...defaultConfig,
              tracing: {
                ...defaultConfig.tracing,
                enabled: false,
              },
            },
          },
          {
            inject: [DiscoveryService, LoggerService, 'OBSERVABILITY_CONFIG'],
            provide: AutoInstrumentationService,
            useFactory: (discoveryService: DiscoveryService, logger: LoggerService, config: ObservabilityConfig) => {
              return new AutoInstrumentationService(discoveryService, logger, config);
            },
          },
        ],
      }).compile();

      const disabledService = testModule.get<AutoInstrumentationService>(AutoInstrumentationService);
      const disabledLogger = testModule.get<LoggerService>(LoggerService);

      disabledService.onModuleInit();

      expect(disabledLogger.log).toHaveBeenCalledWith('Auto-instrumentation is disabled', 'AutoInstrumentationService');

      await testModule.close();
    });

    it('should skip initialization when auto-instrumentation is disabled', async () => {
      // Override config for this test
      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: DiscoveryService,
            useValue: mockDiscoveryService,
          },
          {
            provide: LoggerService,
            useValue: mockLogger,
          },
          {
            provide: 'OBSERVABILITY_CONFIG',
            useValue: {
              ...defaultConfig,
              tracing: {
                ...defaultConfig.tracing,
                autoInstrumentation: {
                  ...defaultConfig.tracing.autoInstrumentation,
                  enabled: false,
                },
              },
            },
          },
          {
            inject: [DiscoveryService, LoggerService, 'OBSERVABILITY_CONFIG'],
            provide: AutoInstrumentationService,
            useFactory: (discoveryService: DiscoveryService, logger: LoggerService, config: ObservabilityConfig) => {
              return new AutoInstrumentationService(discoveryService, logger, config);
            },
          },
        ],
      }).compile();

      const disabledService = testModule.get<AutoInstrumentationService>(AutoInstrumentationService);
      const disabledLogger = testModule.get<LoggerService>(LoggerService);

      disabledService.onModuleInit();

      expect(disabledLogger.log).toHaveBeenCalledWith('Auto-instrumentation is disabled', 'AutoInstrumentationService');

      await testModule.close();
    });

    it('should handle errors during initialization', () => {
      mockDiscoveryService.getControllers.mockImplementation(() => {
        throw new Error('Discovery error');
      });

      service.onModuleInit();

      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during auto-instrumentation'),
        expect.any(String),
        'AutoInstrumentationService'
      );
    });
  });

  describe('Controller instrumentation', () => {
    it('should instrument all public methods of controllers', () => {
      const testController = new TestController();
      const originalMethod = testController.testMethod;

      mockDiscoveryService.getControllers.mockReturnValue([{ instance: testController, metatype: TestController }]);
      mockDiscoveryService.getProviders.mockReturnValue([]);

      service.onModuleInit();

      expect(testController.testMethod).not.toBe(originalMethod);

      const result = testController.testMethod();

      expect(result).toBe('test');
      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith('TestController.testMethod', expect.any(Function));
    });

    it('should respect @TraceMethod decorator options', () => {
      const testController = new TestController();

      mockDiscoveryService.getControllers.mockReturnValue([{ instance: testController, metatype: TestController }]);
      mockDiscoveryService.getProviders.mockReturnValue([]);

      service.onModuleInit();

      // Call the method with custom span name
      testController.customMethod();

      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith('custom-span', expect.any(Function));
    });

    it('should skip methods marked with @NoTrace', () => {
      const testController = new TestController();
      const originalMethod = testController.noTraceMethod;

      mockDiscoveryService.getControllers.mockReturnValue([{ instance: testController, metatype: TestController }]);
      mockDiscoveryService.getProviders.mockReturnValue([]);

      service.onModuleInit();

      // Method should NOT be wrapped
      expect(testController.noTraceMethod).toBe(originalMethod);
    });

    it('should skip private methods by default', () => {
      const testController = new TestController();
      const originalMethod = testController._privateMethod;

      mockDiscoveryService.getControllers.mockReturnValue([{ instance: testController, metatype: TestController }]);
      mockDiscoveryService.getProviders.mockReturnValue([]);

      service.onModuleInit();

      // Private method should NOT be wrapped
      expect(testController._privateMethod).toBe(originalMethod);
    });

    it('should capture method arguments when enabled', () => {
      const testController = new TestController();

      mockDiscoveryService.getControllers.mockReturnValue([{ instance: testController, metatype: TestController }]);
      mockDiscoveryService.getProviders.mockReturnValue([]);

      service.onModuleInit();

      testController.customMethod();

      expect(mockSpan.setAttributes).toHaveBeenCalledWith({
        'class.name': 'TestController',
        'instrumentation.type': 'auto',
        'method.name': 'customMethod',
      });
    });

    it('should handle excluded controllers', () => {
      const excludedController = new ExcludedController();
      const originalMethod = excludedController.excludedMethod;

      mockDiscoveryService.getControllers.mockReturnValue([
        { instance: excludedController, metatype: ExcludedController },
      ]);
      mockDiscoveryService.getProviders.mockReturnValue([]);

      service.onModuleInit();

      // Method should NOT be wrapped
      expect(excludedController.excludedMethod).toBe(originalMethod);
    });

    it('should handle synchronous methods correctly', () => {
      const testController = new TestController();

      mockDiscoveryService.getControllers.mockReturnValue([{ instance: testController, metatype: TestController }]);
      mockDiscoveryService.getProviders.mockReturnValue([]);

      service.onModuleInit();

      const result = testController.testMethod();

      expect(result).toBe('test');
      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith('TestController.testMethod', expect.any(Function));
    });

    it('should handle asynchronous methods correctly', async () => {
      const testController = new TestController();

      mockDiscoveryService.getControllers.mockReturnValue([{ instance: testController, metatype: TestController }]);
      mockDiscoveryService.getProviders.mockReturnValue([]);

      service.onModuleInit();

      const result = await testController.asyncMethod();

      expect(result).toBe('async-result');
      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith('TestController.asyncMethod', expect.any(Function));
    });
  });

  describe('Provider instrumentation', () => {
    it('should instrument providers with @TraceAllMethods', () => {
      const tracedService = new TracedService();
      const originalMethod = tracedService.serviceMethod;

      mockDiscoveryService.getControllers.mockReturnValue([]);
      mockDiscoveryService.getProviders.mockReturnValue([{ instance: tracedService, metatype: TracedService }]);

      service.onModuleInit();

      expect(tracedService.serviceMethod).not.toBe(originalMethod);

      tracedService.serviceMethod();

      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith('TracedService.serviceMethod', expect.any(Function));
    });

    it('should skip providers without @TraceAllMethods', () => {
      const untracedService = new UntracedService();
      const originalMethod = untracedService.untracedMethod;

      mockDiscoveryService.getControllers.mockReturnValue([]);
      mockDiscoveryService.getProviders.mockReturnValue([{ instance: untracedService, metatype: UntracedService }]);

      service.onModuleInit();

      // Method should NOT be wrapped
      expect(untracedService.untracedMethod).toBe(originalMethod);
    });

    it('should respect @NoTrace on provider methods', () => {
      const tracedService = new TracedService();
      const originalMethod = tracedService.noTraceServiceMethod;

      mockDiscoveryService.getControllers.mockReturnValue([]);
      mockDiscoveryService.getProviders.mockReturnValue([{ instance: tracedService, metatype: TracedService }]);

      service.onModuleInit();

      // Method with @NoTrace should NOT be wrapped
      expect(tracedService.noTraceServiceMethod).toBe(originalMethod);
    });

    it('should respect @TraceMethod on provider methods', () => {
      const tracedService = new TracedService();

      mockDiscoveryService.getControllers.mockReturnValue([]);
      mockDiscoveryService.getProviders.mockReturnValue([{ instance: tracedService, metatype: TracedService }]);

      service.onModuleInit();

      tracedService.customServiceMethod();

      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith('service-custom', expect.any(Function));
    });

    it('should handle async provider methods correctly', async () => {
      const tracedService = new TracedService();

      mockDiscoveryService.getControllers.mockReturnValue([]);
      mockDiscoveryService.getProviders.mockReturnValue([{ instance: tracedService, metatype: TracedService }]);

      service.onModuleInit();

      const result = await tracedService.asyncServiceMethod();

      expect(result).toBe('async-service');
      expect(mockTracer.startActiveSpan).toHaveBeenCalledWith('TracedService.asyncServiceMethod', expect.any(Function));
    });
  });

  describe('Error handling', () => {
    it('should handle method execution errors', async () => {
      const errorController = new ErrorController();

      mockDiscoveryService.getControllers.mockReturnValue([{ instance: errorController, metatype: ErrorController }]);
      mockDiscoveryService.getProviders.mockReturnValue([]);

      service.onModuleInit();

      await expect(errorController.errorMethod()).rejects.toThrow('Test error');

      expect(mockSpan.recordException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Test error',
      });
    });

    it('should handle successful method execution', async () => {
      const errorController = new ErrorController();

      mockDiscoveryService.getControllers.mockReturnValue([{ instance: errorController, metatype: ErrorController }]);
      mockDiscoveryService.getProviders.mockReturnValue([]);

      service.onModuleInit();

      const result = await errorController.successMethod();

      expect(result).toBe('success');
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
    });
  });
});
