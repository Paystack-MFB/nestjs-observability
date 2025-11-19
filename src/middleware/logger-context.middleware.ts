import { Injectable, NestMiddleware } from '@nestjs/common';
import { initializeRequestLoggerContext } from '../logger/logger-context-storage';

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
 * Uses Node.js AsyncLocalStorage to ensure context persists through async operations
 * (promises, await, etc.) across the entire request lifecycle.
 *
 * This is separate from OpenTelemetry's context, which manages trace/span IDs.
 * We use AsyncLocalStorage directly because it reliably propagates context through
 * Express/Fastify middleware chains, unlike context.with() which only activates
 * context during callback execution.
 */
@Injectable()
export class LoggerContextMiddleware implements NestMiddleware {
  use(_req: unknown, _res: unknown, next: () => void): void {
    // Initialize request-scoped logger context using AsyncLocalStorage
    // This creates a new context map that will be available to all downstream
    // handlers and async operations for the duration of this request
    initializeRequestLoggerContext(() => {
      next();
    });
  }
}
