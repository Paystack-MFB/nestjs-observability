import { DynamicModule, Global, InjectionToken, Module, Provider, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { ensureServiceLabels, ObservabilityConfig } from './config/observability.config';
import { MetricsController } from './controllers/metrics.controller';
import { AutoTraceInterceptor } from './interceptors/auto-trace.interceptor';
import { LoggerService } from './logger/logger.service';
import { MetricsService } from './metrics/metrics.service';
import { TracingService } from './tracing/tracing.service';
import { setAttributeSanitizationConfig } from './utils/span-attributes';

@Global()
@Module({})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ObservabilityModule {
  /**
   * Register the module with configuration
   */
  static forRoot(config: ObservabilityConfig): DynamicModule {
    // Process configuration with defaults
    const processedConfig = ensureServiceLabels(config);

    return this.registerModule(processedConfig);
  }

  /**
   * Register the module with async configuration
   */
  static forRootAsync(options: {
    imports?: unknown[];
    inject?: InjectionToken[];
    useFactory: (...args: unknown[]) => ObservabilityConfig | Promise<ObservabilityConfig>;
  }): DynamicModule {
    const configProvider: Provider = {
      inject: options.inject ?? [],
      provide: 'OBSERVABILITY_CONFIG',
      useFactory: async (...args: unknown[]) => {
        const config = await options.useFactory(...args);
        const processedConfig = ensureServiceLabels(config);

        // Initialize attribute sanitization configuration
        setAttributeSanitizationConfig(processedConfig.tracing.attributeSanitization);

        return processedConfig;
      },
    };

    return this.registerModule(null, configProvider);
  }

  /**
   * Register the module with providers and controllers
   */
  private static registerModule(config: null | ObservabilityConfig, configProvider?: Provider): DynamicModule {
    // Initialize attribute sanitization configuration if config is provided
    if (config) {
      setAttributeSanitizationConfig(config.tracing.attributeSanitization);
    }

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
    // Controllers are traced automatically, services use @TraceClass decorator
    providers.push({
      inject: [MetricsService],
      provide: APP_INTERCEPTOR,
      useFactory: (metricsService: MetricsService) => {
        return new AutoTraceInterceptor(metricsService);
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
