import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { MetricsController } from './controllers/metrics.controller';
import { AutoTraceInterceptor } from './interceptors/auto-trace.interceptor';
import { LoggerService } from './logger/logger.service';
import { MetricsService } from './metrics/metrics.service';
import { TracingService } from './tracing/tracing.service';

/**
 * Lightweight ObservabilityModule that provides enhanced NestJS services
 * Uses global OpenTelemetry providers initialized by the register module
 * No configuration required - controlled via environment variables
 */
@Global()
@Module({})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ObservabilityModule {
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
}
