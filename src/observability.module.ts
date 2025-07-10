import { DynamicModule, Global, InjectionToken, Module, Provider, Type } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import {
  createObservabilityConfig,
  ensureServiceLabels,
  ObservabilityConfig,
  SimpleObservabilityConfig,
} from './config/observability.config';
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
   * Now accepts SimpleObservabilityConfig for cleaner user configuration
   */
  static forRoot(config: SimpleObservabilityConfig): DynamicModule {
    const configProvider: Provider = {
      inject: [ConfigService],
      provide: 'OBSERVABILITY_CONFIG',
      useFactory: (configService: ConfigService) => {
        // Create complete configuration from user input and environment variables
        const fullConfig = createObservabilityConfig(config, configService);
        // Process configuration to ensure service labels are present
        return ensureServiceLabels(fullConfig);
      },
    };

    const moduleDefinition = this.registerModule(null, configProvider);

    return {
      ...moduleDefinition,
      imports: [ConfigModule], // Ensure ConfigModule is available
    };
  }

  /**
   * Register the module with async configuration
   * Supports dependency injection for configuration
   */
  static forRootAsync(options: {
    imports?: (DynamicModule | Type<unknown>)[];
    inject?: InjectionToken[];
    useFactory: (...args: unknown[]) => Promise<SimpleObservabilityConfig> | SimpleObservabilityConfig;
  }): DynamicModule {
    const configProvider: Provider = {
      inject: [ConfigService, ...(options.inject ?? [])],
      provide: 'OBSERVABILITY_CONFIG',
      useFactory: async (configService: ConfigService, ...args: unknown[]) => {
        // Get user configuration from factory
        const userConfig = await options.useFactory(...args);
        // Create complete configuration from user input and environment variables
        const fullConfig = createObservabilityConfig(userConfig, configService);
        // Process configuration to ensure service labels are present
        return ensureServiceLabels(fullConfig);
      },
    };

    const moduleDefinition = this.registerModule(null, configProvider);

    // Ensure ConfigModule is included in imports
    const imports = [ConfigModule, ...(options.imports ?? [])];

    return {
      ...moduleDefinition,
      imports,
    };
  }

  /**
   * Register the module with providers and controllers
   */
  private static registerModule(config: null | ObservabilityConfig, configProvider?: Provider): DynamicModule {
    // Initialize attribute sanitization configuration if config is provided
    if (config) {
      setAttributeSanitizationConfig(config.tracing.attributeSanitization);
    }

    // Core providers with proper dependency order
    const providers: Provider[] = [
      // Configuration must be first
      configProvider ?? {
        provide: 'OBSERVABILITY_CONFIG',
        useValue: config,
      },
      // LoggerService depends only on configuration
      {
        inject: ['OBSERVABILITY_CONFIG'],
        provide: LoggerService,
        useFactory: (observabilityConfig: ObservabilityConfig) => {
          return new LoggerService(observabilityConfig);
        },
      },
      // MetricsService depends on configuration and LoggerService
      {
        inject: ['OBSERVABILITY_CONFIG', LoggerService],
        provide: MetricsService,
        useFactory: (observabilityConfig: ObservabilityConfig, logger: LoggerService) => {
          return new MetricsService(observabilityConfig, logger);
        },
      },
      // TracingService depends on configuration and LoggerService
      {
        inject: ['OBSERVABILITY_CONFIG', LoggerService],
        provide: TracingService,
        useFactory: (observabilityConfig: ObservabilityConfig, logger: LoggerService) => {
          return new TracingService(observabilityConfig, logger);
        },
      },
      // Register AutoTraceInterceptor as global interceptor
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
