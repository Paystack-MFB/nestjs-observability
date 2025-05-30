var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ObservabilityModule_1;
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { defaultObservabilityConfig } from './config/observability.config';
import { MetricsController } from './controllers/metrics.controller';
import { ControllerMethodTraceInterceptor } from './interceptors/controller-method-trace.interceptor';
import { HttpTraceInterceptor } from './interceptors/http-trace.interceptor';
import { LoggerService } from './logger/logger.service';
import { MetricsService } from './metrics/metrics.service';
import { TracingService } from './tracing/tracing.service';
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
            inject: options.inject ?? [],
            provide: 'OBSERVABILITY_CONFIG',
            useFactory: options.useFactory,
        };
        return this.registerModule(null, configProvider);
    }
    /**
     * Register the module with providers and controllers
     */
    static registerModule(config, configProvider) {
        // Core providers
        const providers = [
            configProvider ?? {
                provide: 'OBSERVABILITY_CONFIG',
                useValue: config,
            },
            {
                inject: ['OBSERVABILITY_CONFIG'],
                provide: LoggerService,
                useFactory: (config) => {
                    return new LoggerService(config);
                },
            },
            {
                inject: ['OBSERVABILITY_CONFIG', LoggerService],
                provide: MetricsService,
                useFactory: (config, logger) => {
                    return new MetricsService(config, logger);
                },
            },
            {
                inject: ['OBSERVABILITY_CONFIG', LoggerService],
                provide: TracingService,
                useFactory: (config, logger) => {
                    return new TracingService(config, logger);
                },
            },
            {
                inject: [MetricsService, LoggerService],
                provide: APP_INTERCEPTOR,
                useFactory: (metricsService, logger) => {
                    return new HttpTraceInterceptor(metricsService, logger);
                },
            },
            // Add the controller method trace interceptor globally
            {
                inject: [LoggerService],
                provide: APP_INTERCEPTOR,
                useFactory: (logger) => {
                    return new ControllerMethodTraceInterceptor(logger);
                },
            },
        ];
        // Controllers array with conditional addition
        const controllers = config?.metrics.enabled !== false ? [MetricsController] : [];
        return {
            controllers,
            exports: [LoggerService, MetricsService, TracingService],
            global: true, // Make this module global to ensure services are available everywhere
            imports: [ConfigModule],
            module: ObservabilityModule_1,
            providers,
        };
    }
};
ObservabilityModule = ObservabilityModule_1 = __decorate([
    Global(),
    Module({})
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
], ObservabilityModule);
export { ObservabilityModule };
//# sourceMappingURL=observability.module.js.map