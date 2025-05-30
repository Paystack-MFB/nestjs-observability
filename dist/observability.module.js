var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ObservabilityModule_1;
import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from './logger/logger.service';
import { MetricsService } from './metrics/metrics.service';
import { TracingService } from './tracing/tracing.service';
import { defaultObservabilityConfig, } from './config/observability.config';
import { HttpTraceInterceptor } from './interceptors/http-trace.interceptor';
import { ControllerMethodTraceInterceptor } from './interceptors/controller-method-trace.interceptor';
import { MetricsController } from './controllers/metrics.controller';
let ObservabilityModule = ObservabilityModule_1 = class ObservabilityModule {
    static forRoot(config) {
        const actualConfig = {
            ...defaultObservabilityConfig,
            ...config,
        };
        return this.registerModule(actualConfig);
    }
    static forRootAsync(options) {
        const configProvider = {
            provide: 'OBSERVABILITY_CONFIG',
            useFactory: options.useFactory,
            inject: options.inject || [],
        };
        return this.registerModule(null, configProvider);
    }
    /**
     * Register the module with providers and controllers
     */
    static registerModule(config, configProvider) {
        // Core providers
        const providers = [
            configProvider || {
                provide: 'OBSERVABILITY_CONFIG',
                useValue: config,
            },
            {
                provide: LoggerService,
                useFactory: (config) => {
                    return new LoggerService(config);
                },
                inject: ['OBSERVABILITY_CONFIG'],
            },
            {
                provide: MetricsService,
                useFactory: (config, logger) => {
                    return new MetricsService(config, logger);
                },
                inject: ['OBSERVABILITY_CONFIG', LoggerService],
            },
            {
                provide: TracingService,
                useFactory: (config, logger) => {
                    return new TracingService(config, logger);
                },
                inject: ['OBSERVABILITY_CONFIG', LoggerService],
            },
            {
                provide: APP_INTERCEPTOR,
                useFactory: (metricsService, logger) => {
                    return new HttpTraceInterceptor(metricsService, logger);
                },
                inject: [MetricsService, LoggerService],
            },
            // Add the controller method trace interceptor globally
            {
                provide: APP_INTERCEPTOR,
                useFactory: (logger) => {
                    return new ControllerMethodTraceInterceptor(logger);
                },
                inject: [LoggerService],
            },
        ];
        // Controllers array with conditional addition
        const controllers = config?.metrics.enabled !== false ? [MetricsController] : [];
        return {
            module: ObservabilityModule_1,
            imports: [ConfigModule],
            providers,
            exports: [LoggerService, MetricsService, TracingService],
            controllers,
            global: true, // Make this module global to ensure services are available everywhere
        };
    }
};
ObservabilityModule = ObservabilityModule_1 = __decorate([
    Global(),
    Module({})
], ObservabilityModule);
export { ObservabilityModule };
//# sourceMappingURL=observability.module.js.map