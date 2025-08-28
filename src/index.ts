// Core observability module with OpenTelemetry integration
// Configuration via OTEL_* environment variables
// Controllers
export { MetricsController } from './controllers/metrics.controller';
// Decorators
export {
  getTraceOptions,
  isNoTraceClassEnabled,
  isNoTraceEnabled,
  isTraceClassEnabled,
  NoTrace,
  NoTraceClass,
  Trace,
  TraceClass,
} from './decorators/auto-trace.decorators';

export type { TraceClassOptions, TraceOptions } from './decorators/auto-trace.decorators';
// Interceptors
export { AutoTraceInterceptor } from './interceptors/auto-trace.interceptor';

export { LoggerService } from './logger/logger.service';

export { MetricsService } from './metrics/metrics.service';

// Core module and services
export { ObservabilityModule } from './observability.module';

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
export {
  addSensitivePatterns,
  clearAdditionalSensitivePatterns,
  configureAttributeSanitization,
  getSanitizationConfig,
} from './utils/span-attributes';

export type { AttributeSanitizationConfig } from './utils/span-attributes';
