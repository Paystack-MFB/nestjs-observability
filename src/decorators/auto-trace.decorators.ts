// ABOUTME: Decorators for controlling tracing and logging on classes and methods.
// ABOUTME: Provides @TraceClass, @Trace, @NoTrace, @NoTraceClass, @NoLog, @NoLogClass.

import { Type } from '@nestjs/common';
import { Exception, Span, SpanStatusCode, trace } from '@opentelemetry/api';
import 'reflect-metadata';

// Metadata keys for the decorators
const TRACE_ALL_METHODS_KEY = 'trace:all-methods';
const TRACE_METHOD_KEY = 'trace:method';
const NO_TRACE_KEY = 'trace:no-trace';
const NO_TRACE_CLASS_KEY = 'trace:no-trace-class';
const NO_LOG_KEY = 'log:no-log';
const NO_LOG_CLASS_KEY = 'log:no-log-class';

// Static registry of classes decorated with @NoTraceClass.
// Populated at decoration time so IgnoredRouteScanner can iterate them
// without depending on DiscoveryService.
const noTraceClasses = new Set<Type>();

/**
 * Returns the set of classes decorated with @NoTraceClass.
 */
export function getNoTraceClasses(): ReadonlySet<Type> {
  return noTraceClasses;
}

/**
 * Clears the @NoTraceClass registry. For testing only.
 */
export function resetNoTraceClasses(): void {
  noTraceClasses.clear();
}

// Interface for TraceClass options
export interface TraceClassOptions {
  excludePrivate?: boolean;
  spanNamePrefix?: string;
}

// Interface for Trace options
export interface TraceOptions {
  spanName?: string;
}

/**
 * Creates a traced version of a method that handles both synchronous and asynchronous methods
 */
export function createTracedMethod(
  originalMethod: (...args: unknown[]) => unknown,
  className: string,
  methodName: string,
  options?: TraceOptions
): (...args: unknown[]) => unknown {
  const spanName = options?.spanName ?? `${className}.${methodName}`;

  return function (this: unknown, ...args: unknown[]) {
    const tracer = trace.getTracer('auto-trace-decorators');

    return tracer.startActiveSpan(spanName, (span: Span) => {
      // Set basic attributes
      span.setAttributes({
        'class.name': className,
        'instrumentation.type': 'decorator',
        'method.name': methodName,
      });

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
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: errorMessage,
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: errorMessage,
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
export function getTraceableMethodNames(prototype: object, options: TraceClassOptions = {}): string[] {
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
 * Gets the Trace options for a specific method.
 *
 * @param target - The class prototype or instance
 * @param propertyKey - The method name
 * @returns TraceOptions if the method has @Trace decorator, undefined otherwise
 */
export function getTraceOptions(target: object, propertyKey: string): TraceOptions | undefined {
  return Reflect.getMetadata(TRACE_METHOD_KEY, target, propertyKey) as TraceOptions | undefined;
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

/**
 * Checks if a class has the @NoLogClass decorator applied.
 *
 * @param target - The class constructor to check
 * @returns true if the class is decorated with @NoLogClass
 */
export function isNoLogClassEnabled(target: Type): boolean {
  return Reflect.getMetadata(NO_LOG_CLASS_KEY, target) === true;
}

/**
 * Checks if a method has the @NoLog decorator applied.
 *
 * @param target - The class prototype or instance
 * @param propertyKey - The method name
 * @returns true if the method is decorated with @NoLog
 */
export function isNoLogEnabled(target: object, propertyKey: string): boolean {
  return Reflect.getMetadata(NO_LOG_KEY, target, propertyKey) === true;
}

// Helper functions for metadata reading

/**
 * Checks if a class has the @TraceClass decorator applied.
 *
 * @param target - The class constructor to check
 * @returns true if the class is decorated with @TraceClass
 */
export function isTraceClassEnabled(target: Type): boolean {
  return Reflect.getMetadata(TRACE_ALL_METHODS_KEY, target) === true;
}

/**
 * Method decorator that excludes a method from tracing.
 * Use this to exclude specific methods from auto-tracing when using @TraceClass.
 *
 * @example
 * ```typescript
 * @TraceClass()
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
    noTraceClasses.add(target);
    return target;
  };
}

/**
 * Method decorator that excludes a method from request/response logging.
 * Use this to exclude specific methods from auto-logging.
 *
 * @example
 * ```typescript
 * @Controller('users')
 * class UserController {
 *   getUser(id: string) { ... } // Will be logged
 *
 *   @NoLog()
 *   getHealth() { ... } // Will NOT be logged
 * }
 * ```
 */
export function NoLog() {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(NO_LOG_KEY, true, target, propertyKey);
    return descriptor;
  };
}

/**
 * Class decorator that excludes an entire class from request/response logging.
 * Use this to exclude specific controllers or providers from auto-logging.
 *
 * @example
 * ```typescript
 * @Controller('health')
 * @NoLogClass()
 * class HealthController {
 *   // No methods will be logged automatically
 *   getHealth() { ... }
 * }
 * ```
 */
export function NoLogClass() {
  return function <T extends Type>(target: T): T {
    Reflect.defineMetadata(NO_LOG_CLASS_KEY, true, target);
    return target;
  };
}

/**
 * Method decorator that customizes tracing for individual methods.
 * Can be used on any method to override default tracing behavior.
 *
 * @param spanName - Custom span name for the method. Defaults to "ClassName.methodName"
 *
 * @example
 * ```typescript
 * class UserService {
 *   @Trace('user-lookup')
 *   findUser(id: string) { ... }
 *
 *   @Trace('user-update')
 *   updateUser(id: string, data: any) { ... }
 * }
 * ```
 */
export function Trace(spanName?: string) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const options: TraceOptions = {
      ...(spanName !== undefined && { spanName }),
    };
    Reflect.defineMetadata(TRACE_METHOD_KEY, options, target, propertyKey);
    return descriptor;
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
 * @TraceClass()
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
 * @TraceClass({ excludePrivate: false })
 * @Injectable()
 * class PaymentService {
 *   processPayment(data: PaymentData) { ... }
 *   _internalMethod() { ... } // Will be traced (excludePrivate: false)
 * }
 * ```
 */
export function TraceClass(options: TraceClassOptions = {}) {
  return function <T extends Type>(target: T): T {
    // Set metadata to indicate this class has @TraceClass
    Reflect.defineMetadata(TRACE_ALL_METHODS_KEY, true, target);

    const className = target.name;
    const prototype = target.prototype as Record<string, unknown>;

    // Get all methods that should be traced
    const methodNames = getTraceableMethodNames(prototype, options);

    // Wrap each method with tracing
    for (const methodName of methodNames) {
      const originalMethod = prototype[methodName];

      if (typeof originalMethod === 'function') {
        // Check if method has @Trace decorator options
        const traceOptions = getTraceOptions(prototype, methodName);

        // Merge options, with @Trace taking precedence
        const effectiveOptions: TraceOptions = {};

        if (traceOptions?.spanName !== undefined) {
          effectiveOptions.spanName = traceOptions.spanName;
        } else if (options.spanNamePrefix) {
          effectiveOptions.spanName = `${options.spanNamePrefix}.${methodName}`;
        }

        // Create the traced method
        const typedOriginalMethod = originalMethod as (...args: unknown[]) => unknown;
        const tracedMethod = createTracedMethod(typedOriginalMethod, className, methodName, effectiveOptions);

        // Replace the original method
        prototype[methodName] = tracedMethod;
      }
    }

    return target;
  };
}
