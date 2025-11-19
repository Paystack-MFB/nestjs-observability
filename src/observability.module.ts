import { DynamicModule, Global, MiddlewareConsumer, Module, NestModule, Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { MetricsController } from './controllers/metrics.controller';
import { AutoTraceInterceptor } from './interceptors/auto-trace.interceptor';
import { RequestLoggingInterceptor } from './interceptors/request-logging.interceptor';
import { LoggerService } from './logger/logger.service';
import { MetricsService } from './metrics/metrics.service';
import { LoggerContextMiddleware } from './middleware/logger-context.middleware';
import { TracingService } from './tracing/tracing.service';

/**
 * Lightweight ObservabilityModule that provides enhanced NestJS services
 * Uses global OpenTelemetry providers initialized by the register module
 * No configuration required - controlled via environment variables
 */
@Global()
@Module({})
export class ObservabilityModule implements NestModule {
  /**
   * Register the module with core observability services
   * All configuration comes from environment variables via the register module
   * No configuration objects needed - everything is environment-driven
   */
  static forRoot(): DynamicModule {
    const providers: Provider[] = [
      LoggerService,
      MetricsService,
      TracingService,
      LoggerContextMiddleware,
      {
        provide: APP_INTERCEPTOR,
        useClass: RequestLoggingInterceptor,
      },
      {
        provide: APP_INTERCEPTOR,
        useClass: AutoTraceInterceptor,
      },
    ];

    return {
      controllers: [MetricsController],
      exports: [LoggerService, MetricsService, TracingService],
      module: ObservabilityModule,
      providers,
    };
  }

  /**
   * Configure global middleware for request-scoped logging context initialization
   * This middleware runs at the earliest stage of request processing,
   * ensuring logger context is available for all downstream handlers
   */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  configure(consumer: MiddlewareConsumer) {
    // Apply LoggerContextMiddleware to all routes
    consumer.apply(LoggerContextMiddleware).forRoutes('*');
  }
}
