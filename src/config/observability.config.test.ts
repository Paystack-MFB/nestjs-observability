import { describe, expect, it } from 'vitest';

import { defaultObservabilityConfig, ensureServiceLabels, type ObservabilityConfig } from './observability.config';

describe('ObservabilityConfig', () => {
  describe('defaultObservabilityConfig', () => {
    it('should have correct default structure', () => {
      const config = defaultObservabilityConfig;

      // Test basic service info
      expect(config.serviceName).toBeDefined();
      expect(config.serviceVersion).toBeDefined();
      expect(config.environment).toBeDefined();

      // Test logging configuration
      expect(config.logging).toBeDefined();
      expect(config.logging.level).toBeDefined();
      expect(typeof config.logging.consoleOutput).toBe('boolean');
      expect(config.logging.otlpExport).toBeDefined();
      expect(typeof config.logging.otlpExport.enabled).toBe('boolean');
      expect(config.logging.otlpExport.endpoint).toBeDefined();

      // Test metrics configuration
      expect(config.metrics).toBeDefined();
      expect(typeof config.metrics.enabled).toBe('boolean');
      expect(config.metrics.endpoint).toBeDefined();
      expect(config.metrics.defaultLabels).toBeDefined();
      expect(typeof config.metrics.defaultMetrics).toBe('boolean');

      // Test tracing configuration
      expect(config.tracing).toBeDefined();
      expect(typeof config.tracing.enabled).toBe('boolean');
      expect(config.tracing.exporter).toBeDefined();
      expect(config.tracing.exporter.type).toBe('otlp');
      expect(config.tracing.sampler).toBeDefined();
      expect(config.tracing.instrumentations).toBeDefined();
    });

    it('should use environment variables for serviceVersion', () => {
      const config = defaultObservabilityConfig;

      // Should have a default value or environment variable
      expect(config.serviceVersion).toBeDefined();
      expect(typeof config.serviceVersion).toBe('string');
    });

    it('should have service and version in metrics.defaultLabels', () => {
      const config = defaultObservabilityConfig;

      expect(config.metrics.defaultLabels['service']).toBeDefined();
      expect(config.metrics.defaultLabels['version']).toBeDefined();
      expect(config.metrics.defaultLabels['environment']).toBeDefined();
    });

    it('should have valid sampler configuration', () => {
      const config = defaultObservabilityConfig;
      const validSamplerTypes = ['always_off', 'always_on', 'trace_id_ratio'];

      expect(validSamplerTypes).toContain(config.tracing.sampler.type);

      if (config.tracing.sampler.ratio !== undefined) {
        expect(typeof config.tracing.sampler.ratio).toBe('number');
        expect(config.tracing.sampler.ratio).toBeGreaterThanOrEqual(0);
        expect(config.tracing.sampler.ratio).toBeLessThanOrEqual(1);
      }
    });

    it('should have valid metrics labels', () => {
      const config = defaultObservabilityConfig;

      expect(typeof config.metrics.defaultLabels).toBe('object');
      expect(config.metrics.defaultLabels).not.toBeNull();

      // Should have at least service and environment labels
      expect(Object.keys(config.metrics.defaultLabels).length).toBeGreaterThan(0);
    });

    it('should satisfy the ObservabilityConfig interface', () => {
      const config: ObservabilityConfig = defaultObservabilityConfig;

      // This test will fail at compile time if the interface is not satisfied
      expect(config).toBeDefined();
    });
  });

  describe('ensureServiceLabels', () => {
    it('should ensure service and version labels are always present', () => {
      const config: ObservabilityConfig = {
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

      const processedConfig = ensureServiceLabels(config);

      expect(processedConfig.metrics.defaultLabels['service']).toBe('test-service');
      expect(processedConfig.metrics.defaultLabels['version']).toBe('2.0.0');
      expect(processedConfig.metrics.defaultLabels['environment']).toBe('test');
      expect(processedConfig.metrics.defaultLabels['customLabel']).toBe('customValue');
    });

    it('should override user-provided service and version labels', () => {
      const config: ObservabilityConfig = {
        ...defaultObservabilityConfig,
        metrics: {
          ...defaultObservabilityConfig.metrics,
          defaultLabels: {
            customLabel: 'customValue',
            environment: 'production',
            service: 'wrong-service', // This should be overridden
            version: '1.0.0', // This should be overridden
          },
        },
        serviceName: 'correct-service',
        serviceVersion: '3.0.0',
      };

      const processedConfig = ensureServiceLabels(config);

      // Service and version should come from top-level config, not user labels
      expect(processedConfig.metrics.defaultLabels['service']).toBe('correct-service');
      expect(processedConfig.metrics.defaultLabels['version']).toBe('3.0.0');
      // Other labels should be preserved
      expect(processedConfig.metrics.defaultLabels['environment']).toBe('production');
      expect(processedConfig.metrics.defaultLabels['customLabel']).toBe('customValue');
    });

    it('should work with empty defaultLabels', () => {
      const config: ObservabilityConfig = {
        ...defaultObservabilityConfig,
        metrics: {
          ...defaultObservabilityConfig.metrics,
          defaultLabels: {},
        },
        serviceName: 'test-service',
        serviceVersion: '1.5.0',
      };

      const processedConfig = ensureServiceLabels(config);

      expect(processedConfig.metrics.defaultLabels['service']).toBe('test-service');
      expect(processedConfig.metrics.defaultLabels['version']).toBe('1.5.0');
    });

    it('should preserve all other configuration properties', () => {
      const config: ObservabilityConfig = {
        ...defaultObservabilityConfig,
        environment: 'staging',
        logging: {
          ...defaultObservabilityConfig.logging,
          level: 'debug',
        },
        serviceName: 'test-service',
        serviceVersion: '2.0.0',
        tracing: {
          ...defaultObservabilityConfig.tracing,
          enabled: false,
        },
      };

      const processedConfig = ensureServiceLabels(config);

      // All non-metrics properties should be preserved
      expect(processedConfig.serviceName).toBe('test-service');
      expect(processedConfig.serviceVersion).toBe('2.0.0');
      expect(processedConfig.environment).toBe('staging');
      expect(processedConfig.logging.level).toBe('debug');
      expect(processedConfig.tracing.enabled).toBe(false);

      // Metrics labels should be updated
      expect(processedConfig.metrics.defaultLabels['service']).toBe('test-service');
      expect(processedConfig.metrics.defaultLabels['version']).toBe('2.0.0');
    });

    it('should work with nested metrics configuration override', () => {
      const config: ObservabilityConfig = {
        ...defaultObservabilityConfig,
        metrics: {
          defaultLabels: {
            region: 'us-east-1',
            team: 'backend',
          },
          defaultMetrics: false,
          enabled: false,
          endpoint: '/custom-metrics',
        },
        serviceName: 'nested-service',
        serviceVersion: '4.0.0',
      };

      const processedConfig = ensureServiceLabels(config);

      // Metrics config should be preserved
      expect(processedConfig.metrics.enabled).toBe(false);
      expect(processedConfig.metrics.endpoint).toBe('/custom-metrics');
      expect(processedConfig.metrics.defaultMetrics).toBe(false);

      // Labels should include service and version plus user labels
      expect(processedConfig.metrics.defaultLabels['service']).toBe('nested-service');
      expect(processedConfig.metrics.defaultLabels['version']).toBe('4.0.0');
      expect(processedConfig.metrics.defaultLabels['region']).toBe('us-east-1');
      expect(processedConfig.metrics.defaultLabels['team']).toBe('backend');
    });
  });
});
