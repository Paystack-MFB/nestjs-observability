/**
 * Configuration for the ObservabilityModule
 * This file contains all the configuration options for the observability components
 */
export interface ObservabilityConfig {
  environment: string;
  logging: {
    consoleOutput: boolean;
    level: string;
    otlpExport: {
      enabled: boolean;
      endpoint: string;
    };
    structuredLogging: boolean;
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
    // Auto-instrumentation settings for classes and methods
    autoInstrumentation: {
      // Whether to capture method arguments
      captureArguments: boolean;
      enabled: boolean;
      // Classes to exclude
      excludeClasses: string[];
      // Methods to exclude from tracing
      excludeMethods: string[];
      // Classes to include (empty array means all classes)
      includeClasses: string[];
      // Whether to trace private methods
      tracePrivateMethods: boolean;
    };
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
 * Helper function to get auto-instrumentation configuration
 */
function getAutoInstrumentationConfig(): ObservabilityConfig['tracing']['autoInstrumentation'] {
  return {
    captureArguments: process.env['TRACING_CAPTURE_ARGUMENTS'] !== 'false',
    enabled: process.env['TRACING_AUTO_INSTRUMENT_CLASSES'] !== 'false',
    excludeClasses: process.env['TRACING_EXCLUDE_CLASSES']
      ? process.env['TRACING_EXCLUDE_CLASSES'].split(',')
      : ['LoggerService', 'MetricsService', 'TracingService', 'AutoInstrumentationService'],
    excludeMethods: process.env['TRACING_EXCLUDE_METHODS']
      ? process.env['TRACING_EXCLUDE_METHODS'].split(',')
      : ['constructor', 'onModuleInit', 'onModuleDestroy', 'onApplicationBootstrap', 'onApplicationShutdown'],
    includeClasses: process.env['TRACING_INCLUDE_CLASSES'] ? process.env['TRACING_INCLUDE_CLASSES'].split(',') : [],
    tracePrivateMethods: process.env['TRACING_TRACE_PRIVATE_METHODS'] === 'true',
  };
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
    structuredLogging: process.env['NODE_ENV'] === 'production',
  },
  metrics: {
    defaultLabels: {
      environment: process.env['NODE_ENV'] ?? 'development',
      service: process.env['SERVICE_NAME'] ?? 'nestjs-service',
    },
    defaultMetrics: true,
    enabled: process.env['METRICS_ENABLED'] !== 'false',
    endpoint: process.env['METRICS_ENDPOINT'] ?? '/metrics',
  },

  serviceName: process.env['SERVICE_NAME'] ?? 'nestjs-service',

  serviceVersion: '1.0.0',

  tracing: {
    autoInstrumentation: getAutoInstrumentationConfig(),
    enabled: process.env['TRACING_ENABLED'] !== 'false',
    exporter: createTracingExporter(),
    instrumentations: {
      // Enable all auto-instrumentations by default for maximum coverage
      autoInstrumentations: process.env['TRACING_AUTO_INSTRUMENTATIONS'] !== 'false',
      // Common instrumentations that might need to be disabled in certain environments
      disabled: getDisabledInstrumentations(),
      // Override configuration for specific instrumentations
      overrides: getInstrumentationOverrides(),
    },
    sampler: {
      ratio: process.env['TRACING_SAMPLER_RATIO'] ? parseFloat(process.env['TRACING_SAMPLER_RATIO']) : 1.0,
      type: getSamplerType(),
    },
  },
};
