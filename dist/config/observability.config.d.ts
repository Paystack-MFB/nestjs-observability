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
            ratio?: number;
            type: 'always_off' | 'always_on' | 'trace_id_ratio';
        };
    };
}
/**
 * Default configuration for the ObservabilityModule
 */
export declare const defaultObservabilityConfig: ObservabilityConfig;
//# sourceMappingURL=observability.config.d.ts.map