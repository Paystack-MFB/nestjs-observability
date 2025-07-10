import { describe, expect, it } from 'vitest';

import {
  type ConfigServiceInterface,
  createObservabilityConfig,
  ensureServiceLabels,
  type ObservabilityConfig,
} from './observability.config';

// Mock ConfigService
const mockConfigService: ConfigServiceInterface = {
  get: <T = string>(key: string, defaultValue?: T): T => {
    // Return default values for environment variables
    const envValues: Record<string, string> = {
      LOGGING_LEVEL: 'info',
      METRICS_ENABLED: 'true',
      METRICS_ENDPOINT: '/metrics',
      NODE_ENV: 'test',
      OTLP_TRACES_ENDPOINT: 'http://localhost:4318/v1/traces',
      SERVICE_NAME: 'test-service',
      SERVICE_VERSION: '1.0.0',
      TRACING_ENABLED: 'true',
    };
    return (envValues[key] || defaultValue) as T;
  },
};

describe('ObservabilityConfig', () => {
  describe('createObservabilityConfig', () => {
    it('should create correct default structure', () => {
      const config = createObservabilityConfig(
        {
          environment: 'test',
          serviceName: 'test-service',
          serviceVersion: '1.0.0',
        },
        mockConfigService
      );

      // Test basic service info
      expect(config.serviceName).toBe('test-service');
      expect(config.serviceVersion).toBe('1.0.0');
      expect(config.environment).toBe('test');

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

    it('should use environment variables for configuration', () => {
      const config = createObservabilityConfig(
        {
          environment: 'production',
          serviceName: 'env-test-service',
          serviceVersion: '2.0.0',
        },
        mockConfigService
      );

      // Should have values from config or environment
      expect(config.serviceVersion).toBe('2.0.0');
      expect(typeof config.serviceVersion).toBe('string');
    });

    it('should have service and version in metrics.defaultLabels', () => {
      const config = createObservabilityConfig(
        {
          environment: 'staging',
          serviceName: 'label-service',
          serviceVersion: '3.0.0',
        },
        mockConfigService
      );

      expect(config.metrics.defaultLabels['service']).toBe('label-service');
      expect(config.metrics.defaultLabels['version']).toBe('3.0.0');
      expect(config.metrics.defaultLabels['environment']).toBe('staging');
    });

    it('should have valid sampler configuration', () => {
      const config = createObservabilityConfig(
        {
          environment: 'test',
          serviceName: 'sampler-service',
          serviceVersion: '1.0.0',
        },
        mockConfigService
      );

      const validSamplerTypes = ['always_off', 'always_on', 'trace_id_ratio'];
      expect(validSamplerTypes).toContain(config.tracing.sampler.type);

      if (config.tracing.sampler.ratio !== undefined) {
        expect(typeof config.tracing.sampler.ratio).toBe('number');
        expect(config.tracing.sampler.ratio).toBeGreaterThanOrEqual(0);
        expect(config.tracing.sampler.ratio).toBeLessThanOrEqual(1);
      }
    });

    it('should have valid metrics labels', () => {
      const config = createObservabilityConfig(
        {
          environment: 'test',
          serviceName: 'metrics-service',
          serviceVersion: '1.0.0',
        },
        mockConfigService
      );

      expect(typeof config.metrics.defaultLabels).toBe('object');
      expect(config.metrics.defaultLabels).not.toBeNull();

      // Should have at least service and environment labels
      expect(Object.keys(config.metrics.defaultLabels).length).toBeGreaterThan(0);
    });

    it('should satisfy the ObservabilityConfig interface', () => {
      const config: ObservabilityConfig = createObservabilityConfig(
        {
          environment: 'test',
          serviceName: 'interface-service',
          serviceVersion: '1.0.0',
        },
        mockConfigService
      );

      // This test will fail at compile time if the interface is not satisfied
      expect(config).toBeDefined();
    });
  });

  describe('ensureServiceLabels', () => {
    it('should ensure service and version labels are always present', () => {
      const config: ObservabilityConfig = createObservabilityConfig(
        {
          environment: 'test',
          serviceName: 'test-service',
          serviceVersion: '2.0.0',
        },
        mockConfigService
      );

      // Override some labels
      config.metrics.defaultLabels = {
        customLabel: 'customValue',
        environment: 'test',
      };

      const processedConfig = ensureServiceLabels(config);

      expect(processedConfig.metrics.defaultLabels['service']).toBe('test-service');
      expect(processedConfig.metrics.defaultLabels['version']).toBe('2.0.0');
      expect(processedConfig.metrics.defaultLabels['environment']).toBe('test');
      expect(processedConfig.metrics.defaultLabels['customLabel']).toBe('customValue');
    });

    it('should override user-provided service and version labels', () => {
      const config: ObservabilityConfig = createObservabilityConfig(
        {
          environment: 'production',
          serviceName: 'correct-service',
          serviceVersion: '3.0.0',
        },
        mockConfigService
      );

      // Override labels with wrong values
      config.metrics.defaultLabels = {
        customLabel: 'customValue',
        environment: 'production',
        service: 'wrong-service', // This should be overridden
        version: '1.0.0', // This should be overridden
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
      const config: ObservabilityConfig = createObservabilityConfig(
        {
          environment: 'test',
          serviceName: 'test-service',
          serviceVersion: '1.5.0',
        },
        mockConfigService
      );

      config.metrics.defaultLabels = {};

      const processedConfig = ensureServiceLabels(config);

      expect(processedConfig.metrics.defaultLabels['service']).toBe('test-service');
      expect(processedConfig.metrics.defaultLabels['version']).toBe('1.5.0');
    });

    it('should preserve all other configuration properties', () => {
      const config: ObservabilityConfig = createObservabilityConfig(
        {
          environment: 'staging',
          serviceName: 'test-service',
          serviceVersion: '2.0.0',
        },
        mockConfigService
      );

      // Override some properties
      config.environment = 'staging';
      config.logging.level = 'debug';
      config.tracing.enabled = false;

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
      const config: ObservabilityConfig = createObservabilityConfig(
        {
          environment: 'test',
          serviceName: 'nested-service',
          serviceVersion: '4.0.0',
        },
        mockConfigService
      );

      // Override metrics config
      config.metrics = {
        defaultLabels: {
          region: 'us-east-1',
          team: 'backend',
        },
        defaultMetrics: false,
        enabled: false,
        endpoint: '/custom-metrics',
      };

      const processedConfig = ensureServiceLabels(config);

      // Metrics config should be preserved
      expect(processedConfig.metrics.enabled).toBe(false);
      expect(processedConfig.metrics.endpoint).toBe('/custom-metrics');
      expect(processedConfig.metrics.defaultMetrics).toBe(false);

      // Labels should be updated with service info
      expect(processedConfig.metrics.defaultLabels['service']).toBe('nested-service');
      expect(processedConfig.metrics.defaultLabels['version']).toBe('4.0.0');
      expect(processedConfig.metrics.defaultLabels['region']).toBe('us-east-1');
      expect(processedConfig.metrics.defaultLabels['team']).toBe('backend');
    });
  });
});
