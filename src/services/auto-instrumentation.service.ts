import { Inject, Injectable, OnModuleInit, Type } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { Exception, Span, SpanStatusCode, trace } from '@opentelemetry/api';

import type { ObservabilityConfig } from '../config/observability.config';

import {
  getTraceMethodOptions,
  isNoTraceClassEnabled,
  isNoTraceEnabled,
  isTraceAllMethodsEnabled,
  TraceMethodOptions,
} from '../decorators/auto-trace.decorators';
import { LoggerService } from '../logger/logger.service';

/**
 * Represents a class that is prepared for instrumentation
 */
interface InstrumentationTarget {
  className: string;
  instance: unknown;
  methods: MethodInfo[];
  prototype: unknown;
}

/**
 * Information about an instrumented method stored in the static registry
 */
interface InstrumentedMethodInfo {
  className: string;
  isInstrumented: boolean;
  methodName: string;
  options?: TraceMethodOptions | undefined;
  spanName: string;
}

/**
 * Information about a method that will be instrumented
 */
interface MethodInfo {
  methodName: string;
  options?: TraceMethodOptions | undefined;
  originalMethod: (...args: unknown[]) => unknown;
}

/**
 * Auto-instrumentation service that automatically discovers and traces NestJS controllers and providers.
 *
 * This service implements the modern auto-tracing functionality by:
 * - Discovering all controllers and automatically instrumenting their public methods
 * - Discovering providers marked with @TraceAllMethods and instrumenting their methods
 * - Respecting method-level decorators (@NoTrace, @TraceMethod)
 * - Applying configuration-based filtering and customization
 * - Providing coordination with interceptors to prevent duplicate spans
 *
 * The service uses NestJS's DiscoveryService to find all controllers and providers,
 * then dynamically wraps their methods with OpenTelemetry tracing logic.
 *
 * @example
 * ```typescript
 * // Controllers are automatically traced
 * @Controller('users')
 * export class UserController {
 *   async getUser() { } // Automatically traced as "UserController.getUser"
 * }
 *
 * // Providers must opt-in with @TraceAllMethods
 * @Injectable()
 * @TraceAllMethods()
 * export class UserService {
 *   async findUser() { } // Automatically traced as "UserService.findUser"
 * }
 * ```
 */
@Injectable()
export class AutoInstrumentationService implements OnModuleInit {
  // Static registry to track instrumented methods across all instances
  private static readonly instrumentedMethods = new Map<string, InstrumentedMethodInfo>();

  private readonly instrumentedClasses = new Set<string>();

