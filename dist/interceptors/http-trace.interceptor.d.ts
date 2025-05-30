import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';
/**
 * Interceptor to trace HTTP requests and collect metrics
 * This interceptor will:
 * 1. Create spans for each HTTP request
 * 2. Collect metrics about request duration and status
 * 3. Add trace context to logs
 */
export declare class HttpTraceInterceptor implements NestInterceptor {
    private readonly metricsService;
    private readonly logger;
    constructor(metricsService: MetricsService, logger: LoggerService);
    intercept(executionContext: ExecutionContext, next: CallHandler): Observable<unknown>;
    /**
     * Normalize a route path to avoid high cardinality in metrics
     * For example, /users/123 becomes /users/:id
     */
    private normalizeRoute;
}
//# sourceMappingURL=http-trace.interceptor.d.ts.map