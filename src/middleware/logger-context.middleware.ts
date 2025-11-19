import { Injectable, NestMiddleware } from '@nestjs/common';
import * as api from '@opentelemetry/api';
import { LOGGER_CONTEXT_KEY } from '../logger/logger.service';

/**
 * Initializes request-scoped logging context at the middleware layer
 * This runs early in the NestJS request lifecycle, making the context available to:
 * - All subsequent middlewares
 * - Guards
 * - Interceptors
 * - Pipes
 * - Controllers
 * - Services
 *
 * The context is stored in OpenTelemetry's AsyncLocalStorage and automatically
 * propagates through async operations (promises, await, etc.)
 */
@Injectable()
export class LoggerContextMiddleware implements NestMiddleware {
  use(_req: unknown, _res: unknown, next: () => void): void {
    // Initialize request-scoped logger context
    const loggerContextMap = new Map<string, unknown>();
    const otelContext = api.context.active().setValue(LOGGER_CONTEXT_KEY, loggerContextMap);

    // Wrap the entire request handling in the context
    // This ensures the context is available throughout the request lifecycle
    api.context.with(otelContext, () => {
      next();
    });
  }
}
