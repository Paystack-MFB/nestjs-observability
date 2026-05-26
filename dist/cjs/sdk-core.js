"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeSDK = void 0;
exports.getServiceAttributes = getServiceAttributes;
exports.getServiceEnvironment = getServiceEnvironment;
exports.getServiceName = getServiceName;
exports.getServiceVersion = getServiceVersion;
exports.getHttpRequestLoggingEnabled = getHttpRequestLoggingEnabled;
exports.addIgnoredRoute = addIgnoredRoute;
exports.getIgnoredRoutes = getIgnoredRoutes;
exports.resetIgnoredRoutes = resetIgnoredRoutes;
exports.isRouteIgnored = isRouteIgnored;
exports.createLogProcessor = createLogProcessor;
exports.createMetricReader = createMetricReader;
exports.createTraceExporter = createTraceExporter;
exports.createInstrumentations = createInstrumentations;
exports.createResource = createResource;
exports.createTextMapPropagator = createTextMapPropagator;
exports.gracefulShutdown = gracefulShutdown;
exports.initializeSDK = initializeSDK;
exports.createSDK = createSDK;
exports.startSDK = startSDK;
exports.getSDK = getSDK;
exports.setSDK = setSDK;
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const core_1 = require("@opentelemetry/core");
const exporter_logs_otlp_http_1 = require("@opentelemetry/exporter-logs-otlp-http");
const exporter_metrics_otlp_http_1 = require("@opentelemetry/exporter-metrics-otlp-http");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const resources_1 = require("@opentelemetry/resources");
const sdk_logs_1 = require("@opentelemetry/sdk-logs");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const sdk_node_1 = require("@opentelemetry/sdk-node");
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const json_log_exporter_1 = require("./exporters/json-log-exporter");
const nestjs_logger_context_instrumentation_1 = require("./instrumentation/nestjs-logger-context.instrumentation");
const tag_propagator_1 = require("./propagation/tag-propagator");
let sdk = null;
function getServiceAttributes() {
    return {
        'instrumentation.type': 'manual',
        'service.environment': getServiceEnvironment(),
        'service.name': getServiceName(),
        'service.version': getServiceVersion(),
    };
}
function getServiceEnvironment() {
    return process.env['OTEL_SERVICE_ENV'] ?? 'local';
}
function getServiceName() {
    return process.env['OTEL_SERVICE_NAME'] ?? 'unknown-service';
}
function getServiceVersion() {
    return process.env['OTEL_SERVICE_VERSION'] ?? '1.0.0';
}
function getHttpRequestLoggingEnabled() {
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
function addIgnoredRoute(route) {
    const normalized = normalizeRoutePath(route);
    if (normalized === '/') {
        console.warn('addIgnoredRoute: root path "/" rejected to avoid suppressing all HTTP traces');
        return;
    }
    ignoredRoutes.add(normalized);
}
function getIgnoredRoutes() {
    return ignoredRoutes;
}
function resetIgnoredRoutes() {
    ignoredRoutes.clear();
}
function isRouteIgnored(requestUrl) {
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
                return new sdk_logs_1.BatchLogRecordProcessor(new json_log_exporter_1.JSONStdoutLogExporter());
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
                return new sdk_logs_1.BatchLogRecordProcessor(new exporter_logs_otlp_http_1.OTLPLogExporter({
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
                return new sdk_logs_1.BatchLogRecordProcessor(new sdk_logs_1.ConsoleLogRecordExporter());
            }
            catch (error) {
                console.warn('Failed to create console log processor, logs will not be exported:', error);
                return undefined;
            }
        default:
            return undefined;
    }
}
function createLogProcessor() {
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
function createMetricReader() {
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
                    return new sdk_metrics_1.PeriodicExportingMetricReader({
                        exporter: new exporter_metrics_otlp_http_1.OTLPMetricExporter({
                            headers,
                            url: endpoint,
                        }),
                        exportIntervalMillis,
                    });
                }
                return new sdk_metrics_1.PeriodicExportingMetricReader({
                    exporter: new exporter_metrics_otlp_http_1.OTLPMetricExporter({
                        headers,
                        url: endpoint,
                    }),
                    exportIntervalMillis,
                    exportTimeoutMillis: Math.min(exportTimeoutMillis, exportIntervalMillis - 100),
                });
            }
            catch (error) {
                console.warn('Failed to create OTLP metric exporter, falling back to console:', error);
                return new sdk_metrics_1.PeriodicExportingMetricReader({
                    exporter: new sdk_metrics_1.ConsoleMetricExporter(),
                    exportIntervalMillis: 10000,
                    exportTimeoutMillis: 5000,
                });
            }
        case 'console':
        default:
            if (process.env['NODE_ENV'] === 'test') {
                return new sdk_metrics_1.PeriodicExportingMetricReader({
                    exporter: new sdk_metrics_1.ConsoleMetricExporter(),
                    exportIntervalMillis: 10000,
                });
            }
            return new sdk_metrics_1.PeriodicExportingMetricReader({
                exporter: new sdk_metrics_1.ConsoleMetricExporter(),
                exportIntervalMillis: 10000,
                exportTimeoutMillis: 5000,
            });
    }
}
function createTraceExporter() {
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
                return new exporter_trace_otlp_http_1.OTLPTraceExporter({
                    headers,
                    url: endpoint,
                });
            }
            catch (error) {
                console.warn('Failed to create OTLP trace exporter, falling back to console:', error);
                return new sdk_trace_node_1.ConsoleSpanExporter();
            }
        case 'console':
        default:
            return new sdk_trace_node_1.ConsoleSpanExporter();
    }
}
function createInstrumentations() {
    const customInstrumentation = (() => {
        try {
            return new nestjs_logger_context_instrumentation_1.NestJSLoggerContextInstrumentation();
        }
        catch {
            return undefined;
        }
    })();
    const autoInstrumentations = (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
        '@opentelemetry/instrumentation-http': {
            ignoreIncomingRequestHook: (request) => isRouteIgnored(request.url ?? ''),
        },
    });
    return customInstrumentation
        ? [customInstrumentation, ...autoInstrumentations]
        : autoInstrumentations;
}
function createResource() {
    return (0, resources_1.resourceFromAttributes)({
        [semantic_conventions_1.ATTR_SERVICE_NAME]: getServiceName(),
        [semantic_conventions_1.ATTR_SERVICE_VERSION]: getServiceVersion(),
        'service.environment': getServiceEnvironment(),
    });
}
function createTextMapPropagator() {
    return new core_1.CompositePropagator({
        propagators: [new core_1.W3CTraceContextPropagator(), new core_1.W3CBaggagePropagator(), new tag_propagator_1.TagPropagator()],
    });
}
async function gracefulShutdown(signal) {
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
function initializeSDK(options) {
    const customSpanProcessors = options?.spanProcessors ?? [];
    const spanProcessors = [...customSpanProcessors];
    if (options?.includeDefaultTraceExporter !== false) {
        const traceExporter = createTraceExporter();
        if (traceExporter) {
            spanProcessors.push(new sdk_trace_node_1.BatchSpanProcessor(traceExporter));
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
        resourceDetectors: [resources_1.envDetector, resources_1.hostDetector, resources_1.osDetector, resources_1.serviceInstanceIdDetector],
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
    const sdkInstance = new sdk_node_1.NodeSDK(normalizedConfig);
    return sdkInstance;
}
function createSDK(options) {
    if (sdk) {
        console.warn('OpenTelemetry SDK already initialized. Returning existing instance.');
        return sdk;
    }
    sdk = initializeSDK(options);
    return sdk;
}
function startSDK(options) {
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
function getSDK() {
    return sdk;
}
function setSDK(sdkInstance) {
    sdk = sdkInstance;
}
var sdk_node_2 = require("@opentelemetry/sdk-node");
Object.defineProperty(exports, "NodeSDK", { enumerable: true, get: function () { return sdk_node_2.NodeSDK; } });
//# sourceMappingURL=sdk-core.js.map