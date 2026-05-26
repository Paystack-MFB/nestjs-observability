import { LoggerService } from '../logger/logger.service.js';
import { MetricsService } from '../metrics/metrics.service.js';
export declare class MetricsController {
    private readonly metricsService;
    private readonly logger;
    private readonly isMetricsEnabled;
    private readonly metricsEndpoint;
    constructor(metricsService: MetricsService, logger: LoggerService | undefined);
    getMetricNames(): {
        enabled: boolean;
        metrics?: string[];
    };
    getMetrics(): Promise<string>;
    getMetricsConfig(): {
        enabled: boolean;
        endpoint: string;
        serviceName: string;
    };
    getMetricsHealth(): {
        enabled: boolean;
        endpoint: string;
        status: string;
    };
    isMetricsWorking(): Promise<boolean>;
    private getMetricsEnabledFromEnv;
    private getMetricsEndpointFromEnv;
}
//# sourceMappingURL=metrics.controller.d.ts.map