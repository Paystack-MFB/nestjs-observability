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
    enabled: boolean;
    exporter: {
      endpoint: string;
      headers?: Record<string, string>;
      type: 'otlp';
    };
    instrumentations: {
      http: boolean;
      nestJs: boolean;
      winston: boolean;
    };
    sampler: {
      ratio?: number; // Only used for trace_id_ratio type
      type: 'always_off' | 'always_on' | 'trace_id_ratio';
    };
  };
}

const getSamplerType = (): 'always_off' | 'always_on' | 'trace_id_ratio' => {
  const type = process.env['TRACING_SAMPLER_TYPE'];
  if (type === 'always_off' || type === 'always_on' || type === 'trace_id_ratio') {
    return type;
  }
  return 'always_on';
};

const createTracingExporter = (): ObservabilityConfig['tracing']['exporter'] => {
  const headers = process.env['OTLP_HEADERS'];
  const config: ObservabilityConfig['tracing']['exporter'] = {
    endpoint: process.env['OTLP_TRACES_ENDPOINT'] ?? 'http://localhost:4318/v1/traces',
    type: 'otlp',
  };

  if (headers) {
    try {
      config.headers = JSON.parse(headers) as Record<string, string>;
    } catch {
      // Invalid JSON, ignore headers
    }
  }

  return config;
};

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
    enabled: process.env['TRACING_ENABLED'] !== 'false',
    exporter: createTracingExporter(),
    instrumentations: {
      http: true,
      nestJs: true,
      winston: true,
    },
    sampler: {
      ratio: process.env['TRACING_SAMPLER_RATIO'] ? parseFloat(process.env['TRACING_SAMPLER_RATIO']) : 1.0,
      type: getSamplerType(),
    },
  },
};
