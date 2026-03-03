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
  VERSION_NEUTRAL,
  VersioningType,
} from '@nestjs/common';
import { PATH_METADATA, VERSION_METADATA } from '@nestjs/common/constants';
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
    const versioningOptions = this.applicationConfig?.getVersioning();

    for (const wrapper of this.discoveryService.getControllers()) {
      if (!wrapper.metatype || typeof wrapper.metatype !== 'function') {
        continue;
      }

      if (!isNoTraceClassEnabled(wrapper.metatype as Type)) {
        continue;
      }

      const rawPath = Reflect.getMetadata(PATH_METADATA, wrapper.metatype) as string | string[] | undefined;
      const controllerPaths = Array.isArray(rawPath) ? rawPath : [rawPath];

      const versionSegments = this.resolveVersionSegments(wrapper.metatype as Type, versioningOptions);

      for (const controllerPath of controllerPaths) {
        if (!controllerPath || controllerPath === '/') {
          // console.warn used because LoggerService may not be ready during bootstrap
          console.warn(
            `@NoTraceClass on ${wrapper.metatype.name} ignored: root-path controllers cannot be excluded from tracing`
          );
          continue;
        }

        const isExcludedFromPrefix = excludedPaths.includes(controllerPath);

        for (const versionSegment of versionSegments) {
          const pathWithVersion = versionSegment ? `${versionSegment}/${controllerPath}` : controllerPath;

          if (globalPrefix && !isExcludedFromPrefix) {
            addIgnoredRoute(`${globalPrefix}/${pathWithVersion}`.replace(/\/+/g, '/'));
          } else {
            addIgnoredRoute(pathWithVersion);
          }
        }
      }
    }
  }

  /**
   * Resolve version segments for a controller based on URI versioning config.
   * Returns an array of version path segments (e.g., ['v1', 'v2']) or [''] if
   * versioning doesn't apply.
   */
  private resolveVersionSegments(
    metatype: Type,
    versioningOptions?: ReturnType<ApplicationConfig['getVersioning']>
  ): string[] {
    if (!versioningOptions || versioningOptions.type !== VersioningType.URI) {
      return [''];
    }

    const controllerVersion =
      (Reflect.getMetadata(VERSION_METADATA, metatype) as string | string[] | typeof VERSION_NEUTRAL | undefined) ??
      versioningOptions.defaultVersion;

    if (!controllerVersion) {
      return [''];
    }

    const prefix = versioningOptions.prefix;
    const versionPrefix = prefix === false ? '' : String(prefix ?? 'v');
    const versions = Array.isArray(controllerVersion) ? controllerVersion : [controllerVersion];

    return versions.map((v) => (v === VERSION_NEUTRAL ? '' : `${versionPrefix}${String(v)}`));
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
