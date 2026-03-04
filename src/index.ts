// Core observability module with OpenTelemetry integration
// Configuration via OTEL_* environment variables
// Controllers
export { MetricsController } from './controllers/metrics.controller';
// Decorators
export {
  getTraceOptions,
  isNoLogClassEnabled,
  isNoLogEnabled,
  isNoTraceClassEnabled,
  isNoTraceEnabled,
  isTraceClassEnabled,
  NoLog,
  NoLogClass,
  NoTrace,
  NoTraceClass,
  Trace,
  TraceClass,
} from './decorators/auto-trace.decorators';

export type { TraceClassOptions, TraceOptions } from './decorators/auto-trace.decorators';
// Interceptors
export { AutoTraceInterceptor } from './interceptors/auto-trace.interceptor';
export { RequestLoggingInterceptor } from './interceptors/request-logging.interceptor';

export { LoggerService } from './logger/logger.service';

export { MetricsService } from './metrics/metrics.service';

// Core module and services
export { ObservabilityModule } from './observability.module';

// Service helper functions (from sdk-core to avoid auto-start)
export {
  addIgnoredRoute,
  getHttpRequestLoggingEnabled,
  getIgnoredRoutes,
  getServiceAttributes,
  getServiceEnvironment,
  getServiceName,
  getServiceVersion,
  isRouteIgnored,
  resetIgnoredRoutes,
} from './sdk-core';

// SDK building blocks for custom configurations (from sdk-core to avoid auto-start)
export {
  createSDK,
  startSDK,
  createLogProcessor,
  createMetricReader,
  createTraceExporter,
  createInstrumentations,
  createResource,
  createTextMapPropagator,
  type SDKBuilderOptions,
  type SpanProcessor,
  type MetricReader,
  type LogRecordProcessor,
  NodeSDK,
} from './sdk-core';

export { TracingService } from './tracing/tracing.service';

// Span attribute utilities
export {
  addSpanAttribute,
  addSpanAttributes,
  addSpanAttributesUnsafe,
  addSpanAttributeUnsafe,
  getCurrentSpan,
  getCurrentSpanId,
  getCurrentTraceId,
  hasActiveSpan,
  isSensitiveKey,
} from './utils/span-attributes';

// Extensible sanitization configuration (NEW in v1.0.0)
export { addSensitivePatterns, configureAttributeSanitization, getSanitizationConfig } from './utils/span-attributes';

export type { AttributeSanitizationConfig } from './utils/span-attributes';

// Request/response logging utilities
export { addSensitiveFields, getAllSensitiveFields, maskSensitiveFields } from './utils/mask-sensitive-fields';

// Instrumentations and version
export { NestJSLoggerContextInstrumentation } from './instrumentation/nestjs-logger-context.instrumentation';
export { VERSION, getPackageVersion } from './version';
