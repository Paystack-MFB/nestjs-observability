export { type SDKBuilderOptions, type SpanProcessor, type MetricReader, type LogRecordProcessor, getServiceAttributes, getServiceEnvironment, getServiceName, getServiceVersion, getHttpRequestLoggingEnabled, addIgnoredRoute, getIgnoredRoutes, isRouteIgnored, resetIgnoredRoutes, createLogProcessor, createMetricReader, createTraceExporter, createInstrumentations, createResource, createTextMapPropagator, createSDK, startSDK, initializeSDK, gracefulShutdown, getSDK, setSDK, NodeSDK, } from './sdk-core';
declare function start(): void;
export { start };
export declare const sdk: import("@opentelemetry/sdk-node/build/src/sdk").NodeSDK | null;
//# sourceMappingURL=register.d.ts.map