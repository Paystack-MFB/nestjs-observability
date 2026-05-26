"use strict";
var ObservabilityModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityModule = exports.IgnoredRouteScanner = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const constants_1 = require("@nestjs/common/constants");
const core_1 = require("@nestjs/core");
const metrics_controller_1 = require("./controllers/metrics.controller");
const auto_trace_decorators_1 = require("./decorators/auto-trace.decorators");
const auto_trace_interceptor_1 = require("./interceptors/auto-trace.interceptor");
const request_logging_interceptor_1 = require("./interceptors/request-logging.interceptor");
const logger_service_1 = require("./logger/logger.service");
const metrics_service_1 = require("./metrics/metrics.service");
const sdk_core_1 = require("./sdk-core");
const tracing_service_1 = require("./tracing/tracing.service");
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
        for (const metatype of (0, auto_trace_decorators_1.getNoTraceClasses)()) {
            const rawPath = Reflect.getMetadata(constants_1.PATH_METADATA, metatype);
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
                        (0, sdk_core_1.addIgnoredRoute)(`${globalPrefix}/${pathWithVersion}`.replace(/\/+/g, '/'));
                    }
                    else {
                        (0, sdk_core_1.addIgnoredRoute)(pathWithVersion);
                    }
                }
            }
        }
    }
    resolveVersionSegments(metatype, versioningOptions) {
        if (!versioningOptions || versioningOptions.type !== common_1.VersioningType.URI) {
            return [''];
        }
        const controllerVersion = Reflect.getMetadata(constants_1.VERSION_METADATA, metatype) ??
            versioningOptions.defaultVersion;
        if (!controllerVersion) {
            return [''];
        }
        const prefix = versioningOptions.prefix;
        const versionPrefix = prefix === false ? '' : String(prefix ?? 'v');
        const versions = Array.isArray(controllerVersion) ? controllerVersion : [controllerVersion];
        return versions.map((v) => (v === common_1.VERSION_NEUTRAL ? '' : `${versionPrefix}${String(v)}`));
    }
};
exports.IgnoredRouteScanner = IgnoredRouteScanner;
exports.IgnoredRouteScanner = IgnoredRouteScanner = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, common_1.Optional)()),
    tslib_1.__param(0, (0, common_1.Inject)(core_1.ApplicationConfig)),
    tslib_1.__metadata("design:paramtypes", [core_1.ApplicationConfig])
], IgnoredRouteScanner);
let ObservabilityModule = ObservabilityModule_1 = class ObservabilityModule {
    static forRoot() {
        const providers = [
            logger_service_1.LoggerService,
            metrics_service_1.MetricsService,
            tracing_service_1.TracingService,
            IgnoredRouteScanner,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: request_logging_interceptor_1.RequestLoggingInterceptor,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: auto_trace_interceptor_1.AutoTraceInterceptor,
            },
        ];
        return {
            controllers: [metrics_controller_1.MetricsController],
            exports: [logger_service_1.LoggerService, metrics_service_1.MetricsService, tracing_service_1.TracingService],
            module: ObservabilityModule_1,
            providers,
        };
    }
};
exports.ObservabilityModule = ObservabilityModule;
exports.ObservabilityModule = ObservabilityModule = ObservabilityModule_1 = tslib_1.__decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], ObservabilityModule);
//# sourceMappingURL=observability.module.js.map