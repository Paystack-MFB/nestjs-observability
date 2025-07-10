// Configuration
export { defaultObservabilityConfig } from './config/observability.config';
export type { AttributeSanitizationConfig, ObservabilityConfig } from './config/observability.config';
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
