export { MetricsController } from './controllers/metrics.controller';
export { getTraceOptions, isNoLogClassEnabled, isNoLogEnabled, isNoTraceClassEnabled, isNoTraceEnabled, isTraceClassEnabled, NoLog, NoLogClass, NoTrace, NoTraceClass, Trace, TraceClass, } from './decorators/auto-trace.decorators';
export type { TraceClassOptions, TraceOptions } from './decorators/auto-trace.decorators';
export { AutoTraceInterceptor } from './interceptors/auto-trace.interceptor';
export { RequestLoggingInterceptor } from './interceptors/request-logging.interceptor';
export { LoggerService } from './logger/logger.service';
export { MetricsService } from './metrics/metrics.service';
export { ObservabilityModule } from './observability.module';
export { addIgnoredRoute, getHttpRequestLoggingEnabled, getIgnoredRoutes, getServiceAttributes, getServiceEnvironment, getServiceName, getServiceVersion, isRouteIgnored, resetIgnoredRoutes, } from './sdk-core';
export { createSDK, startSDK, createLogProcessor, createMetricReader, createTraceExporter, createInstrumentations, createResource, createTextMapPropagator, type SDKBuilderOptions, type SpanProcessor, type MetricReader, type LogRecordProcessor, NodeSDK, } from './sdk-core';
export { TracingService } from './tracing/tracing.service';
export { addSpanAttribute, addSpanAttributes, addSpanAttributesUnsafe, addSpanAttributeUnsafe, getCurrentSpan, getCurrentSpanId, getCurrentTraceId, hasActiveSpan, isSensitiveKey, } from './utils/span-attributes';
export { addSensitivePatterns, configureAttributeSanitization, getSanitizationConfig } from './utils/span-attributes';
export type { AttributeSanitizationConfig } from './utils/span-attributes';
export { addSensitiveFields, getAllSensitiveFields, maskSensitiveFields } from './utils/mask-sensitive-fields';
export { NestJSLoggerContextInstrumentation } from './instrumentation/nestjs-logger-context.instrumentation';
export { VERSION, getPackageVersion } from './version';
//# sourceMappingURL=index.d.ts.map