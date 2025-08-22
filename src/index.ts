// Note: Configuration is now handled via environment variables
// The ObservabilityModule.forRoot() method uses OTEL_* environment variables
// Legacy configuration exports deprecated - will be removed in next major version
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
export { addSpanAttribute, addSpanAttributes, getCurrentSpan } from './utils/span-attributes';
