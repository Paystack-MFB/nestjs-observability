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

// Service helper functions
export {
  getHttpRequestLoggingEnabled,
  getServiceAttributes,
  getServiceEnvironment,
  getServiceName,
  getServiceVersion,
} from './register';

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
