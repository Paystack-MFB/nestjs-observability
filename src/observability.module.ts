import { DynamicModule, Global, Module, Provider, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { defaultObservabilityConfig, ensureServiceLabels, ObservabilityConfig } from './config/observability.config';
import { MetricsController } from './controllers/metrics.controller';
import { AutoTraceInterceptor } from './interceptors/auto-trace.interceptor';
import { LoggerService } from './logger/logger.service';
import { MetricsService } from './metrics/metrics.service';
import { TracingService } from './tracing/tracing.service';

@Global()
@Module({})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ObservabilityModule {
  static forRoot(config?: Partial<ObservabilityConfig>): DynamicModule {
    const mergedConfig = {
      ...defaultObservabilityConfig,
      ...config,
    };

    // Ensure service and version are always included in metrics labels
    const actualConfig = ensureServiceLabels(mergedConfig);

    return this.registerModule(actualConfig);
  }

  static forRootAsync(options: {
    inject?: Type<unknown>[];
    useFactory: (...args: unknown[]) => ObservabilityConfig | Promise<ObservabilityConfig>;
  }): DynamicModule {
    const configProvider = {
      inject: options.inject ?? [],
      provide: 'OBSERVABILITY_CONFIG',
      useFactory: async (...args: unknown[]) => {
        const config = await options.useFactory(...args);
        // Ensure service and version are always included in metrics labels
        return ensureServiceLabels(config);
      },
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
      LoggerService,
      MetricsService,
      TracingService,
    ];

    // V2 Auto-Tracing: Use new AutoTraceInterceptor
    // This replaces both the old interceptors and the AutoInstrumentationService
    // Controllers are traced automatically, services use @TraceAllMethods decorator
    providers.push({
      inject: [MetricsService, 'OBSERVABILITY_CONFIG'],
      provide: APP_INTERCEPTOR,
      useFactory: (metricsService: MetricsService, observabilityConfig: ObservabilityConfig) => {
        return new AutoTraceInterceptor(metricsService, observabilityConfig);
      },
    });

    // Controllers array with conditional addition
    const controllers: Type<unknown>[] = config?.metrics.enabled !== false ? [MetricsController] : [];

    // Exports - only the core services now
    const exports: Type<unknown>[] = [LoggerService, MetricsService, TracingService];

    // Simplified imports - only ConfigModule needed
    const imports: (DynamicModule | Type<unknown>)[] = [ConfigModule];

    return {
      controllers,
      exports,
      imports,
      module: ObservabilityModule,
      providers,
    };
  }
}
