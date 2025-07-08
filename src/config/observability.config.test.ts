import { describe, expect, it } from 'vitest';

import { defaultObservabilityConfig, type ObservabilityConfig } from './observability.config';

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
      expect(typeof config.logging.structuredLogging).toBe('boolean');
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
});
