import 'reflect-metadata';
/**
 * Unit tests for ObservabilityModule - Lightweight Version
 */
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock OpenTelemetry modules
vi.mock('@opentelemetry/api', () => ({
  metrics: {
    getMeterProvider: vi.fn().mockReturnValue({
      getMeter: vi.fn().mockReturnValue({
        createCounter: vi.fn(),
        createHistogram: vi.fn(),
        createObservableGauge: vi.fn(),
      }),
    }),
  },
  trace: {
    getActiveSpan: vi.fn(),
    getTracer: vi.fn().mockReturnValue({
      startSpan: vi.fn().mockReturnValue({
        end: vi.fn(),
        recordException: vi.fn(),
        setAttributes: vi.fn(),
        setStatus: vi.fn(),
      }),
    }),
    getTracerProvider: vi.fn().mockReturnValue({
      getTracer: vi.fn().mockReturnValue({
        startSpan: vi.fn().mockReturnValue({
          end: vi.fn(),
          recordException: vi.fn(),
          setAttributes: vi.fn(),
          setStatus: vi.fn(),
        }),
      }),
    }),
  },
}));

vi.mock('@opentelemetry/api-logs', () => ({
  logs: {
    getLoggerProvider: vi.fn().mockReturnValue({
      getLogger: vi.fn().mockReturnValue({
        emit: vi.fn(),
      }),
    }),
  },
}));

import { MetricsController } from './controllers/metrics.controller';
import { AutoTraceInterceptor } from './interceptors/auto-trace.interceptor';
import { RequestLoggingInterceptor } from './interceptors/request-logging.interceptor';
import { LoggerService } from './logger/logger.service';
import { MetricsService } from './metrics/metrics.service';
import { ObservabilityModule } from './observability.module';
import * as register from './register';
import { TracingService } from './tracing/tracing.service';

// Mock environment variables
const mockEnv = {
  NODE_ENV: 'test',
  OTEL_SERVICE_NAME: 'test-service',
  OTEL_SERVICE_VERSION: '1.0.0',
};

describe('ObservabilityModule - Lightweight', () => {
  let module: TestingModule;

  beforeEach(() => {
    // Set up environment variables
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });
  });

  describe('forRoot()', () => {
    it('should create module without configuration parameters', () => {
      const moduleDefinition = ObservabilityModule.forRoot();

      expect(moduleDefinition).toBeDefined();
      expect(moduleDefinition.module).toBe(ObservabilityModule);
      expect(moduleDefinition.providers).toBeDefined();
      expect(moduleDefinition.controllers).toContain(MetricsController);
      expect(moduleDefinition.exports).toContain(LoggerService);
      expect(moduleDefinition.exports).toContain(MetricsService);
      expect(moduleDefinition.exports).toContain(TracingService);
    });

    it('should provide all required services', async () => {
      module = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      // Verify all services are available
      const loggerService = module.get<LoggerService>(LoggerService);
      const metricsService = module.get<MetricsService>(MetricsService);
      const tracingService = module.get<TracingService>(TracingService);

      expect(loggerService).toBeDefined();
      expect(metricsService).toBeDefined();
      expect(tracingService).toBeDefined();
    });

    it('should register AutoTraceInterceptor as APP_INTERCEPTOR', () => {
      const moduleDefinition = ObservabilityModule.forRoot();

      // Check that AutoTraceInterceptor is registered
      const interceptorProviders = moduleDefinition.providers?.filter(
        (provider) => typeof provider === 'object' && 'provide' in provider && provider.provide === APP_INTERCEPTOR
      );

      expect(interceptorProviders).toBeDefined();
      expect(interceptorProviders?.length).toBeGreaterThan(0);

      const autoTraceInterceptor = interceptorProviders?.find(
        (provider) =>
          typeof provider === 'object' && 'useClass' in provider && provider.useClass === AutoTraceInterceptor
      );
      expect(autoTraceInterceptor).toBeDefined();
    });

    it('should register RequestLoggingInterceptor when OTEL_LOG_HTTP_REQUESTS=true', () => {
      vi.spyOn(register, 'getHttpRequestLoggingEnabled').mockReturnValue(true);

      const moduleDefinition = ObservabilityModule.forRoot();

      const interceptorProviders = moduleDefinition.providers?.filter(
        (provider) => typeof provider === 'object' && 'provide' in provider && provider.provide === APP_INTERCEPTOR
      );

      const requestLoggingInterceptor = interceptorProviders?.find(
        (provider) =>
          typeof provider === 'object' && 'useClass' in provider && provider.useClass === RequestLoggingInterceptor
      );

      expect(requestLoggingInterceptor).toBeDefined();

      vi.restoreAllMocks();
    });

    it('should NOT register RequestLoggingInterceptor when OTEL_LOG_HTTP_REQUESTS=false', () => {
      vi.spyOn(register, 'getHttpRequestLoggingEnabled').mockReturnValue(false);

      const moduleDefinition = ObservabilityModule.forRoot();

      const interceptorProviders = moduleDefinition.providers?.filter(
        (provider) => typeof provider === 'object' && 'provide' in provider && provider.provide === APP_INTERCEPTOR
      );

      const requestLoggingInterceptor = interceptorProviders?.find(
        (provider) =>
          typeof provider === 'object' && 'useClass' in provider && provider.useClass === RequestLoggingInterceptor
      );

      expect(requestLoggingInterceptor).toBeUndefined();

      vi.restoreAllMocks();
    });
  });

  describe('Module Registration', () => {
    it('should be marked as Global', () => {
      const moduleMetadata = Reflect.getMetadata('__module:global__', ObservabilityModule) as boolean;
      expect(moduleMetadata).toBe(true);
    });

    it('should export required services', () => {
      const moduleDefinition = ObservabilityModule.forRoot();

      expect(moduleDefinition.exports).toContain(LoggerService);
      expect(moduleDefinition.exports).toContain(MetricsService);
      expect(moduleDefinition.exports).toContain(TracingService);
    });

    it('should include MetricsController', () => {
      const moduleDefinition = ObservabilityModule.forRoot();

      expect(moduleDefinition.controllers).toContain(MetricsController);
    });
  });

  describe('Integration', () => {
    it('should work with NestJS dependency injection', async () => {
      module = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      await module.init();

      // Verify module initializes without errors
      expect(module).toBeDefined();
    });
  });
});
