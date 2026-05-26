var ObservabilityModule_1;
import { __decorate, __metadata, __param } from "tslib";
import { Global, Inject, Injectable, Module, Optional, VERSION_NEUTRAL, VersioningType, } from '@nestjs/common';
import { PATH_METADATA, VERSION_METADATA } from '@nestjs/common/constants';
import { APP_INTERCEPTOR, ApplicationConfig } from '@nestjs/core';
import { MetricsController } from './controllers/metrics.controller.js';
import { getNoTraceClasses } from './decorators/auto-trace.decorators.js';
import { AutoTraceInterceptor } from './interceptors/auto-trace.interceptor.js';
import { RequestLoggingInterceptor } from './interceptors/request-logging.interceptor.js';
import { LoggerService } from './logger/logger.service.js';
import { MetricsService } from './metrics/metrics.service.js';
import { addIgnoredRoute } from './sdk-core.js';
import { TracingService } from './tracing/tracing.service.js';
let IgnoredRouteScanner = class IgnoredRouteScanner {
    applicationConfig;
    constructor(applicationConfig) {
        this.applicationConfig = applicationConfig;
    }
    onApplicationBootstrap() {
        const globalPrefix = this.applicationConfig?.getGlobalPrefix() ?? '';
        const excludedPaths = (this.applicationConfig?.getGlobalPrefixOptions().exclude ?? [])
            .map((e) => typeof e === 'string' ? e : typeof e === 'object' && 'path' in e ? e.path : null)
            .filter((p) => p !== null);
        const versioningOptions = this.applicationConfig?.getVersioning();
        for (const metatype of getNoTraceClasses()) {
            const rawPath = Reflect.getMetadata(PATH_METADATA, metatype);
            const controllerPaths = Array.isArray(rawPath) ? rawPath : [rawPath];
            const versionSegments = this.resolveVersionSegments(metatype, versioningOptions);
            for (const controllerPath of controllerPaths) {
                if (!controllerPath || controllerPath === '/') {
                    console.warn(`@NoTraceClass on ${metatype.name} ignored: root-path controllers cannot be excluded from tracing`);
                    continue;
                }
                const isExcludedFromPrefix = excludedPaths.includes(controllerPath);
                for (const versionSegment of versionSegments) {
                    const pathWithVersion = versionSegment ? `${versionSegment}/${controllerPath}` : controllerPath;
                    if (globalPrefix && !isExcludedFromPrefix) {
                        addIgnoredRoute(`${globalPrefix}/${pathWithVersion}`.replace(/\/+/g, '/'));
                    }
                    else {
                        addIgnoredRoute(pathWithVersion);
                    }
                }
            }
        }
    }
    resolveVersionSegments(metatype, versioningOptions) {
        if (!versioningOptions || versioningOptions.type !== VersioningType.URI) {
            return [''];
        }
        const controllerVersion = Reflect.getMetadata(VERSION_METADATA, metatype) ??
            versioningOptions.defaultVersion;
        if (!controllerVersion) {
            return [''];
        }
        const prefix = versioningOptions.prefix;
        const versionPrefix = prefix === false ? '' : String(prefix ?? 'v');
        const versions = Array.isArray(controllerVersion) ? controllerVersion : [controllerVersion];
        return versions.map((v) => (v === VERSION_NEUTRAL ? '' : `${versionPrefix}${String(v)}`));
    }
};
IgnoredRouteScanner = __decorate([
    Injectable(),
    __param(0, Optional()),
    __param(0, Inject(ApplicationConfig)),
    __metadata("design:paramtypes", [ApplicationConfig])
], IgnoredRouteScanner);
export { IgnoredRouteScanner };
let ObservabilityModule = ObservabilityModule_1 = class ObservabilityModule {
    static forRoot() {
        const providers = [
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
            module: ObservabilityModule_1,
            providers,
        };
    }
};
ObservabilityModule = ObservabilityModule_1 = __decorate([
    Global(),
    Module({})
], ObservabilityModule);
export { ObservabilityModule };
//# sourceMappingURL=observability.module.js.map