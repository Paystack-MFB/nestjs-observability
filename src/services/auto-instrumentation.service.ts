import { Inject, Injectable, OnModuleInit, Type } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { Exception, Span, SpanStatusCode, trace } from '@opentelemetry/api';

import type { ObservabilityConfig } from '../config/observability.config';

import {
  getTraceableMethodNames,
  getTraceMethodOptions,
  isNoTraceEnabled,
  isTraceAllMethodsEnabled,
  TraceMethodOptions,
} from '../decorators/auto-trace.decorators';
import { LoggerService } from '../logger/logger.service';

interface InstrumentationTarget {
  className: string;
  instance: unknown;
  methods: MethodInfo[];
  prototype: unknown;
}

interface MethodInfo {
  methodName: string;
  options?: TraceMethodOptions | undefined;
  originalMethod: (...args: unknown[]) => unknown;
}

/**
 * Auto-instrumentation service that automatically discovers and traces NestJS controllers and providers.
 *
 * This service implements the auto-tracing functionality by:
 * - Discovering all controllers and automatically instrumenting their public methods
 * - Discovering providers marked with @TraceAllMethods and instrumenting their methods
 * - Respecting method-level decorators (@NoTrace, @TraceMethod)
 * - Applying configuration-based filtering and customization
 */
@Injectable()
export class AutoInstrumentationService implements OnModuleInit {
  private readonly instrumentedClasses = new Set<string>();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly logger: LoggerService,
    @Inject('OBSERVABILITY_CONFIG') private readonly config: ObservabilityConfig
  ) {}

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
   * Creates a traced version of a method that handles both sync and async methods
   */
  private createTracedMethod(
    originalMethod: (...args: unknown[]) => unknown,
    className: string,
    methodName: string,
    options?: TraceMethodOptions
  ): (...args: unknown[]) => unknown {
    const spanName = options?.spanName ?? `${className}.${methodName}`;
    const captureArgs = options?.captureArgs ?? this.config.tracing.autoInstrumentation.captureArguments;

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

  private instrumentAll(): void {
    this.instrumentControllers();
    this.instrumentProviders();

    this.logger.log(
      `Auto-instrumentation completed. Instrumented ${this.instrumentedClasses.size.toString()} classes`,
      'AutoInstrumentationService'
    );
  }

  /**
   * Discovers and instruments all NestJS controllers
   */
  private instrumentControllers(): void {
    const controllers = this.discoveryService.getControllers();

    for (const controller of controllers) {
      if (!controller.instance) {
        continue;
      }

      const className = controller.metatype.name;

      // Skip if class is excluded
      if (this.isClassExcluded(className)) {
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
   * Instruments all methods of a target class
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
   */
  private instrumentProviders(): void {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      if (!provider.instance) {
        continue;
      }

      const className = provider.metatype.name;

      // Skip if class is excluded
      if (this.isClassExcluded(className)) {
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
   * Checks if a class should be excluded from instrumentation
   */
  private isClassExcluded(className: string): boolean {
    const { excludeClasses, includeClasses } = this.config.tracing.autoInstrumentation;

    // If includeClasses is specified and not empty, only include those classes
    if (includeClasses.length > 0) {
      return !includeClasses.includes(className);
    }

    // Otherwise, exclude classes in the excludeClasses list
    return excludeClasses.includes(className);
  }

  /**
   * Checks if a method should be excluded from instrumentation
   */
  private isMethodExcluded(methodName: string): boolean {
    const { excludeMethods } = this.config.tracing.autoInstrumentation;
    return excludeMethods.includes(methodName);
  }

  /**
   * Checks if a method is private (starts with underscore)
   */
  private isPrivateMethod(methodName: string): boolean {
    return methodName.startsWith('_');
  }

  /**
   * Prepares instrumentation target by analyzing the class and its methods
   */
  private prepareInstrumentationTarget(instance: unknown, className: string): InstrumentationTarget {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const prototype = Object.getPrototypeOf(instance);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const methodNames = getTraceableMethodNames(prototype);

    const methods: MethodInfo[] = [];

    for (const methodName of methodNames) {
      // Skip if method is excluded by configuration
      if (this.isMethodExcluded(methodName)) {
        continue;
      }

      // Skip if method has @NoTrace decorator
      if (isNoTraceEnabled(prototype as object, methodName)) {
        continue;
      }

      // Skip private methods unless configured to trace them
      if (this.isPrivateMethod(methodName) && !this.config.tracing.autoInstrumentation.tracePrivateMethods) {
        continue;
      }

      const originalMethod = (instance as Record<string, unknown>)[methodName] as (...args: unknown[]) => unknown;
      if (typeof originalMethod !== 'function') {
        continue;
      }

      // Get method-level options from @TraceMethod decorator
      const options = getTraceMethodOptions(prototype as object, methodName);

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
 * Gets method argument attributes as a record for safe serialization
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
