import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';
export declare class AutoTraceInterceptor implements NestInterceptor {
    private readonly metricsService;
    private readonly logger;
    private readonly tracer;
    constructor(metricsService: MetricsService, logger: LoggerService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
    private addHttpAttributes;
    private handleError;
    private updateMetrics;
}
//# sourceMappingURL=auto-trace.interceptor.d.ts.map