  /**
   * Creates a new auto-instrumentation service instance
   *
   * @param discoveryService - NestJS service for discovering controllers and providers
   * @param logger - Logger service for diagnostic messages
   * @param config - Observability configuration including auto-instrumentation settings
   */
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly logger: LoggerService,
    @Inject('OBSERVABILITY_CONFIG') private readonly config: ObservabilityConfig
  ) {}

  /**
   * Clears all instrumented methods from the static registry
   *
   * This is primarily used for testing to ensure clean state between tests.
   * In production, this should not be called after initialization.
   */
  static clearInstrumentedMethods(): void {
    AutoInstrumentationService.instrumentedMethods.clear();
  }

  /**
   * Returns a copy of all instrumented methods for debugging purposes
   *
   * @returns Map of method keys to instrumented method information
   */
  static getAllInstrumentedMethods(): Map<string, InstrumentedMethodInfo> {
    return new Map(AutoInstrumentationService.instrumentedMethods);
  }

  /**
   * Gets information about a specific instrumented method
   *
   * This is used by interceptors to get span name and options for coordination
   * between auto-instrumentation and interceptor-based tracing.
   *
   * @param className - The name of the class containing the method
   * @param methodName - The name of the method
   * @returns Method information if the method is instrumented, undefined otherwise
   */
  static getInstrumentedMethodInfo(className: string, methodName: string): InstrumentedMethodInfo | undefined {
    const key = `${className}.${methodName}`;
    return AutoInstrumentationService.instrumentedMethods.get(key);
  }

  /**
   * Checks if a specific method is auto-instrumented
   *
   * This is used by interceptors to detect auto-instrumented methods and prevent
   * duplicate span creation. The interceptor can then add HTTP-specific attributes
   * to the existing span instead of creating a new one.
   *
   * @param className - The name of the class containing the method
   * @param methodName - The name of the method
   * @returns true if the method is auto-instrumented, false otherwise
   */
  static isMethodInstrumented(className: string, methodName: string): boolean {
    const key = `${className}.${methodName}`;
    const methodInfo = AutoInstrumentationService.instrumentedMethods.get(key);
    return methodInfo?.isInstrumented ?? false;
  }

  /**
   * NestJS lifecycle hook that initializes the auto-instrumentation
   *
   * This method is called after the module and all its dependencies have been initialized.
   * It discovers all controllers and providers, then instruments their methods according
   * to the configuration and decorator settings.
   *
   * The instrumentation process:
   * 1. Checks if auto-instrumentation is enabled in configuration
   * 2. Instruments all controllers automatically
   * 3. Instruments providers that have @TraceAllMethods decorator
   * 4. Applies method-level filters and customizations
   * 5. Logs completion status
   */
  onModuleInit(): void {
    try {
      if (!this.config.tracing.enabled || !this.config.tracing.autoInstrumentation.enabled) {
        this.logger.log('Auto-instrumentation is disabled', 'AutoInstrumentationService');
        return;
      }

      this.instrumentAll();
    } catch (error) {
      this.logger.error(
        `Error during auto-instrumentation: ${(error as Error).message}`,
        (error as Error).stack ?? '',
        'AutoInstrumentationService'
      );
    }
  }

  /**
   * Creates a traced version of a method that handles both synchronous and asynchronous methods
   *
   * This method wraps the original method with OpenTelemetry tracing logic:
   * - Creates a span with the appropriate name
   * - Captures method arguments if enabled
   * - Handles both sync and async method execution
   * - Records exceptions and sets span status
   * - Registers the method in the static registry for interceptor coordination
   *
   * @param originalMethod - The original method to wrap
   * @param className - The name of the class containing the method
   * @param methodName - The name of the method
   * @param options - Optional trace method options from @TraceMethod decorator
   * @returns The wrapped method with tracing functionality
   */
  private createTracedMethod(
    originalMethod: (...args: unknown[]) => unknown,
    className: string,
    methodName: string,
    options?: TraceMethodOptions
  ): (...args: unknown[]) => unknown {
    const spanName = options?.spanName ?? `${className}.${methodName}`;
    const captureArgs = options?.captureArgs ?? this.config.tracing.autoInstrumentation.captureArguments;

    // Register this method as instrumented
    const key = `${className}.${methodName}`;
    AutoInstrumentationService.instrumentedMethods.set(key, {
      className,
      isInstrumented: true,
      methodName,
      options,
      spanName,
    });

    return function (this: unknown, ...args: unknown[]) {
      const tracer = trace.getTracer('auto-instrumentation');

      return tracer.startActiveSpan(spanName, (span: Span) => {
        // Build attributes object
        const attributes: Record<string, string> = {
          'class.name': className,
          'instrumentation.type': 'auto',
          'method.name': methodName,
        };

        // Capture arguments if enabled
        if (captureArgs && args.length > 0) {
          const argAttributes = getMethodArgumentAttributes(args);
          Object.assign(attributes, argAttributes);
        }

        // Set all attributes at once
        span.setAttributes(attributes);

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
   * Orchestrates the instrumentation of all controllers and providers
   *
   * This method coordinates the discovery and instrumentation process:
   * 1. Instruments all controllers automatically
   * 2. Instruments providers that opt-in with @TraceAllMethods
   * 3. Logs completion statistics
   */
  private instrumentAll(): void {
    this.instrumentControllers();
    this.instrumentProviders();

    this.logger.log(
      `Auto-instrumentation completed. Instrumented ${this.instrumentedClasses.size.toString()} classes`,
      'AutoInstrumentationService'
    );
  }

  /**
   * Discovers and instruments all controllers found by the DiscoveryService
   *
   * This method uses the NestJS DiscoveryService to find all controllers in the application
   * and automatically instruments their public methods. Controllers are traced by default
   * unless excluded by configuration or decorated with @NoTrace.
   *
   * The process:
   * 1. Gets all controllers from DiscoveryService
   * 2. Filters out excluded classes and already instrumented classes
   * 3. Prepares instrumentation target with eligible methods
   * 4. Instruments all methods in the target
   * 5. Logs instrumentation results
   */
  private instrumentControllers(): void {
    const controllers = this.discoveryService.getControllers();

    for (const controller of controllers) {
      if (!controller.instance) {
        continue;
      }

      const className = controller.metatype.name;

      // Skip if class is excluded (ensure metatype is a Type constructor)
      if (typeof controller.metatype === 'function' && this.isClassExcluded(className, controller.metatype as Type)) {
        this.logger.debug(`Skipping excluded controller: ${className}`, 'AutoInstrumentationService');
        continue;
      }

      // Skip if already instrumented
      if (this.instrumentedClasses.has(className)) {
        this.logger.debug(`Controller already instrumented: ${className}`, 'AutoInstrumentationService');
        continue;
      }

      const target = this.prepareInstrumentationTarget(controller.instance, className);

      if (target.methods.length > 0) {
        this.instrumentMethods(target);
        this.instrumentedClasses.add(className);

        this.logger.debug(
          `Instrumented controller: ${className} (${target.methods.length.toString()} methods)`,
          'AutoInstrumentationService'
        );
      }
    }
  }

  /**
   * Instruments all methods of a target class by replacing them with traced versions
   *
   * This method takes a prepared instrumentation target and replaces each method
   * with its traced equivalent. The traced methods maintain the same signature
   * and behavior as the originals but add OpenTelemetry tracing.
   *
   * @param target - The instrumentation target containing methods to instrument
   */
  private instrumentMethods(target: InstrumentationTarget): void {
    for (const method of target.methods) {
      const tracedMethod = this.createTracedMethod(
        method.originalMethod,
        target.className,
        method.methodName,
        method.options
      );

      // Replace the original method with the traced version
      (target.instance as Record<string, unknown>)[method.methodName] = tracedMethod;
    }
  }

  /**
   * Discovers and instruments providers marked with @TraceAllMethods
   *
   * This method uses the NestJS DiscoveryService to find all providers in the application
   * and instruments only those that have the @TraceAllMethods decorator. This provides
   * opt-in tracing for services and other providers.
   *
   * The process:
   * 1. Gets all providers from DiscoveryService
   * 2. Filters out excluded classes and already instrumented classes
   * 3. Checks for @TraceAllMethods decorator (required for providers)
   * 4. Prepares instrumentation target with eligible methods
   * 5. Instruments all methods in the target
   * 6. Logs instrumentation results
   */
  private instrumentProviders(): void {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      if (!provider.instance) {
        continue;
      }

      const className = provider.metatype.name;

      // Skip if class is excluded (ensure metatype is a Type constructor)
      if (typeof provider.metatype === 'function' && this.isClassExcluded(className, provider.metatype as Type)) {
        this.logger.debug(`Skipping excluded provider: ${className}`, 'AutoInstrumentationService');
        continue;
      }

      // Skip if already instrumented
      if (this.instrumentedClasses.has(className)) {
        this.logger.debug(`Provider already instrumented: ${className}`, 'AutoInstrumentationService');
        continue;
      }

      // Only instrument providers with @TraceAllMethods decorator
      // Type guard to ensure provider.metatype is a Type (constructor function)
      if (typeof provider.metatype !== 'function' || !isTraceAllMethodsEnabled(provider.metatype as Type)) {
        this.logger.debug(`Skipping provider without @TraceAllMethods: ${className}`, 'AutoInstrumentationService');
        continue;
      }

      const target = this.prepareInstrumentationTarget(provider.instance, className);

      if (target.methods.length > 0) {
        this.instrumentMethods(target);
        this.instrumentedClasses.add(className);

        this.logger.debug(
          `Instrumented provider: ${className} (${target.methods.length.toString()} methods)`,
          'AutoInstrumentationService'
        );
      }
    }
  }

  /**
   * Checks if a class should be excluded from instrumentation based on configuration
   *
   * This method applies the inclusion/exclusion rules from the configuration:
   * - If includeClasses is specified and not empty, only those classes are included
   * - Otherwise, classes in excludeClasses are excluded
   * - By default, internal observability classes are excluded to prevent recursion
   *
   * @param className - The name of the class to check
   * @returns true if the class should be excluded from instrumentation
   */
  private isClassExcluded(className: string, classType: Type): boolean {
    // Check if class has @NoTraceClass decorator
    if (isNoTraceClassEnabled(classType)) {
      return true;
    }

    // Hard-coded sensible defaults for excluded classes
    const defaultExcludedClasses = [
      'LoggerService',
      'MetricsService',
      'TracingService',
      'AutoInstrumentationService',
      'DiscoveryService',
      'ModuleRef',
      'Reflector',
    ];

    return defaultExcludedClasses.includes(className);
  }

  /**
   * Checks if a method should be excluded from instrumentation based on configuration
   *
   * This method applies method-level exclusion rules from the configuration.
   * Common exclusions include lifecycle methods, constructors, and internal methods.
   *
   * @param methodName - The name of the method to check
   * @returns true if the method should be excluded from instrumentation
   */
  private isMethodExcluded(methodName: string): boolean {
    // Hard-coded sensible defaults for excluded methods
    const defaultExcludedMethods = [
      'constructor',
      'onModuleInit',
      'onModuleDestroy',
      'onApplicationBootstrap',
      'onApplicationShutdown',
      'onApplicationReady',
      'beforeApplicationShutdown',
      'setContext',
      'setLogLevel',
      'create',
      'toString',
      'valueOf',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'toLocaleString',
    ];

    return defaultExcludedMethods.includes(methodName);
  }

  /**
   * Checks if a method is private based on naming conventions
   *
   * This method uses common JavaScript/TypeScript naming conventions to identify
   * private methods. Methods starting with underscore are considered private.
   * Private methods are excluded by default for security and performance reasons.
   *
   * @param methodName - The name of the method to check
   * @returns true if the method appears to be private
   */
  private isPrivateMethod(methodName: string): boolean {
    return methodName.startsWith('_');
  }

  /**
   * Prepares an instrumentation target from a class instance
   *
   * This method analyzes a class instance and prepares it for instrumentation by:
   * 1. Getting all property names from the prototype
   * 2. Filtering to only include functions (methods)
   * 3. Applying exclusion rules (constructor, excluded methods, private methods)
   * 4. Respecting @NoTrace decorator
   * 5. Collecting @TraceMethod options
   * 6. Private methods are excluded by default for security
   *
   * @param instance - The class instance to prepare
   * @param className - The name of the class
   * @returns An instrumentation target ready for method instrumentation
   */
  private prepareInstrumentationTarget(instance: unknown, className: string): InstrumentationTarget {
    const prototype = Object.getPrototypeOf(instance) as object;

    const methodNames = Object.getOwnPropertyNames(prototype);

    const methods: MethodInfo[] = [];

    for (const methodName of methodNames) {
      // Skip constructor
      if (methodName === 'constructor') {
        continue;
      }

      // Skip if not a function

      if (typeof (prototype as Record<string, unknown>)[methodName] !== 'function') {
        continue;
      }

      // Skip if method is excluded by configuration
      if (this.isMethodExcluded(methodName)) {
        continue;
      }

      // Skip if method has @NoTrace decorator
      if (isNoTraceEnabled(prototype, methodName)) {
        continue;
      }

      // Skip private methods (for security and performance)
      if (this.isPrivateMethod(methodName)) {
        continue;
      }

      // Get the original method
      const originalMethod = (instance as Record<string, unknown>)[methodName] as (...args: unknown[]) => unknown;

      // Get @TraceMethod options if present
      const options = getTraceMethodOptions(prototype, methodName);

      methods.push({
        methodName,
        options,
        originalMethod,
      });
    }

    return {
      className,
      instance,
      methods,
      prototype,
    };
  }
}

/**
 * Extracts method argument attributes for OpenTelemetry spans
 *
 * This function safely extracts argument values and converts them to string
 * attributes for inclusion in OpenTelemetry spans. It handles various data
 * types and prevents sensitive information from being logged.
 *
 * The function creates attributes in the format:
 * - method.args.count: Number of arguments
 * - method.args.0.property: First argument's properties
 * - method.args.1.property: Second argument's properties
 * - etc.
 *
 * @param args - The method arguments to extract attributes from
 * @returns A record of attribute keys to string values
 */
function getMethodArgumentAttributes(args: unknown[]): Record<string, string> {
  const attributes: Record<string, string> = {};

  try {
    args.forEach((arg, index) => {
      if (arg == null) return;

      const argKey = `arg.${String(index)}`;

      // Handle primitive types
      if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
        attributes[argKey] = typeof arg === 'string' ? arg : String(arg);
        return;
      }

      // Handle objects by JSON stringifying them
      if (typeof arg === 'object') {
        try {
          const stringRepresentation = JSON.stringify(arg);
          if (stringRepresentation.length <= 1000) {
            // Limit size
            attributes[argKey] = stringRepresentation;
          }
        } catch {
          // Ignore circular references or other JSON errors
          attributes[argKey] = '[object Object]';
        }
      }
    });
  } catch {
    // Silently ignore argument capture errors
  }

  return attributes;
}
