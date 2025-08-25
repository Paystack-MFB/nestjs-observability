import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { ConfigServiceInterface, createObservabilityConfig, ObservabilityConfig } from './config/observability.config';
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
  // Non-static properties to prevent no-extraneous-class error
  private readonly version = '1.0.0';

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
          } as ConfigServiceInterface
        );
        return defaultConfig;
      },
    };

    // Core providers - simplified without complex dependencies
    const providers: Provider[] = [
      // Default configuration provider (temporary until services are updated)
      defaultConfigProvider,

      // LoggerService - uses global OpenTelemetry logger provider (Task 4 completed)
      LoggerService,

      // MetricsService - uses global OpenTelemetry meter provider (Task 5 completed)
      MetricsService,

      // TracingService - uses global OpenTelemetry tracer provider (Task 6 completed)
      TracingService,

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
  getVersion(): string {
    return this.version;
  }
}
