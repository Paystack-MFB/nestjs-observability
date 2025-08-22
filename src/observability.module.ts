import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { createObservabilityConfig, ObservabilityConfig } from './config/observability.config';
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
export class ObservabilityModule {
  /**
   * Register the module without configuration
   * All configuration comes from environment variables via the register module
   */
  static forRoot(): DynamicModule {
    // Create a default configuration based on environment variables
    // This will be removed once services are updated to use global OpenTelemetry providers
    const defaultConfigProvider: Provider = {
      provide: 'OBSERVABILITY_CONFIG',
      useFactory: (): ObservabilityConfig => {
        // Create configuration from environment variables only
        const defaultConfig = createObservabilityConfig(
          {
            environment: process.env['NODE_ENV'] ?? 'development',
            serviceName: process.env['OTEL_SERVICE_NAME'] ?? 'nestjs-app',
            serviceVersion: process.env['OTEL_SERVICE_VERSION'] ?? '1.0.0',
          },
          // Mock ConfigService since we're using environment variables directly
          {
            get: (key: string) => process.env[key],
          } as any
        );
        return defaultConfig;
      },
    };

    // Core providers - simplified without complex dependencies
    const providers: Provider[] = [
      // Default configuration provider (temporary until services are updated)
      defaultConfigProvider,

      // LoggerService - will be updated to use global logger provider in Task 4
      {
        inject: ['OBSERVABILITY_CONFIG'],
        provide: LoggerService,
        useFactory: (config: ObservabilityConfig) => new LoggerService(config),
      },

      // MetricsService - will be updated to use global meter provider in Task 5
      {
        inject: ['OBSERVABILITY_CONFIG', LoggerService],
        provide: MetricsService,
        useFactory: (config: ObservabilityConfig, logger: LoggerService) => new MetricsService(config, logger),
      },

      // TracingService - will be updated to use global tracer provider in Task 6
      {
        inject: ['OBSERVABILITY_CONFIG', LoggerService],
        provide: TracingService,
        useFactory: (config: ObservabilityConfig, logger: LoggerService) => new TracingService(config, logger),
      },

      // AutoTraceInterceptor as global interceptor
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
