import { Type } from '@nestjs/common';
import { Exception, Span, SpanStatusCode, trace } from '@opentelemetry/api';
import 'reflect-metadata';

// Metadata keys for the decorators
const TRACE_ALL_METHODS_KEY = 'trace:all-methods';
const TRACE_METHOD_KEY = 'trace:method';
const NO_TRACE_KEY = 'trace:no-trace';
const NO_TRACE_CLASS_KEY = 'trace:no-trace-class';

// Interface for TraceAllMethods options
export interface TraceAllMethodsOptions {
  captureArgs?: boolean;
  excludePrivate?: boolean;
  spanNamePrefix?: string;
}

// Interface for TraceMethod options
export interface TraceMethodOptions {
  captureArgs?: boolean;
  spanName?: string;
}

/**
 * Creates a traced version of a method that handles both synchronous and asynchronous methods
 */
export function createTracedMethod(
  originalMethod: (...args: unknown[]) => unknown,
  className: string,
  methodName: string,
  options?: TraceMethodOptions
): (...args: unknown[]) => unknown {
  const spanName = options?.spanName ?? `${className}.${methodName}`;
  const captureArgs = options?.captureArgs ?? true;

  return function (this: unknown, ...args: unknown[]) {
    const tracer = trace.getTracer('auto-trace-decorators');

    return tracer.startActiveSpan(spanName, (span: Span) => {
      // Set basic attributes
      span.setAttributes({
        'class.name': className,
        'instrumentation.type': 'decorator',
        'method.name': methodName,
      });

      // Capture arguments if enabled
      if (captureArgs && args.length > 0) {
        const sanitizedArgs = sanitizeArguments(args);
        for (const [key, value] of Object.entries(sanitizedArgs)) {
          span.setAttribute(`method.${key}`, String(value));
        }
      }

      try {
        // Call the original method
        const result = originalMethod.apply(this, args);

        // Handle async methods (returns a Promise)
        if (result && typeof result === 'object' && 'then' in result) {
          return (result as Promise<unknown>)
            .then((value) => {
              span.setStatus({ code: SpanStatusCode.OK });
              return value;
            })
            .catch((error: unknown) => {
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: (error as Error).message,
              });
              span.recordException(error as Exception);
              throw error;
            })
            .finally(() => {
              span.end();
            });
        }

        // Handle sync methods
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        span.recordException(error as Exception);
        span.end();
        throw error;
      }
    });
  };
}

/**
 * Gets all method names from a class prototype that should be traced.
 * This filters out constructors, non-functions, and methods with @NoTrace.
 *
 * @param prototype - The class prototype
 * @param options - Options for filtering methods
 * @returns Array of method names that should be traced
 */
export function getTraceableMethodNames(prototype: object, options: TraceAllMethodsOptions = {}): string[] {
  const { excludePrivate = true } = options;

  return Object.getOwnPropertyNames(prototype)
    .filter((name) => name !== 'constructor')
    .filter((name) => typeof (prototype as Record<string, unknown>)[name] === 'function')
    .filter((name) => !isNoTraceEnabled(prototype, name))
    .filter((name) => {
      if (!excludePrivate) return true;

      // Exclude private methods (starting with _ or #)
      return !name.startsWith('_') && !name.startsWith('#');
    })
    .filter((name) => {
      // Exclude common lifecycle and internal methods
      const excludedMethods = [
        'onModuleInit',
        'onModuleDestroy',
        'onApplicationBootstrap',
        'onApplicationShutdown',
        'onApplicationReady',
        'beforeApplicationShutdown',
        'setContext',
        'setLogLevel',
        'toString',
        'valueOf',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'toLocaleString',
      ];

      return !excludedMethods.includes(name);
    });
}

/**
 * Gets the TraceMethod options for a specific method.
 *
 * @param target - The class prototype or instance
 * @param propertyKey - The method name
 * @returns TraceMethodOptions if the method has @TraceMethod decorator, undefined otherwise
 */
export function getTraceMethodOptions(target: object, propertyKey: string): TraceMethodOptions | undefined {
  return Reflect.getMetadata(TRACE_METHOD_KEY, target, propertyKey) as TraceMethodOptions | undefined;
}

/**
 * Checks if a class has the @NoTraceClass decorator applied.
 *
 * @param target - The class constructor to check
 * @returns true if the class is decorated with @NoTraceClass
 */
export function isNoTraceClassEnabled(target: Type): boolean {
  return Reflect.getMetadata(NO_TRACE_CLASS_KEY, target) === true;
}

/**
 * Checks if a method has the @NoTrace decorator applied.
 *
 * @param target - The class prototype or instance
 * @param propertyKey - The method name
 * @returns true if the method is decorated with @NoTrace
 */
export function isNoTraceEnabled(target: object, propertyKey: string): boolean {
  return Reflect.getMetadata(NO_TRACE_KEY, target, propertyKey) === true;
}

// Helper functions for metadata reading

/**
 * Checks if a class has the @TraceAllMethods decorator applied.
 *
 * @param target - The class constructor to check
 * @returns true if the class is decorated with @TraceAllMethods
 */
export function isTraceAllMethodsEnabled(target: Type): boolean {
  return Reflect.getMetadata(TRACE_ALL_METHODS_KEY, target) === true;
}

/**
 * Method decorator that excludes a method from tracing.
 * Use this to exclude specific methods from auto-tracing when using @TraceAllMethods.
 *
 * @example
 * ```typescript
 * @TraceAllMethods()
 * @Injectable()
 * class UserService {
 *   findUser(id: string) { ... } // Will be traced
 *
 *   @NoTrace()
 *   private internalHelper() { ... } // Will NOT be traced
 * }
 * ```
 */
