const getSamplerType = () => {
    const type = process.env['TRACING_SAMPLER_TYPE'];
    if (type === 'always_off' || type === 'always_on' || type === 'trace_id_ratio') {
        return type;
    }
    return 'always_on';
};
const createTracingExporter = () => {
    const headers = process.env['OTLP_HEADERS'];
    const config = {
        endpoint: process.env['OTLP_TRACES_ENDPOINT'] ?? 'http://localhost:4318/v1/traces',
        type: 'otlp',
    };
    if (headers) {
        try {
            config.headers = JSON.parse(headers);
        }
        catch {
            // Invalid JSON, ignore headers
        }
    }
    return config;
};
/**
 * Default configuration for the ObservabilityModule
 */
export const defaultObservabilityConfig = {
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
//# sourceMappingURL=observability.config.js.map