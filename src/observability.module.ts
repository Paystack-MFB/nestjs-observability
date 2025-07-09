import { DynamicModule, Global, Module, Provider, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, DiscoveryService } from '@nestjs/core';

import { defaultObservabilityConfig, ObservabilityConfig } from './config/observability.config';
import { MetricsController } from './controllers/metrics.controller';
import { ControllerMethodTraceInterceptor } from './interceptors/controller-method-trace.interceptor';
import { HttpTraceInterceptor } from './interceptors/http-trace.interceptor';
import { LoggerService } from './logger/logger.service';
import { MetricsService } from './metrics/metrics.service';
import { AutoInstrumentationService } from './services/auto-instrumentation.service';
import { TracingService } from './tracing/tracing.service';

@Global()
@Module({})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ObservabilityModule {
  static forRoot(config?: Partial<ObservabilityConfig>): DynamicModule {
    const actualConfig = {
      ...defaultObservabilityConfig,
      ...config,
    };

    return this.registerModule(actualConfig);
  }

  static forRootAsync(options: {
    inject?: Type<unknown>[];
    useFactory: (...args: unknown[]) => ObservabilityConfig | Promise<ObservabilityConfig>;
  }): DynamicModule {
    const configProvider = {
      inject: options.inject ?? [],
      provide: 'OBSERVABILITY_CONFIG',
      useFactory: options.useFactory,
    };

    return this.registerModule(null, configProvider);
  }

  /**
   * Register the module with providers and controllers
   */
  private static registerModule(config: null | ObservabilityConfig, configProvider?: Provider): DynamicModule {
    // Core providers
    const providers: Provider[] = [
      configProvider ?? {
        provide: 'OBSERVABILITY_CONFIG',
        useValue: config,
      },
      {
        inject: ['OBSERVABILITY_CONFIG'],
        provide: LoggerService,
        useFactory: (config: ObservabilityConfig) => {
          return new LoggerService(config);
        },
      },
      {
        inject: ['OBSERVABILITY_CONFIG', LoggerService],
        provide: MetricsService,
        useFactory: (config: ObservabilityConfig, logger: LoggerService) => {
          return new MetricsService(config, logger);
        },
      },
      {
        inject: ['OBSERVABILITY_CONFIG', LoggerService],
        provide: TracingService,
        useFactory: (config: ObservabilityConfig, logger: LoggerService) => {
          return new TracingService(config, logger);
        },
      },
      // Add the auto-instrumentation service
      {
        inject: [DiscoveryService, LoggerService, 'OBSERVABILITY_CONFIG'],
        provide: AutoInstrumentationService,
        useFactory: (discoveryService: DiscoveryService, logger: LoggerService, config: ObservabilityConfig) => {
          return new AutoInstrumentationService(discoveryService, logger, config);
        },
      },
      {
        inject: [MetricsService, LoggerService],
        provide: APP_INTERCEPTOR,
        useFactory: (metricsService: MetricsService, logger: LoggerService) => {
          return new HttpTraceInterceptor(metricsService, logger);
        },
      },
      // Add the controller method trace interceptor globally
      {
        inject: [LoggerService],
        provide: APP_INTERCEPTOR,
        useFactory: (logger: LoggerService) => {
          return new ControllerMethodTraceInterceptor(logger);
        },
      },
    ];

    // Controllers array with conditional addition
    const controllers: Type<unknown>[] = config?.metrics.enabled !== false ? [MetricsController] : [];

    return {
      controllers,
      exports: [LoggerService, MetricsService, TracingService, AutoInstrumentationService],
      global: true, // Make this module global to ensure services are available everywhere
      imports: [ConfigModule],
      module: ObservabilityModule,
      providers,
    };
  }
}
