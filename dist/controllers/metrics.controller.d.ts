import { LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';
/**
 * Controller to expose Prometheus metrics endpoint
 */
export declare class MetricsController {
    private readonly metricsService;
    private readonly logger;
    constructor(metricsService: MetricsService, logger: LoggerService);
    /**
     * Endpoint that returns Prometheus metrics
     */
    getMetrics(): Promise<string>;
}
//# sourceMappingURL=metrics.controller.d.ts.map