export function NoTrace() {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(NO_TRACE_KEY, true, target, propertyKey);
    return descriptor;
  };
}

/**
 * Class decorator that excludes an entire class from auto-tracing.
 * Use this to exclude specific controllers or providers from auto-tracing.
 *
 * @example
 * ```typescript
 * @Controller('health')
 * @NoTraceClass()
 * class HealthController {
 *   // No methods will be traced automatically
 *   getHealth() { ... }
 * }
 * ```
 */
export function NoTraceClass() {
  return function <T extends Type>(target: T): T {
    Reflect.defineMetadata(NO_TRACE_CLASS_KEY, true, target);
    return target;
  };
}

/**
 * Enhanced class decorator that enables tracing for all methods of a class.
 * This version works without DiscoveryModule by directly wrapping methods.
 * Use this decorator on providers/services to opt-in to auto-tracing.
 *
 * @param options - Options for customizing the tracing behavior
 *
 * @example
 * ```typescript
 * @TraceAllMethods()
 * @Injectable()
 * class UserService {
 *   // All methods will be traced automatically
 *   findUser(id: string) { ... }
 *   updateUser(id: string, data: any) { ... }
 * }
 * ```
 *
 * @example
 * ```typescript
 * @TraceAllMethods({ captureArgs: false, excludePrivate: false })
 * @Injectable()
 * class PaymentService {
 *   processPayment(data: PaymentData) { ... } // Args not captured
 *   _internalMethod() { ... } // Will be traced (excludePrivate: false)
 * }
 * ```
 */
export function TraceAllMethods(options: TraceAllMethodsOptions = {}) {
  return function <T extends Type>(target: T): T {
    // Set metadata to indicate this class has @TraceAllMethods
    Reflect.defineMetadata(TRACE_ALL_METHODS_KEY, true, target);

    const className = target.name;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const prototype = target.prototype;

    // Get all methods that should be traced
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const methodNames = getTraceableMethodNames(prototype, options);

    // Wrap each method with tracing
    for (const methodName of methodNames) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const originalMethod = prototype[methodName];

      if (typeof originalMethod === 'function') {
        // Check if method has @TraceMethod decorator options
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const traceMethodOptions = getTraceMethodOptions(prototype, methodName);

        // Merge options, with @TraceMethod taking precedence
        const effectiveOptions: TraceMethodOptions = {};

        if (traceMethodOptions?.captureArgs !== undefined) {
          effectiveOptions.captureArgs = traceMethodOptions.captureArgs;
        } else if (options.captureArgs !== undefined) {
          effectiveOptions.captureArgs = options.captureArgs;
        }

        if (traceMethodOptions?.spanName !== undefined) {
          effectiveOptions.spanName = traceMethodOptions.spanName;
        } else if (options.spanNamePrefix) {
          effectiveOptions.spanName = `${options.spanNamePrefix}.${methodName}`;
        }

        // Create the traced method
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const tracedMethod = createTracedMethod(originalMethod, className, methodName, effectiveOptions);

        // Replace the original method
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        prototype[methodName] = tracedMethod;
      }
    }

    return target;
  };
}

/**
 * Method decorator that customizes tracing for individual methods.
 * Can be used on any method to override default tracing behavior.
 *
 * @param spanName - Custom span name for the method. Defaults to "ClassName.methodName"
 * @param captureArgs - Whether to capture method arguments in the span. Defaults to true
 *
 * @example
 * ```typescript
 * class UserService {
 *   @TraceMethod('user-lookup', false)
 *   findUser(id: string) { ... }
 *
 *   @TraceMethod('user-update')
 *   updateUser(id: string, data: any) { ... }
 * }
 * ```
 */
export function TraceMethod(spanName?: string, captureArgs = true) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const options: TraceMethodOptions = {
      captureArgs,
      ...(spanName !== undefined && { spanName }),
    };
    Reflect.defineMetadata(TRACE_METHOD_KEY, options, target, propertyKey);
    return descriptor;
  };
}

/**
 * Sanitizes method arguments to prevent logging sensitive data
 */
function sanitizeArguments(args: unknown[]): Record<string, unknown> {
  const sanitizedArgs: Record<string, unknown> = {};

  for (let i = 0; i < Math.min(args.length, 10); i++) {
    const key = `arg${i.toString()}`;
    const value = args[i];

    if (value === null || value === undefined) {
      sanitizedArgs[key] = value;
    } else if (typeof value === 'object') {
      // For objects, try to get a meaningful identifier
      const obj = value as Record<string, unknown>;
      if ('id' in obj && obj['id'] !== undefined) {
        sanitizedArgs[key] = `{id: ${String(obj['id'])}}`;
      } else if ('name' in obj && obj['name'] !== undefined) {
        sanitizedArgs[key] = `{name: ${String(obj['name'])}}`;
      } else if ('email' in obj && obj['email'] !== undefined) {
        sanitizedArgs[key] = `{email: ${String(obj['email'])}}`;
      } else {
        sanitizedArgs[key] = `{${Object.keys(obj).join(', ')}}`;
      }
    } else if (typeof value === 'string') {
      // Check for sensitive data patterns
      const sensitivePatterns = [/password/i, /token/i, /secret/i, /key/i, /auth/i, /bearer/i, /jwt/i];

      const isSensitive = sensitivePatterns.some((pattern) => pattern.test(key));
      sanitizedArgs[key] = isSensitive ? '[REDACTED]' : value;
    } else {
      sanitizedArgs[key] = value;
    }
  }

  return sanitizedArgs;
}
