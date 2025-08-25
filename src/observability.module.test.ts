/**
 * Unit tests for ObservabilityModule - Lightweight Version
 */

import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MetricsController } from './controllers/metrics.controller';
import { LoggerService } from './logger/logger.service';
import { MetricsService } from './metrics/metrics.service';
import { ObservabilityModule } from './observability.module';
import { TracingService } from './tracing/tracing.service';

// Mock environment variables
const mockEnv = {
  NODE_ENV: 'test',
  OTEL_SERVICE_NAME: 'test-service',
  OTEL_SERVICE_VERSION: '1.0.0',
};

describe('ObservabilityModule - Lightweight', () => {
  let module: TestingModule;

  beforeEach(async () => {
    // Set up environment variables
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });

    // Mock the services to avoid actual OpenTelemetry initialization
    vi.mock('./logger/logger.service');
    vi.mock('./metrics/metrics.service');
    vi.mock('./tracing/tracing.service');
  });

  describe('forRoot()', () => {
    it('should create module without configuration parameters', async () => {
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

    it('should register AutoTraceInterceptor as APP_INTERCEPTOR', async () => {
      const moduleDefinition = ObservabilityModule.forRoot();

      // Check that APP_INTERCEPTOR provider is included
      const interceptorProvider = moduleDefinition.providers?.find(
        (provider) => typeof provider === 'object' && 'provide' in provider && provider.provide === APP_INTERCEPTOR
      );

      expect(interceptorProvider).toBeDefined();
    });

    it('should provide default configuration from environment variables', async () => {
      module = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      const config = module.get('OBSERVABILITY_CONFIG');
      expect(config).toBeDefined();
      expect(config.serviceName).toBe('test-service');
      expect(config.serviceVersion).toBe('1.0.0');
      expect(config.environment).toBe('test');
    });

    it('should use default values when environment variables are not set', async () => {
      // Clear environment variables
      delete process.env['OTEL_SERVICE_NAME'];
      delete process.env['OTEL_SERVICE_VERSION'];
      delete process.env['NODE_ENV'];

      module = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      const config = module.get('OBSERVABILITY_CONFIG');
      expect(config).toBeDefined();
      expect(config.serviceName).toBe('nestjs-app');
      expect(config.serviceVersion).toBe('1.0.0');
      expect(config.environment).toBe('development');
    });
  });

  describe('Module Registration', () => {
    it('should be marked as Global', () => {
      const moduleMetadata = Reflect.getMetadata('__module:global__', ObservabilityModule);
      expect(moduleMetadata).toBe(true);
    });

    it('should export required services', async () => {
      const moduleDefinition = ObservabilityModule.forRoot();

      expect(moduleDefinition.exports).toContain(LoggerService);
      expect(moduleDefinition.exports).toContain(MetricsService);
      expect(moduleDefinition.exports).toContain(TracingService);
    });

    it('should include MetricsController', async () => {
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
