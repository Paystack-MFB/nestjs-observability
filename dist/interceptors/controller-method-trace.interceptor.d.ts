import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { LoggerService } from '../logger/logger.service';
/**
 * Interceptor to automatically trace controller methods
 * This interceptor replaces the need for @Trace() decorators on controller methods
 * by automatically creating spans for each method call.
 */
export declare class ControllerMethodTraceInterceptor implements NestInterceptor {
    private readonly logger;
    constructor(logger: LoggerService);
    intercept(executionContext: ExecutionContext, next: CallHandler): Observable<unknown>;
}
//# sourceMappingURL=controller-method-trace.interceptor.d.ts.map