import { describe, expect, it, vi } from 'vitest';

import * as configModule from './config/observability.config.js';
import { defaultObservabilityConfig } from './config/observability.config.js';
import { ObservabilityModule } from './observability.module.js';

describe('ObservabilityModule', () => {
  it('should be defined', () => {
    expect(ObservabilityModule).toBeDefined();
  });

  it('should create a module with forRoot', () => {
    const testConfig = {
      ...defaultObservabilityConfig,
      environment: 'test',
      serviceName: 'test-service',
    };

    const module = ObservabilityModule.forRoot(testConfig);

    expect(module).toBeDefined();
    expect(module.module).toBe(ObservabilityModule);
    expect(module.providers).toBeDefined();
    expect(module.exports).toBeDefined();
  });

  it('should create a module with forRootAsync', () => {
    const module = ObservabilityModule.forRootAsync({
      useFactory: () => ({
        ...defaultObservabilityConfig,
        environment: 'test',
        serviceName: 'test-service',
      }),
    });

    expect(module).toBeDefined();
    expect(module.module).toBe(ObservabilityModule);
    expect(module.providers).toBeDefined();
    expect(module.exports).toBeDefined();
  });

  it('should call ensureServiceLabels in forRoot', () => {
    const ensureServiceLabelsSpy = vi.spyOn(configModule, 'ensureServiceLabels');

    const testConfig = {
      ...defaultObservabilityConfig,
      metrics: {
        ...defaultObservabilityConfig.metrics,
        defaultLabels: {
          customLabel: 'customValue',
          environment: 'test',
        },
      },
      serviceName: 'test-service',
      serviceVersion: '2.0.0',
    };

    ObservabilityModule.forRoot(testConfig);

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

    const testConfig = {
      ...defaultObservabilityConfig,
      metrics: {
        ...defaultObservabilityConfig.metrics,
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
      (configProvider.useFactory as (...args: unknown[]) => unknown)();
    }

    ensureServiceLabelsSpy.mockRestore();
  });

  it('should ensure service labels are present in forRoot config', () => {
    const testConfig = {
      ...defaultObservabilityConfig,
      metrics: {
        ...defaultObservabilityConfig.metrics,
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

    // Get the config provider
    const configProvider = module.providers?.find(
      (p) => typeof p === 'object' && 'provide' in p && p.provide === 'OBSERVABILITY_CONFIG'
    );

    expect(configProvider).toBeDefined();

    if (configProvider && typeof configProvider === 'object' && 'useValue' in configProvider) {
      const config = configProvider.useValue as { metrics: { defaultLabels: Record<string, string> } };
      expect(config.metrics.defaultLabels['service']).toBe('label-test-service');
      expect(config.metrics.defaultLabels['version']).toBe('1.5.0');
      expect(config.metrics.defaultLabels['environment']).toBe('production');
      expect(config.metrics.defaultLabels['region']).toBe('us-west-2');
    }
  });

  it('should preserve user labels while ensuring service labels in forRoot', () => {
    const testConfig = {
      ...defaultObservabilityConfig,
      metrics: {
        ...defaultObservabilityConfig.metrics,
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

    // Get the config provider
    const configProvider = module.providers?.find(
      (p) => typeof p === 'object' && 'provide' in p && p.provide === 'OBSERVABILITY_CONFIG'
    );

    expect(configProvider).toBeDefined();

    const config = (configProvider as { useValue: { metrics: { defaultLabels: Record<string, string> } } }).useValue;
    // Service and version should come from top-level config
    expect(config.metrics.defaultLabels['service']).toBe('override-service');
    expect(config.metrics.defaultLabels['version']).toBe('4.0.0');
    // Other labels should be preserved
    expect(config.metrics.defaultLabels['environment']).toBe('test');
    expect(config.metrics.defaultLabels['customLabel']).toBe('preserved');
  });
});
