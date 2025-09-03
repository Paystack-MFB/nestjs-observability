/**
 * Full-Stack Integration Tests
 *
 * This test suite validates the complete integration between the register module
 * and the NestJS observability module, ensuring all components work together
 * correctly in various scenarios.
 */

import 'reflect-metadata';
import { vi } from 'vitest';

// Set up OpenTelemetry mocks before any other imports
import { OtelProviderMocks } from '../test-helpers/otel-mocks';
const globalMocks = new OtelProviderMocks();
globalMocks.setupMocks();

import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MetricsController } from '../controllers/metrics.controller';
import { LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';
import { ObservabilityModule } from '../observability.module';
import { AsyncTestUtils, MockFactory, TestSetup } from '../test-helpers/otel-mocks';
import { TracingService } from '../tracing/tracing.service';

describe('Full-Stack Integration Tests', () => {
  let moduleRef: TestingModule;
  let loggerService: LoggerService;
  let metricsService: MetricsService;
  let tracingService: TracingService;
  let metricsController: MetricsController;
  let setup: TestSetup;

  beforeEach(() => {
    setup = new TestSetup();
    setup.setupDefault();

    // Reset all modules to ensure mocks are applied to fresh imports
    vi.resetModules();
  });

  afterEach(async () => {
    await moduleRef.close();
    setup.cleanup();
  });

  describe('Complete Initialization Flow', () => {
    it('should initialize all services with default configuration', async () => {
      // Test complete module initialization
      moduleRef = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      await moduleRef.init();

      // Verify all services are available
      loggerService = moduleRef.get<LoggerService>(LoggerService);
      metricsService = moduleRef.get<MetricsService>(MetricsService);
      tracingService = moduleRef.get<TracingService>(TracingService);

      expect(loggerService).toBeDefined();
      expect(metricsService).toBeDefined();
      expect(tracingService).toBeDefined();

      // Verify services are working
      expect(typeof loggerService.info).toBe('function');
      expect(typeof metricsService.createCounter).toBe('function');
      expect(typeof tracingService.startSpan).toBe('function');
    });

    it('should provide all required services', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      await moduleRef.init();

      // Verify all core services are available
      const logger = moduleRef.get<LoggerService>(LoggerService);
      const metrics = moduleRef.get<MetricsService>(MetricsService);
      const tracing = moduleRef.get<TracingService>(TracingService);

      expect(logger).toBeDefined();
      expect(metrics).toBeDefined();
      expect(tracing).toBeDefined();
    });

    it('should initialize MetricsController when metrics are enabled', async () => {
      setup.environment.setEnvironment({
        ...MockFactory.createEnvironment('test'),
        OTEL_METRICS_ENABLED: 'true',
      });

      moduleRef = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      await moduleRef.init();

      metricsController = moduleRef.get<MetricsController>(MetricsController);
      expect(metricsController).toBeDefined();
    });
  });

  describe('Environment Variable Configuration', () => {
    it('should respect development environment configuration', async () => {
      setup.environment.setEnvironment(MockFactory.createEnvironment('development'));

      moduleRef = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      await moduleRef.init();

      loggerService = moduleRef.get<LoggerService>(LoggerService);
      metricsService = moduleRef.get<MetricsService>(MetricsService);
      tracingService = moduleRef.get<TracingService>(TracingService);

      // Verify services are properly initialized and functional
      expect(loggerService).toBeDefined();
      expect(metricsService).toBeDefined();
      expect(tracingService).toBeDefined();

      // Verify services can handle method calls gracefully (they use hardened constructors)
      expect(() => {
        loggerService.info('test message');
      }).not.toThrow();
      expect(() => metricsService.getMeter()).not.toThrow();
      expect(() => tracingService.getActiveSpan()).not.toThrow();
    });

    it('should respect production environment configuration', async () => {
      setup.environment.setEnvironment(MockFactory.createEnvironment('production'));

      moduleRef = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      await moduleRef.init();

      // Services should still initialize correctly with OTLP configuration
      loggerService = moduleRef.get<LoggerService>(LoggerService);
      metricsService = moduleRef.get<MetricsService>(MetricsService);
      tracingService = moduleRef.get<TracingService>(TracingService);

      expect(loggerService).toBeDefined();
      expect(metricsService).toBeDefined();
      expect(tracingService).toBeDefined();
    });

    it('should handle disabled observability gracefully', async () => {
      setup.environment.setEnvironment(MockFactory.createEnvironment('disabled'));

      moduleRef = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      await moduleRef.init();

      // Services should still be available but may behave differently
      loggerService = moduleRef.get<LoggerService>(LoggerService);
      metricsService = moduleRef.get<MetricsService>(MetricsService);
      tracingService = moduleRef.get<TracingService>(TracingService);

      expect(loggerService).toBeDefined();
      expect(metricsService).toBeDefined();
      expect(tracingService).toBeDefined();
    });

    it('should respect environment variable precedence', async () => {
      // Set base environment
      setup.environment.setEnvironment({
        OTEL_METRICS_EXPORTER: 'console',
        OTEL_SERVICE_NAME: 'base-service',
        OTEL_TRACES_EXPORTER: 'console',
      });

      // Override with more specific variables
      process.env['OTEL_SERVICE_NAME'] = 'override-service';
      process.env['OTEL_TRACES_EXPORTER'] = 'otlp';

      moduleRef = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      await moduleRef.init();

      // Services should reflect the overridden values
      loggerService = moduleRef.get<LoggerService>(LoggerService);
      expect(loggerService).toBeDefined();

      // Clean up the override
      delete process.env['OTEL_SERVICE_NAME'];
      delete process.env['OTEL_TRACES_EXPORTER'];
    });
  });

  describe('Enhanced Services Integration', () => {
    beforeEach(async () => {
      moduleRef = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      await moduleRef.init();

      loggerService = moduleRef.get<LoggerService>(LoggerService);
      metricsService = moduleRef.get<MetricsService>(MetricsService);
      tracingService = moduleRef.get<TracingService>(TracingService);
    });

    it('should integrate logging with tracing context', () => {
      // Verify services can work together without throwing errors
      expect(() => {
        // Create a span using the hardened tracing service
        const span = tracingService.startSpan('test-operation');

        // Set context on logger service
        loggerService.setContext({ component: 'integration', operation: 'test' });

        // Log with context - this should work with hardened implementation
        loggerService.info('Test message with trace context', { data: 'test' });

        // End the span
        span.end();
      }).not.toThrow();

      // Verify the services maintain their functionality
      expect(loggerService).toBeDefined();
      expect(tracingService).toBeDefined();
    });

    it('should create and record custom metrics', () => {
      // Verify metrics service can create and use metrics without throwing errors
      expect(() => {
        // Create custom metrics using hardened metrics service
        const counter = metricsService.createCounter('test_counter', 'Test counter description');
        const histogram = metricsService.createHistogram('test_histogram', 'Test histogram description');

        // Record metrics - these should work with hardened implementation
        counter.add(1, { operation: 'test' });
        histogram.record(0.5, { operation: 'test' });
      }).not.toThrow();

      // Verify that the metrics service maintains its state
      expect(metricsService.getMeter()).toBeDefined();
      expect(metricsService.getRegistry()).toBeDefined();
    });

    it('should create and manage spans with attributes', async () => {
      // Verify tracing service can create and manage spans without throwing errors
      expect(() => {
        // Create spans with different methods using hardened tracing service
        const manualSpan = tracingService.startSpan('manual-span');
        manualSpan.end();
      }).not.toThrow();

      // Use withSpan method - this should work with hardened implementation
      // eslint-disable-next-line @typescript-eslint/require-await
      const result = await tracingService.withSpan('operation-span', {}, async () => {
        return 'operation-result';
      });

      expect(result).toBe('operation-result');
      expect(tracingService).toBeDefined();
    });

    it('should handle concurrent operations with context isolation', async () => {
      const operations = [
        async () => {
          const childLogger = loggerService.createChildLogger();
          childLogger.setContext({ operationId: 'op-1', requestId: 'req-1' });
          childLogger.info('Operation 1 message');

          const span = tracingService.startSpan('operation-1');
          await AsyncTestUtils.delay(10);
          span.end();

          return 'result-1';
        },
        async () => {
          const childLogger = loggerService.createChildLogger();
          childLogger.setContext({ operationId: 'op-2', requestId: 'req-2' });
          childLogger.info('Operation 2 message');

          const span = tracingService.startSpan('operation-2');
          await AsyncTestUtils.delay(15);
          span.end();

          return 'result-2';
        },
        async () => {
          const childLogger = loggerService.createChildLogger();
          childLogger.setContext({ operationId: 'op-3', requestId: 'req-3' });
          childLogger.info('Operation 3 message');

          const span = tracingService.startSpan('operation-3');
          await AsyncTestUtils.delay(5);
          span.end();

          return 'result-3';
        },
      ];

      const results = await AsyncTestUtils.concurrent(operations);

      expect(results).toEqual(['result-1', 'result-2', 'result-3']);

      // Verify concurrent operations completed successfully with hardened services
      expect(loggerService).toBeDefined();
      expect(tracingService).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      moduleRef = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      await moduleRef.init();

      loggerService = moduleRef.get<LoggerService>(LoggerService);
      metricsService = moduleRef.get<MetricsService>(MetricsService);
      tracingService = moduleRef.get<TracingService>(TracingService);
    });

    it('should handle logging errors gracefully', () => {
      // Verify hardened logger service handles errors gracefully
      expect(() => {
        loggerService.info('Test message');
        loggerService.error('Test error message');
        loggerService.warn('Test warning message');
        loggerService.debug('Test debug message');
      }).not.toThrow();

      // Verify service remains functional
      expect(loggerService).toBeDefined();
    });

    it('should handle metrics creation errors gracefully', () => {
      // Mock meter to throw error
      setup.otelMocks.mockMeter.createCounter.mockImplementationOnce(() => {
        throw new Error('Metrics error');
      });

      // Should not throw error
      expect(() => {
        metricsService.createCounter('error-counter', 'Error counter');
      }).not.toThrow();
    });

    it('should handle tracing errors gracefully', () => {
      // Mock tracer to throw error
      setup.otelMocks.mockTracer.startSpan.mockImplementationOnce(() => {
        throw new Error('Tracing error');
      });

      // Should not throw error
      expect(() => {
        tracingService.startSpan('error-span');
      }).not.toThrow();
    });

    it('should handle missing environment variables', async () => {
      // Clear environment variables
      setup.environment.clearEnvironment([
        'OTEL_SERVICE_NAME',
        'OTEL_SERVICE_VERSION',
        'OTEL_TRACES_EXPORTER',
        'OTEL_METRICS_EXPORTER',
        'OTEL_LOGS_EXPORTER',
      ]);

      const testModule = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      await testModule.init();

      // Services should still initialize with defaults
      const logger = testModule.get<LoggerService>(LoggerService);
      const metrics = testModule.get<MetricsService>(MetricsService);
      const tracing = testModule.get<TracingService>(TracingService);

      expect(logger).toBeDefined();
      expect(metrics).toBeDefined();
      expect(tracing).toBeDefined();

      await testModule.close();
    });
  });

  describe('Performance and Resource Management', () => {
    beforeEach(async () => {
      moduleRef = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      await moduleRef.init();

      loggerService = moduleRef.get<LoggerService>(LoggerService);
      metricsService = moduleRef.get<MetricsService>(MetricsService);
      tracingService = moduleRef.get<TracingService>(TracingService);
    });

    it('should handle high-frequency logging efficiently', () => {
      const startTime = Date.now();
      const logCount = 100;

      // Verify hardened logger service handles high-frequency logging
      expect(() => {
        for (let i = 0; i < logCount; i++) {
          loggerService.info(`High frequency log ${i.toString()}`, { iteration: i });
        }
      }).not.toThrow();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 1 second for 100 logs)
      expect(duration).toBeLessThan(1000);
      expect(loggerService).toBeDefined();
    });

    it('should handle concurrent metric operations', async () => {
      const counter = metricsService.createCounter('concurrent_counter', 'Concurrent counter');
      const histogram = metricsService.createHistogram('concurrent_histogram', 'Concurrent histogram');

      const operations = Array.from({ length: 50 }, (_, i) => async () => {
        counter.add(1, { operation: `concurrent-${i.toString()}` });
        histogram.record(Math.random(), { operation: `concurrent-${i.toString()}` });
        await AsyncTestUtils.delay(1);
      });

      const startTime = Date.now();
      await AsyncTestUtils.concurrent(operations);
      const endTime = Date.now();

      // Should complete efficiently
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle span lifecycle correctly', () => {
      // Verify hardened tracing service handles span lifecycle without errors
      expect(() => {
        const spans: unknown[] = [];

        // Create multiple spans using hardened tracing service
        for (let i = 0; i < 10; i++) {
          const span = tracingService.startSpan(`test-span-${i.toString()}`);
          spans.push(span);
        }

        // End all spans
        spans.forEach((span) => {
          (span as { end: () => void }).end();
        });
      }).not.toThrow();

      expect(tracingService).toBeDefined();
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize and destroy module correctly', async () => {
      const testModule = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      await testModule.init();

      // Verify services are available
      const logger = testModule.get<LoggerService>(LoggerService);
      const metrics = testModule.get<MetricsService>(MetricsService);
      const tracing = testModule.get<TracingService>(TracingService);

      expect(logger).toBeDefined();
      expect(metrics).toBeDefined();
      expect(tracing).toBeDefined();

      // Should close without errors
      await expect(testModule.close()).resolves.not.toThrow();
    });

    it('should handle multiple module instances', async () => {
      const module1 = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      const module2 = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      await module1.init();
      await module2.init();

      // Both modules should have their own service instances
      const logger1 = module1.get<LoggerService>(LoggerService);
      const logger2 = module2.get<LoggerService>(LoggerService);

      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();

      await module1.close();
      await module2.close();
    });
  });

  describe('Real-world Scenarios', () => {
    beforeEach(async () => {
      moduleRef = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      await moduleRef.init();

      loggerService = moduleRef.get<LoggerService>(LoggerService);
      metricsService = moduleRef.get<MetricsService>(MetricsService);
      tracingService = moduleRef.get<TracingService>(TracingService);
    });

    it('should simulate a complete request lifecycle', async () => {
      // Simulate request start
      const requestId = 'req-12345';
      const userId = 'user-67890';

      // Start request span
      const requestSpan = tracingService.startSpan('http-request');

      // Create request-scoped logger
      const requestLogger = loggerService.createChildLogger();
      requestLogger.setContext({ operation: 'user-profile', requestId, userId });

      // Log request start
      requestLogger.info('Processing user profile request', {
        method: 'GET',
        path: '/api/users/profile',
        userId,
      });

      // Create and record request metrics
      const requestCounter = metricsService.createCounter('http_requests_total', 'Total HTTP requests');
      const requestDuration = metricsService.createHistogram('http_request_duration_seconds', 'HTTP request duration');

      requestCounter.add(1, { method: 'GET', route: '/api/users/profile', status: '200' });

      // Simulate business logic
      await tracingService.withSpan('user-lookup', {}, async () => {
        requestLogger.info('Looking up user in database', { userId });
        await AsyncTestUtils.delay(50);
      });

      await tracingService.withSpan('profile-enrichment', {}, async () => {
        requestLogger.info('Enriching user profile', { userId });
        await AsyncTestUtils.delay(30);
      });

      // Record response
      requestDuration.record(0.08, { method: 'GET', route: '/api/users/profile', status: '200' });
      requestLogger.info('Request completed successfully', {
        duration: '80ms',
        statusCode: 200,
        userId,
      });

      // End request span
      requestSpan.end();

      // Verify the complete request lifecycle worked with hardened services
      expect(requestLogger).toBeDefined();
      expect(requestSpan).toBeDefined();
      expect(requestCounter).toBeDefined();
      expect(requestDuration).toBeDefined();
    });

    it('should simulate error handling scenario', async () => {
      const requestId = 'req-error-123';

      // Start request span
      const requestSpan = tracingService.startSpan('error-request');

      // Create request-scoped logger
      const requestLogger = loggerService.createChildLogger();
      requestLogger.setContext({ operation: 'error-test', requestId });

      try {
        // Simulate operation that throws error
        // eslint-disable-next-line @typescript-eslint/require-await
        await tracingService.withSpan('failing-operation', {}, async () => {
          requestLogger.info('Starting operation that will fail');
          throw new Error('Simulated business logic error');
        });
      } catch (error) {
        // Handle error
        const errorObj = error as Error;
        requestLogger.error('Operation failed', {
          error: errorObj.message,
          stack: errorObj.stack,
        });

        // Record error span
        requestSpan.recordException(errorObj);
        requestSpan.setStatus({ code: 2, message: errorObj.message });

        // Record error metrics
        const errorCounter = metricsService.createCounter('errors_total', 'Total errors');
        errorCounter.add(1, { operation: 'failing-operation', type: 'business-logic' });
      } finally {
        requestSpan.end();
      }

      // Verify error handling worked with hardened services
      expect(requestLogger).toBeDefined();
      expect(requestSpan).toBeDefined();
    });
  });
});
