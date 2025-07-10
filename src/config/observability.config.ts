/**
 * Configuration for the ObservabilityModule
 * This file contains all the configuration options for the observability components
 */

export interface AttributeSanitizationConfig {
  /**
   * Additional regex patterns to identify sensitive attribute names
   * These will be combined with the default patterns
   * @default []
   */
  additionalSensitivePatterns: RegExp[];

  /**
   * Whether to enable attribute sanitization
   * @default true
   */
  enabled: boolean;

  /**
   * Custom replacement text for redacted values
   * @default '[REDACTED]'
   */
  redactedPlaceholder: string;
}

/**
 * ConfigService interface to avoid importing @nestjs/config in this file
 */
export interface ConfigServiceInterface {
  get<T = string>(key: string, defaultValue?: T): T;
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
     * Configuration for attribute sanitization in traces
     */
    attributeSanitization: AttributeSanitizationConfig;
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
 * Simple configuration interface for users - all optional except service name and version
 */
export interface SimpleObservabilityConfig {
  environment?: string;
  logging?: {
    consoleOutput?: boolean;
    level?: string;
    otlpExport?: {
      enabled?: boolean;
      endpoint?: string;
    };
  };
  metrics?: {
    defaultLabels?: Record<string, string>;
    defaultMetrics?: boolean;
    enabled?: boolean;
    endpoint?: string;
  };
  serviceName: string;
  serviceVersion: string;
  tracing?: {
    attributeSanitization?: {
      additionalSensitivePatterns?: RegExp[];
      enabled?: boolean;
      redactedPlaceholder?: string;
    };
    enabled?: boolean;
    exporter?: {
      endpoint?: string;
      headers?: Record<string, string>;
      type?: 'otlp';
    };
    instrumentations?: {
      autoInstrumentations?: boolean;
      disabled?: string[];
      overrides?: Record<string, Record<string, unknown>>;
    };
    sampler?: {
      ratio?: number;
      type?: 'always_off' | 'always_on' | 'trace_id_ratio';
    };
  };
}

/**
 * Single function to create complete observability configuration
 * Merges user configuration with environment variables and sensible defaults
 */
export function createObservabilityConfig(
  userConfig: Partial<SimpleObservabilityConfig> = {},
  configService: ConfigServiceInterface
): ObservabilityConfig {
  const serviceName = userConfig.serviceName ?? configService.get('SERVICE_NAME', 'nestjs-service');
  const serviceVersion = userConfig.serviceVersion ?? configService.get('SERVICE_VERSION', '1.0.0');
  const environment = userConfig.environment ?? configService.get('NODE_ENV', 'development');

  // Create headers from environment if present
  const createHeaders = (): Record<string, string> | undefined => {
    if (userConfig.tracing?.exporter?.headers) {
      return userConfig.tracing.exporter.headers;
    }

    const envHeaders = configService.get('OTLP_HEADERS');
    if (envHeaders) {
      try {
        return JSON.parse(envHeaders) as Record<string, string>;
      } catch {
        // Invalid JSON, ignore headers
      }
    }

    return undefined;
  };

  const config: ObservabilityConfig = {
    environment,
    logging: {
      consoleOutput: userConfig.logging?.consoleOutput ?? getBooleanFromEnv(configService, 'LOG_CONSOLE_OUTPUT', true),
      level: userConfig.logging?.level ?? configService.get('LOG_LEVEL', 'info'),
      otlpExport: {
        enabled:
          userConfig.logging?.otlpExport?.enabled ?? getBooleanFromEnv(configService, 'OTLP_LOGS_ENABLED', false),
        endpoint:
          userConfig.logging?.otlpExport?.endpoint ??
          configService.get('OTLP_LOGS_ENDPOINT', 'http://localhost:4318/v1/logs'),
      },
    },
    metrics: {
      defaultLabels: {
        environment,
        service: serviceName,
        version: serviceVersion,
        ...userConfig.metrics?.defaultLabels,
      },
      defaultMetrics:
        userConfig.metrics?.defaultMetrics ?? getBooleanFromEnv(configService, 'METRICS_DEFAULT_ENABLED', true),
      enabled: userConfig.metrics?.enabled ?? getBooleanFromEnv(configService, 'METRICS_ENABLED', true),
      endpoint: userConfig.metrics?.endpoint ?? configService.get('METRICS_ENDPOINT', '/metrics'),
    },

    serviceName,

    serviceVersion,

    tracing: {
      attributeSanitization: {
        additionalSensitivePatterns: userConfig.tracing?.attributeSanitization?.additionalSensitivePatterns ?? [],
        enabled:
          userConfig.tracing?.attributeSanitization?.enabled ??
          getBooleanFromEnv(configService, 'TRACING_SANITIZATION_ENABLED', true),
        redactedPlaceholder:
          userConfig.tracing?.attributeSanitization?.redactedPlaceholder ??
          configService.get('TRACING_REDACTED_PLACEHOLDER', '[REDACTED]'),
      },
      enabled: userConfig.tracing?.enabled ?? getBooleanFromEnv(configService, 'TRACING_ENABLED', true),
      exporter: {
        endpoint:
          userConfig.tracing?.exporter?.endpoint ??
          configService.get('OTLP_TRACES_ENDPOINT', 'http://localhost:4318/v1/traces'),
        type: userConfig.tracing?.exporter?.type ?? 'otlp',
        ...(() => {
          const headers = createHeaders();
          return headers ? { headers } : {};
        })(),
      },
      instrumentations: {
        autoInstrumentations:
          userConfig.tracing?.instrumentations?.autoInstrumentations ??
          getBooleanFromEnv(configService, 'TRACING_AUTO_INSTRUMENTATIONS', true),
        disabled: [
          ...getDisabledInstrumentations(configService),
          ...(userConfig.tracing?.instrumentations?.disabled ?? []),
        ],
        overrides: {
          ...getInstrumentationOverrides(configService),
          ...userConfig.tracing?.instrumentations?.overrides,
        },
      },
      sampler: {
        type: userConfig.tracing?.sampler?.type ?? getSamplerType(configService),
        ...(() => {
          const userRatio = userConfig.tracing?.sampler?.ratio;
          const envRatio = configService.get('TRACING_SAMPLER_RATIO');

          if (userRatio !== undefined) {
            return { ratio: userRatio };
          }

          if (envRatio) {
            return { ratio: parseFloat(envRatio) };
          }

          // Default ratio based on environment
          return { ratio: environment === 'production' ? 0.1 : 1.0 };
        })(),
      },
    },
  };

  return config;
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
 * Helper function to parse boolean from environment variables
 */
function getBooleanFromEnv(configService: ConfigServiceInterface, key: string, defaultValue: boolean): boolean {
  const value = configService.get(key);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultValue;
}

/**
 * Helper function to get disabled instrumentations from environment
 */
function getDisabledInstrumentations(configService: ConfigServiceInterface): string[] {
  const disabled = configService.get('TRACING_DISABLED_INSTRUMENTATIONS');
  return disabled ? disabled.split(',').map((s) => s.trim()) : [];
}

/**
 * Helper function to get instrumentation overrides from environment
 */
function getInstrumentationOverrides(configService: ConfigServiceInterface): Record<string, Record<string, unknown>> {
  const overrides = configService.get('TRACING_INSTRUMENTATION_OVERRIDES');
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
function getSamplerType(configService: ConfigServiceInterface): 'always_off' | 'always_on' | 'trace_id_ratio' {
  const type = configService.get('TRACING_SAMPLER_TYPE');

  if (type === 'always_off' || type === 'always_on' || type === 'trace_id_ratio') {
    return type;
  }

  // Default to always_on for development, trace_id_ratio for production
  return configService.get('NODE_ENV') === 'production' ? 'trace_id_ratio' : 'always_on';
}
