// ABOUTME: Core NestJS module that provides observability services (logging, metrics, tracing).
// ABOUTME: Scans controllers at boot to register @NoTraceClass routes with the ignored-routes registry.

import {
  DynamicModule,
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationBootstrap,
  Optional,
  Provider,
  Type,
} from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { APP_INTERCEPTOR, ApplicationConfig, DiscoveryModule, DiscoveryService } from '@nestjs/core';

import { MetricsController } from './controllers/metrics.controller';
import { isNoTraceClassEnabled } from './decorators/auto-trace.decorators';
import { AutoTraceInterceptor } from './interceptors/auto-trace.interceptor';
import { RequestLoggingInterceptor } from './interceptors/request-logging.interceptor';
import { LoggerService } from './logger/logger.service';
import { MetricsService } from './metrics/metrics.service';
import { addIgnoredRoute } from './sdk-core';
import { TracingService } from './tracing/tracing.service';

/**
 * Scans controllers at application boot and registers @NoTraceClass routes
 * with the ignored-routes registry so HTTP auto-instrumentation skips them.
 */
@Injectable()
export class IgnoredRouteScanner implements OnApplicationBootstrap {
  constructor(
    @Inject(DiscoveryService) private readonly discoveryService: DiscoveryService,
    @Optional() @Inject(ApplicationConfig) private readonly applicationConfig?: ApplicationConfig
  ) {}

  onApplicationBootstrap(): void {
    const globalPrefix = this.applicationConfig?.getGlobalPrefix() ?? '';
    const excludedPaths = (this.applicationConfig?.getGlobalPrefixOptions().exclude ?? [])
      .filter((e) => typeof e === 'object' && 'path' in e)
      .map((e) => (e as { path: string }).path);

    for (const wrapper of this.discoveryService.getControllers()) {
      if (!wrapper.metatype || typeof wrapper.metatype !== 'function') {
        continue;
      }

      if (!isNoTraceClassEnabled(wrapper.metatype as Type)) {
        continue;
      }

      const controllerPath = Reflect.getMetadata(PATH_METADATA, wrapper.metatype) as string | undefined;
      if (!controllerPath || controllerPath === '/') {
        // console.warn used because LoggerService may not be ready during bootstrap
        console.warn(
          `@NoTraceClass on ${wrapper.metatype.name} ignored: root-path controllers cannot be excluded from tracing`
        );
        continue;
      }

      const isExcludedFromPrefix = excludedPaths.includes(controllerPath);

      if (globalPrefix && !isExcludedFromPrefix) {
        addIgnoredRoute(`${globalPrefix}/${controllerPath}`.replace(/\/+/g, '/'));
      } else {
        addIgnoredRoute(controllerPath);
      }
    }
  }
}

@Global()
@Module({})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ObservabilityModule {
  /**
   * Register the module with core observability services
   * All configuration comes from environment variables via the register module
   * No configuration objects needed - everything is environment-driven
   *
   * Note: LoggerContextMiddleware is automatically applied globally via the
   * NestJSLoggerContextInstrumentation when using the register.ts entrypoint.
   * This ensures request-scoped logger context is available without requiring
   * explicit module import or configuration.
   */
  static forRoot(): DynamicModule {
    const providers: Provider[] = [
      LoggerService,
      MetricsService,
      TracingService,
      IgnoredRouteScanner,
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
      imports: [DiscoveryModule],
      module: ObservabilityModule,
      providers,
    };
  }
}
