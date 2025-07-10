import { describe, expect, it, vi } from 'vitest';

import * as configModule from './config/observability.config.js';
import { type SimpleObservabilityConfig } from './config/observability.config.js';
import { ObservabilityModule } from './observability.module.js';

// Mock ConfigService
const mockConfigService = {
  get: vi.fn((key: string, defaultValue?: unknown) => {
    // Return default values for common environment variables
    switch (key) {
      case 'LOG_LEVEL':
        return 'info';
      case 'METRICS_ENDPOINT':
        return '/metrics';
      case 'NODE_ENV':
        return 'test';
      case 'OTLP_LOGS_ENDPOINT':
        return 'http://localhost:4318/v1/logs';
      case 'OTLP_TRACES_ENDPOINT':
        return 'http://localhost:4318/v1/traces';
      case 'SERVICE_NAME':
        return 'test-service';
      case 'SERVICE_VERSION':
        return '1.0.0';
      default:
        return defaultValue;
    }
  }),
};

describe('ObservabilityModule', () => {
  it('should be defined', () => {
    expect(ObservabilityModule).toBeDefined();
  });

  it('should create a module with forRoot', () => {
    const testConfig: SimpleObservabilityConfig = {
      environment: 'test',
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
    };

    const module = ObservabilityModule.forRoot(testConfig);

    expect(module).toBeDefined();
    expect(module.module).toBe(ObservabilityModule);
    expect(module.providers).toBeDefined();
    expect(module.exports).toBeDefined();
  });

  it('should create a module with forRootAsync', () => {
    const module = ObservabilityModule.forRootAsync({
      useFactory: (): SimpleObservabilityConfig => ({
        environment: 'test',
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
      }),
    });

    expect(module).toBeDefined();
    expect(module.module).toBe(ObservabilityModule);
    expect(module.providers).toBeDefined();
    expect(module.exports).toBeDefined();
  });

  it('should call ensureServiceLabels in forRoot', () => {
    const ensureServiceLabelsSpy = vi.spyOn(configModule, 'ensureServiceLabels');

    const testConfig: SimpleObservabilityConfig = {
      metrics: {
        defaultLabels: {
          customLabel: 'customValue',
          environment: 'test',
        },
      },
      serviceName: 'test-service',
      serviceVersion: '2.0.0',
    };

    const module = ObservabilityModule.forRoot(testConfig);

    // Get the config provider and execute its useFactory
    const configProvider = module.providers?.find(
      (p) => typeof p === 'object' && 'provide' in p && p.provide === 'OBSERVABILITY_CONFIG'
    );

    expect(configProvider).toBeDefined();

    // Execute the useFactory to trigger ensureServiceLabels
    if (configProvider && typeof configProvider === 'object' && 'useFactory' in configProvider) {
      (configProvider.useFactory as (...args: unknown[]) => unknown)(mockConfigService);
    }

    expect(ensureServiceLabelsSpy).toHaveBeenCalledOnce();
    expect(ensureServiceLabelsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        metrics: expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          defaultLabels: expect.objectContaining({
            customLabel: 'customValue',
            environment: 'test',
          }),
        }),
        serviceName: 'test-service',
        serviceVersion: '2.0.0',
      })
    );

    ensureServiceLabelsSpy.mockRestore();
  });

  it('should call ensureServiceLabels in forRootAsync', () => {
    const ensureServiceLabelsSpy = vi.spyOn(configModule, 'ensureServiceLabels');

    const testConfig: SimpleObservabilityConfig = {
      metrics: {
        defaultLabels: {
          environment: 'staging',
          team: 'backend',
        },
      },
      serviceName: 'async-service',
      serviceVersion: '3.0.0',
    };

    const module = ObservabilityModule.forRootAsync({
      useFactory: () => testConfig,
    });

    expect(module).toBeDefined();

    // Get the config provider
    const configProvider = module.providers?.find(
      (p) => typeof p === 'object' && 'provide' in p && p.provide === 'OBSERVABILITY_CONFIG'
    );

    expect(configProvider).toBeDefined();

    // Call the useFactory to trigger ensureServiceLabels
    if (configProvider && typeof configProvider === 'object' && 'useFactory' in configProvider) {
      (configProvider.useFactory as (...args: unknown[]) => unknown)(mockConfigService);
    }

    ensureServiceLabelsSpy.mockRestore();
  });

  it('should ensure service labels are present in forRoot config', () => {
    const ensureServiceLabelsSpy = vi.spyOn(configModule, 'ensureServiceLabels');

    const testConfig: SimpleObservabilityConfig = {
      metrics: {
        defaultLabels: {
          environment: 'production',
          region: 'us-west-2',
          // Note: not providing service and version here
        },
      },
      serviceName: 'label-test-service',
      serviceVersion: '1.5.0',
    };

    const module = ObservabilityModule.forRoot(testConfig);

    // Get the config provider and execute its useFactory
    const configProvider = module.providers?.find(
      (p) => typeof p === 'object' && 'provide' in p && p.provide === 'OBSERVABILITY_CONFIG'
    );

    expect(configProvider).toBeDefined();

    // Execute the useFactory to trigger ensureServiceLabels
    if (configProvider && typeof configProvider === 'object' && 'useFactory' in configProvider) {
      (configProvider.useFactory as (...args: unknown[]) => unknown)(mockConfigService);
    }

    // Verify that ensureServiceLabels was called
    expect(ensureServiceLabelsSpy).toHaveBeenCalledOnce();
    expect(ensureServiceLabelsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        metrics: expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          defaultLabels: expect.objectContaining({
            environment: 'production',
            region: 'us-west-2',
          }),
        }),
        serviceName: 'label-test-service',
        serviceVersion: '1.5.0',
      })
    );

    ensureServiceLabelsSpy.mockRestore();
  });

  it('should preserve user labels while ensuring service labels in forRoot', () => {
    const ensureServiceLabelsSpy = vi.spyOn(configModule, 'ensureServiceLabels');

    const testConfig: SimpleObservabilityConfig = {
      metrics: {
        defaultLabels: {
          customLabel: 'preserved',
          environment: 'test',
          service: 'wrong-service', // This should be overridden
          version: '1.0.0', // This should be overridden
        },
      },
      serviceName: 'override-service',
      serviceVersion: '4.0.0',
    };

    const module = ObservabilityModule.forRoot(testConfig);

    // Get the config provider and execute its useFactory
    const configProvider = module.providers?.find(
      (p) => typeof p === 'object' && 'provide' in p && p.provide === 'OBSERVABILITY_CONFIG'
    );

    expect(configProvider).toBeDefined();

    // Execute the useFactory to trigger ensureServiceLabels
    if (configProvider && typeof configProvider === 'object' && 'useFactory' in configProvider) {
      (configProvider.useFactory as (...args: unknown[]) => unknown)(mockConfigService);
    }

    // Verify that ensureServiceLabels was called
    expect(ensureServiceLabelsSpy).toHaveBeenCalledOnce();
    expect(ensureServiceLabelsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        metrics: expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          defaultLabels: expect.objectContaining({
            customLabel: 'preserved',
            environment: 'test',
          }),
        }),
        serviceName: 'override-service',
        serviceVersion: '4.0.0',
      })
    );

    ensureServiceLabelsSpy.mockRestore();
  });
});
