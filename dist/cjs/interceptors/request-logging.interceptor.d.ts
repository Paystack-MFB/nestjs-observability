import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { LoggerService } from '../logger/logger.service';
export declare class RequestLoggingInterceptor implements NestInterceptor {
    private readonly logger;
    constructor(logger: LoggerService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
    private shouldLog;
    private getClientIp;
    private logRequest;
    private logResponse;
}
//# sourceMappingURL=request-logging.interceptor.d.ts.map