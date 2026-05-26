export { MetricsController } from './controllers/metrics.controller.js';
export { getTraceOptions, isNoLogClassEnabled, isNoLogEnabled, isNoTraceClassEnabled, isNoTraceEnabled, isTraceClassEnabled, NoLog, NoLogClass, NoTrace, NoTraceClass, Trace, TraceClass, } from './decorators/auto-trace.decorators.js';
export type { TraceClassOptions, TraceOptions } from './decorators/auto-trace.decorators.js';
export { AutoTraceInterceptor } from './interceptors/auto-trace.interceptor.js';
export { RequestLoggingInterceptor } from './interceptors/request-logging.interceptor.js';
export { LoggerService } from './logger/logger.service.js';
export { MetricsService } from './metrics/metrics.service.js';
export { ObservabilityModule } from './observability.module.js';
export { addIgnoredRoute, getHttpRequestLoggingEnabled, getIgnoredRoutes, getServiceAttributes, getServiceEnvironment, getServiceName, getServiceVersion, isRouteIgnored, resetIgnoredRoutes, } from './sdk-core.js';
export { createSDK, startSDK, createLogProcessor, createMetricReader, createTraceExporter, createInstrumentations, createResource, createTextMapPropagator, type SDKBuilderOptions, type SpanProcessor, type MetricReader, type LogRecordProcessor, NodeSDK, } from './sdk-core.js';
export { TracingService } from './tracing/tracing.service.js';
export { addSpanAttribute, addSpanAttributes, addSpanAttributesUnsafe, addSpanAttributeUnsafe, getCurrentSpan, getCurrentSpanId, getCurrentTraceId, hasActiveSpan, isSensitiveKey, } from './utils/span-attributes.js';
export { addSensitivePatterns, configureAttributeSanitization, getSanitizationConfig } from './utils/span-attributes.js';
export type { AttributeSanitizationConfig } from './utils/span-attributes.js';
export { addSensitiveFields, getAllSensitiveFields, maskSensitiveFields } from './utils/mask-sensitive-fields.js';
export { NestJSLoggerContextInstrumentation } from './instrumentation/nestjs-logger-context.instrumentation.js';
export { VERSION, getPackageVersion } from './version.js';
//# sourceMappingURL=index.d.ts.map