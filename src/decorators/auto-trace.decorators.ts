import { Type } from '@nestjs/common';
import 'reflect-metadata';

// Metadata keys for the decorators
const TRACE_ALL_METHODS_KEY = 'trace:all-methods';
const TRACE_METHOD_KEY = 'trace:method';
const NO_TRACE_KEY = 'trace:no-trace';
const NO_TRACE_CLASS_KEY = 'trace:no-trace-class';

// Interface for TraceMethod options
export interface TraceMethodOptions {
  captureArgs?: boolean;
  spanName?: string;
}

/**
 * Gets all method names from a class prototype that should be traced.
 * This filters out constructors, non-functions, and methods with @NoTrace.
 *
 * @param prototype - The class prototype
 * @returns Array of method names that should be traced
 */
export function getTraceableMethodNames(prototype: object): string[] {
  return Object.getOwnPropertyNames(prototype)
    .filter((name) => name !== 'constructor')
    .filter((name) => typeof (prototype as Record<string, unknown>)[name] === 'function')
    .filter((name) => !isNoTraceEnabled(prototype, name));
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

// Helper functions for metadata reading

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
 * Class decorator that enables tracing for all methods of a class.
 * Use this decorator on providers/services to opt-in to auto-tracing.
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
 */
export function TraceAllMethods() {
  return function <T extends Type>(target: T): T {
    Reflect.defineMetadata(TRACE_ALL_METHODS_KEY, true, target);
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
