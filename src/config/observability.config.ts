/**
 * Configuration for the ObservabilityModule
 * This file contains all the configuration options for the observability components
 */

export interface ArgumentSanitizationConfig {
  /**
   * Additional regex patterns to identify sensitive values
   * These will be combined with the default patterns
   * @default []
   */
  additionalSensitivePatterns: RegExp[];

  /**
   * Whether to capture arguments at all
   * @default true
   */
  enabled: boolean;

  /**
   * Object field names to extract as identifiers
   * @default ['id', 'userId', 'name', 'email', 'type', 'status']
   */
  identifierFields: string[];

  /**
   * Maximum string length before truncation
   * @default 100
   */
  maxStringLength: number;

  /**
   * Custom replacement text for redacted values
   * @default '[REDACTED]'
   */
  redactedPlaceholder: string;
}

export interface ObservabilityConfig {
  environment: string;
  logging: {
    consoleOutput: boolean;
    level: string;
    otlpExport: {
      enabled: boolean;
      endpoint: string;
    };
  };
  metrics: {
    defaultLabels: Record<string, string>;
    defaultMetrics: boolean;
    enabled: boolean;
    endpoint: string;
  };
  serviceName: string;
  serviceVersion: string;
  tracing: {
    /**
     * Configuration for argument sanitization in traces
     */
    argumentSanitization: ArgumentSanitizationConfig;
    enabled: boolean;
    exporter: {
      endpoint: string;
      headers?: Record<string, string>;
      type: 'otlp';
    };
    instrumentations: {
      // Enable all auto-instrumentations by default for maximum coverage
      autoInstrumentations: boolean;
      // Common instrumentations that might need to be disabled in certain environments
      disabled: string[];
      // Override configuration for specific instrumentations
      overrides: Record<string, Record<string, unknown>>;
    };
    sampler: {
      ratio?: number;
      type: 'always_off' | 'always_on' | 'trace_id_ratio';
    };
  };
}

/**
 * Helper function to ensure service and version are always included in metrics labels
 * This function processes the configuration to guarantee that service and version labels
 * are present, even when users provide their own defaultLabels configuration
 */
export function ensureServiceLabels(config: ObservabilityConfig): ObservabilityConfig {
  return {
    ...config,
    metrics: {
      ...config.metrics,
      defaultLabels: {
        // Start with user-provided labels
        ...config.metrics.defaultLabels,
        // Always ensure service and version are present (will override user values if provided)
        service: config.serviceName,
        version: config.serviceVersion,
      },
    },
  };
}

/**
 * Helper function to create tracing exporter configuration
 */
function createTracingExporter(): ObservabilityConfig['tracing']['exporter'] {
  const endpoint = process.env['OTLP_TRACES_ENDPOINT'] ?? 'http://localhost:4318/v1/traces';

  const config: ObservabilityConfig['tracing']['exporter'] = {
    endpoint,
    type: 'otlp',
  };

  if (process.env['OTLP_HEADERS']) {
    try {
      config.headers = JSON.parse(process.env['OTLP_HEADERS']) as Record<string, string>;
    } catch {
      // Invalid JSON, ignore headers
    }
  }

  return config;
}

/**
 * Helper function to get disabled instrumentations from environment
 */
function getDisabledInstrumentations(): string[] {
  const disabled = process.env['TRACING_DISABLED_INSTRUMENTATIONS'];
  return disabled ? disabled.split(',').map((s) => s.trim()) : [];
}

/**
 * Helper function to get instrumentation overrides from environment
 */
function getInstrumentationOverrides(): Record<string, Record<string, unknown>> {
  const overrides = process.env['TRACING_INSTRUMENTATION_OVERRIDES'];
  if (!overrides) return {};

  try {
    return JSON.parse(overrides) as Record<string, Record<string, unknown>>;
  } catch {
    return {};
  }
}

/**
 * Helper function to get sampler type from environment
 */
function getSamplerType(): 'always_off' | 'always_on' | 'trace_id_ratio' {
  const type = process.env['TRACING_SAMPLER_TYPE'];

  if (type === 'always_off' || type === 'always_on' || type === 'trace_id_ratio') {
    return type;
  }

  // Default to always_on for development, trace_id_ratio for production
  return process.env['NODE_ENV'] === 'production' ? 'trace_id_ratio' : 'always_on';
}

/**
 * Default configuration for the ObservabilityModule
 */
export const defaultObservabilityConfig: ObservabilityConfig = {
  environment: process.env['NODE_ENV'] ?? 'development',
  logging: {
    consoleOutput: true,
    level: process.env['LOG_LEVEL'] ?? 'info',
    otlpExport: {
      enabled: process.env['OTLP_LOGS_ENABLED'] === 'true',
      endpoint: process.env['OTLP_LOGS_ENDPOINT'] ?? 'http://localhost:4318/v1/logs',
    },
  },
  metrics: {
    defaultLabels: {
      environment: process.env['NODE_ENV'] ?? 'development',
      service: process.env['SERVICE_NAME'] ?? 'nestjs-service',
      version: process.env['SERVICE_VERSION'] ?? '1.0.0',
    },
    defaultMetrics: true,
    enabled: process.env['METRICS_ENABLED'] !== 'false',
    endpoint: process.env['METRICS_ENDPOINT'] ?? '/metrics',
  },

  serviceName: process.env['SERVICE_NAME'] ?? 'nestjs-service',
  serviceVersion: process.env['SERVICE_VERSION'] ?? '1.0.0',

  tracing: {
    argumentSanitization: {
      additionalSensitivePatterns: [],
      enabled: true,
      identifierFields: ['id', 'userId', 'name', 'email', 'type', 'status'],
      maxStringLength: 100,
      redactedPlaceholder: '[REDACTED]',
    },
    enabled: process.env['TRACING_ENABLED'] !== 'false',
    exporter: createTracingExporter(),
    instrumentations: {
      autoInstrumentations: true,
      disabled: getDisabledInstrumentations(),
      overrides: getInstrumentationOverrides(),
    },
    sampler: {
      ratio: process.env['TRACING_SAMPLER_RATIO'] ? parseFloat(process.env['TRACING_SAMPLER_RATIO']) : 1.0,
      type: getSamplerType(),
    },
  },
};
