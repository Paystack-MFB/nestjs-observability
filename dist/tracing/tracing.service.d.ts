import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import type { ObservabilityConfig } from '../config/observability.config';
import { LoggerService } from '../logger/logger.service';
/**
 * Service for OpenTelemetry distributed tracing setup
 */
export declare class TracingService implements OnApplicationShutdown, OnModuleInit {
    private readonly config;
    private readonly logger;
    private sdk;
    constructor(config: ObservabilityConfig, logger: LoggerService);
    onApplicationShutdown(): Promise<void>;
    onModuleInit(): Promise<void>;
    /**
     * Configure the appropriate sampler based on configuration
     * @returns Configured OpenTelemetry sampler
     */
    private configureSampler;
    /**
     * Initialize OpenTelemetry SDK with configured options
     */
    private initializeTracingSdk;
}
//# sourceMappingURL=tracing.service.d.ts.map