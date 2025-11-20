import {
  InstrumentationBase,
  InstrumentationNodeModuleDefinition,
  InstrumentationConfig,
} from '@opentelemetry/instrumentation';
import { diag } from '@opentelemetry/api';
import { VERSION } from '../version';

/**
 * Custom OpenTelemetry instrumentation that automatically injects LoggerContextMiddleware
 * into NestJS applications when NestFactory.create() is called.
 *
 * This instrumentation ensures that request-scoped logger context is available for all
 * HTTP requests without requiring explicit module configuration or middleware registration.
 *
 * Works with both Express and Fastify adapters.
 */
export class NestJSLoggerContextInstrumentation extends InstrumentationBase {
  constructor(config?: InstrumentationConfig) {
    super('@paystackhq/nestjs-logger-context', VERSION, config ?? {});
  }

  protected init(): InstrumentationNodeModuleDefinition[] {
    return [
      new InstrumentationNodeModuleDefinition(
        '@nestjs/core',
        ['>=9.0.0 <12.0.0'],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (moduleExports: any) => {
          this.patchNestFactory(moduleExports);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return moduleExports;
        },
        () => {
          // No-op: We don't restore the original
        }
      ),
    ];
  }

  /**
   * Patch NestFactory.create to inject logger context middleware
   * Uses regular function expression to preserve NestFactory's `this` context
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private patchNestFactory(moduleExports: any): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const originalCreate = moduleExports.NestFactory?.create;
    if (typeof originalCreate !== 'function') {
      return;
    }

    // Capture instrumentation instance in closure
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    // Use regular function expression to preserve NestFactory's `this` context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patchedCreate = function (this: any, ...args: any[]): Promise<any> {
      // `this` here refers to NestFactory, not instrumentation
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const appPromise = originalCreate.apply(this, args);

      // Handle the promise and inject middleware
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Promise.resolve(appPromise).then((app: any) => {
        // Now access instrumentation via closure
        self.injectMiddleware(app);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return app;
      });
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    moduleExports.NestFactory.create = patchedCreate;
  }

  /**
   * Inject logger context middleware into the application
   * Supports both Express and Fastify adapters
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private injectMiddleware(app: any): void {
    try {
      // Get the HTTP adapter (Express or Fastify)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const httpAdapter = (app.getHttpAdapter as (() => unknown) | undefined)?.();
      const instance = (httpAdapter as { getInstance: (() => unknown) | undefined } | undefined)?.getInstance?.();

      if (!instance) {
        diag.warn('Could not get HTTP adapter instance, logger context middleware not injected');
        return;
      }

      // Middleware function that initializes logger context
      const loggerContextMiddleware = (_req: unknown, _res: unknown, next: () => void): void => {
        this.initializeLoggerContext(next);
      };

      // Inject based on adapter type
      const instanceTyped = instance as {
        use?: (fn: (req: unknown, res: unknown, next: () => void) => void) => void;
        addHook?: (name: string, fn: (req: unknown, res: unknown) => Promise<void>) => void;
      };
      if (typeof instanceTyped.use === 'function') {
        // Express-style middleware
        instanceTyped.use(loggerContextMiddleware);
        diag.debug('Injected logger context middleware into Express adapter');
      } else if (typeof instanceTyped.addHook === 'function') {
        // Fastify-style hooks
        instanceTyped.addHook('onRequest', (_request: unknown, _reply: unknown) => {
          return new Promise<void>((resolve) => {
            this.initializeLoggerContext(() => {
              resolve();
            });
          });
        });
        diag.debug('Injected logger context middleware into Fastify adapter');
      } else {
        diag.warn('Unknown HTTP adapter type, logger context middleware not injected');
      }
    } catch (error) {
      diag.error('Failed to inject logger context middleware', error as Error);
    }
  }

  /**
   * Initialize logger context for a request
   * Creates a new Map using AsyncLocalStorage to ensure context persists
   * through async operations across the entire request lifecycle
   */
  private initializeLoggerContext(next: () => void): void {
    // Import here to avoid circular dependency at module load time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeRequestLoggerContext } = require('../logger/logger-context-storage') as {
      initializeRequestLoggerContext: (fn: () => void) => void;
    };

    // Initialize request-scoped logger context using AsyncLocalStorage
    // This ensures the context is available to all downstream middleware,
    // handlers, and async operations for this request
    initializeRequestLoggerContext(next);
  }
}
