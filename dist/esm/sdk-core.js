import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { envDetector, hostDetector, osDetector, resourceFromAttributes, serviceInstanceIdDetector, } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, ConsoleLogRecordExporter } from '@opentelemetry/sdk-logs';
import { ConsoleMetricExporter, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { JSONStdoutLogExporter } from './exporters/json-log-exporter.js';
import { NestJSLoggerContextInstrumentation } from './instrumentation/nestjs-logger-context.instrumentation.js';
import { TagPropagator } from './propagation/tag-propagator.js';
let sdk = null;
export function getServiceAttributes() {
    return {
        'instrumentation.type': 'manual',
        'service.environment': getServiceEnvironment(),
        'service.name': getServiceName(),
        'service.version': getServiceVersion(),
    };
}
export function getServiceEnvironment() {
    return process.env['OTEL_SERVICE_ENV'] ?? 'local';
}
export function getServiceName() {
    return process.env['OTEL_SERVICE_NAME'] ?? 'unknown-service';
}
export function getServiceVersion() {
    return process.env['OTEL_SERVICE_VERSION'] ?? '1.0.0';
}
export function getHttpRequestLoggingEnabled() {
    const value = process.env['OTEL_LOG_HTTP_REQUESTS'];
    return value === 'true' || value === '1';
}
const ignoredRoutes = new Set();
function normalizeRoutePath(route) {
    let normalized = route.startsWith('/') ? route : '/' + route;
    if (normalized.length > 1 && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }
    return normalized;
}
export function addIgnoredRoute(route) {
    const normalized = normalizeRoutePath(route);
    if (normalized === '/') {
        console.warn('addIgnoredRoute: root path "/" rejected to avoid suppressing all HTTP traces');
        return;
    }
    ignoredRoutes.add(normalized);
}
export function getIgnoredRoutes() {
    return ignoredRoutes;
}
export function resetIgnoredRoutes() {
    ignoredRoutes.clear();
}
export function isRouteIgnored(requestUrl) {
    for (const route of ignoredRoutes) {
        if (requestUrl === route || requestUrl.startsWith(route + '/') || requestUrl.startsWith(route + '?')) {
            return true;
        }
    }
    return false;
}
function parseOtlpHeaders(headersString) {
    if (!headersString) {
        return {};
    }
    const headers = {};
    const pairs = headersString.split(',');
    for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
            headers[key.trim()] = value.trim();
        }
    }
    return headers;
}
function createSingleLogProcessor(exporterType) {
    switch (exporterType.trim()) {
        case 'json':
            try {
                return new BatchLogRecordProcessor(new JSONStdoutLogExporter());
            }
            catch (error) {
                console.warn('Failed to create JSON log processor, logs will not be exported:', error);
                return undefined;
            }
        case 'otlp':
            try {
                const endpoint = process.env['OTEL_EXPORTER_OTLP_LOGS_ENDPOINT'] ??
                    process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ??
                    'http://localhost:4318/v1/logs';
                const headers = parseOtlpHeaders(process.env['OTEL_EXPORTER_OTLP_LOGS_HEADERS'] ?? process.env['OTEL_EXPORTER_OTLP_HEADERS']);
                return new BatchLogRecordProcessor(new OTLPLogExporter({
                    headers,
                    url: endpoint,
                }));
            }
            catch (error) {
                console.warn('Failed to create OTLP log processor, logs will not be exported:', error);
                return undefined;
            }
        case 'console':
            try {
                return new BatchLogRecordProcessor(new ConsoleLogRecordExporter());
            }
            catch (error) {
                console.warn('Failed to create console log processor, logs will not be exported:', error);
                return undefined;
            }
        default:
            return undefined;
    }
}
export function createLogProcessor() {
    const exporterEnv = process.env['OTEL_LOGS_EXPORTER'] ?? 'console';
    const exporterTypes = exporterEnv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (exporterTypes.length === 1) {
        return createSingleLogProcessor(exporterTypes[0]);
    }
    const processors = exporterTypes
        .map((t) => createSingleLogProcessor(t))
        .filter((p) => p !== undefined);
    if (processors.length === 0)
        return undefined;
    if (processors.length === 1)
        return processors[0];
    const [primary, ...rest] = processors;
    const originalOnEmit = primary.onEmit.bind(primary);
    primary.onEmit = (logRecord) => {
        originalOnEmit(logRecord);
        for (const p of rest)
            p.onEmit(logRecord);
    };
    return primary;
}
export function createMetricReader() {
    const exporterType = process.env['OTEL_METRICS_EXPORTER'] ?? 'console';
    switch (exporterType) {
        case 'none':
            return undefined;
        case 'otlp':
            try {
                const endpoint = process.env['OTEL_EXPORTER_OTLP_METRICS_ENDPOINT'] ??
                    process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ??
                    'http://localhost:4318/v1/metrics';
                const headers = parseOtlpHeaders(process.env['OTEL_EXPORTER_OTLP_METRICS_HEADERS'] ?? process.env['OTEL_EXPORTER_OTLP_HEADERS']);
                const exportIntervalMillis = parseInt(process.env['OTEL_METRIC_EXPORT_INTERVAL'] ?? '10000', 10);
                const defaultTimeoutMillis = Math.min(exportIntervalMillis - 1000, 5000);
                const exportTimeoutMillis = parseInt(process.env['OTEL_METRIC_EXPORT_TIMEOUT'] ?? defaultTimeoutMillis.toString(), 10);
                if (process.env['NODE_ENV'] === 'test') {
                    return new PeriodicExportingMetricReader({
                        exporter: new OTLPMetricExporter({
                            headers,
                            url: endpoint,
                        }),
                        exportIntervalMillis,
                    });
                }
                return new PeriodicExportingMetricReader({
                    exporter: new OTLPMetricExporter({
                        headers,
                        url: endpoint,
                    }),
                    exportIntervalMillis,
                    exportTimeoutMillis: Math.min(exportTimeoutMillis, exportIntervalMillis - 100),
                });
            }
            catch (error) {
                console.warn('Failed to create OTLP metric exporter, falling back to console:', error);
                return new PeriodicExportingMetricReader({
                    exporter: new ConsoleMetricExporter(),
                    exportIntervalMillis: 10000,
                    exportTimeoutMillis: 5000,
                });
            }
        case 'console':
        default:
            if (process.env['NODE_ENV'] === 'test') {
                return new PeriodicExportingMetricReader({
                    exporter: new ConsoleMetricExporter(),
                    exportIntervalMillis: 10000,
                });
            }
            return new PeriodicExportingMetricReader({
                exporter: new ConsoleMetricExporter(),
                exportIntervalMillis: 10000,
                exportTimeoutMillis: 5000,
            });
    }
}
export function createTraceExporter() {
    const exporterType = process.env['OTEL_TRACES_EXPORTER'] ?? 'console';
    switch (exporterType) {
        case 'none':
            return undefined;
        case 'otlp':
            try {
                const endpoint = process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'] ??
                    process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ??
                    'http://localhost:4318/v1/traces';
                const headers = parseOtlpHeaders(process.env['OTEL_EXPORTER_OTLP_TRACES_HEADERS'] ?? process.env['OTEL_EXPORTER_OTLP_HEADERS']);
                return new OTLPTraceExporter({
                    headers,
                    url: endpoint,
                });
            }
            catch (error) {
                console.warn('Failed to create OTLP trace exporter, falling back to console:', error);
                return new ConsoleSpanExporter();
            }
        case 'console':
        default:
            return new ConsoleSpanExporter();
    }
}
export function createInstrumentations() {
    const customInstrumentation = (() => {
        try {
            return new NestJSLoggerContextInstrumentation();
        }
        catch {
            return undefined;
        }
    })();
    const autoInstrumentations = getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
            ignoreIncomingRequestHook: (request) => isRouteIgnored(request.url ?? ''),
        },
    });
    return customInstrumentation
        ? [customInstrumentation, ...autoInstrumentations]
        : autoInstrumentations;
}
export function createResource() {
    return resourceFromAttributes({
        [ATTR_SERVICE_NAME]: getServiceName(),
        [ATTR_SERVICE_VERSION]: getServiceVersion(),
        'service.environment': getServiceEnvironment(),
    });
}
export function createTextMapPropagator() {
    return new CompositePropagator({
        propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator(), new TagPropagator()],
    });
}
export async function gracefulShutdown(signal) {
    console.log(`Received ${signal}, shutting down OpenTelemetry SDK gracefully...`);
    if (sdk) {
        try {
            await sdk.shutdown();
            console.log('OpenTelemetry SDK shutdown completed');
        }
        catch (error) {
            console.error('Error during OpenTelemetry SDK shutdown:', error);
        }
    }
    process.exit(0);
}
export function initializeSDK(options) {
    const customSpanProcessors = options?.spanProcessors ?? [];
    const spanProcessors = [...customSpanProcessors];
    if (options?.includeDefaultTraceExporter !== false) {
        const traceExporter = createTraceExporter();
        if (traceExporter) {
            spanProcessors.push(new BatchSpanProcessor(traceExporter));
        }
    }
    const metricReader = options?.metricReader ?? createMetricReader();
    const logRecordProcessor = options?.logRecordProcessors ??
        (() => {
            const defaultProcessor = createLogProcessor();
            return defaultProcessor ? [defaultProcessor] : [];
        })();
    const resource = createResource();
    const instrumentations = createInstrumentations();
    const textMapPropagator = createTextMapPropagator();
    const sdkConfig = {
        instrumentations,
        resource,
        resourceDetectors: [envDetector, hostDetector, osDetector, serviceInstanceIdDetector],
        textMapPropagator,
    };
    if (spanProcessors.length > 0) {
        sdkConfig.spanProcessors = spanProcessors;
    }
    else {
        const traceExporter = createTraceExporter();
        if (traceExporter) {
            sdkConfig.traceExporter = traceExporter;
        }
    }
    const metricsExporterEnv = process.env['OTEL_METRICS_EXPORTER'];
    if (metricsExporterEnv !== 'otlp' && metricReader) {
        sdkConfig.metricReader = metricReader;
    }
    if (logRecordProcessor.length > 0 && process.env['NODE_ENV'] !== 'test') {
        sdkConfig.logRecordProcessors = logRecordProcessor;
    }
    const normalizedConfig = {
        instrumentations: sdkConfig.instrumentations ?? [],
        ...(sdkConfig.resource ? { resource: sdkConfig.resource } : {}),
        ...(sdkConfig.resourceDetectors ? { resourceDetectors: sdkConfig.resourceDetectors } : {}),
        ...(sdkConfig.textMapPropagator ? { textMapPropagator: sdkConfig.textMapPropagator } : {}),
        ...(sdkConfig.spanProcessors ? { spanProcessors: sdkConfig.spanProcessors } : {}),
        ...(sdkConfig.traceExporter ? { traceExporter: sdkConfig.traceExporter } : {}),
        ...(sdkConfig.metricReader ? { metricReader: sdkConfig.metricReader } : {}),
        ...(sdkConfig.logRecordProcessors ? { logRecordProcessors: sdkConfig.logRecordProcessors } : {}),
    };
    const sdkInstance = new NodeSDK(normalizedConfig);
    return sdkInstance;
}
export function createSDK(options) {
    if (sdk) {
        console.warn('OpenTelemetry SDK already initialized. Returning existing instance.');
        return sdk;
    }
    sdk = initializeSDK(options);
    return sdk;
}
export function startSDK(options) {
    const sdkInstance = createSDK(options);
    const candidate = sdkInstance;
    if (typeof candidate.start === 'function') {
        candidate.start();
    }
    if (options?.registerShutdownHandlers !== false) {
        process.on('SIGTERM', () => {
            void gracefulShutdown('SIGTERM');
        });
        process.on('SIGINT', () => {
            void gracefulShutdown('SIGINT');
        });
    }
    return sdkInstance;
}
export function getSDK() {
    return sdk;
}
export function setSDK(sdkInstance) {
    sdk = sdkInstance;
}
export { NodeSDK } from '@opentelemetry/sdk-node';
//# sourceMappingURL=sdk-core.js.map