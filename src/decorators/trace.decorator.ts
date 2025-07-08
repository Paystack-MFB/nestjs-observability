import { AttributeValue, Exception, Span, SpanStatusCode, trace } from '@opentelemetry/api';

/**
 * Simplified decorator to trace method execution
 *
 * @param spanName Optional custom span name (defaults to method name)
 * @param captureArgs Whether to capture method arguments (default: true)
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * // Basic usage
 * @Trace()
 * async getUserById(id: string) { ... }
 *
 * // Custom span name
 * @Trace('fetch-user-profile')
 * async getUserById(id: string) { ... }
 *
 * // Without argument capture
 * @Trace(undefined, false)
 * async processLargeData(data: unknown[]) { ... }
 * ```
 */
export function Trace(spanName?: string, captureArgs = true) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) {
      throw new Error('Method descriptor value is required');
    }

    const className = target.constructor.name;

    descriptor.value = async function (this: unknown, ...args: Parameters<T>) {
      const tracer = trace.getTracer('application-tracer');
      const finalSpanName = spanName ?? `${className}.${propertyKey}`;

      return tracer.startActiveSpan(finalSpanName, async (span: Span) => {
        // Add basic attributes
        span.setAttributes({
          'class.name': className,
          'method.name': propertyKey,
        });

        // Capture arguments if enabled
        if (captureArgs && args.length > 0) {
          captureMethodArguments(span, args);
        }

        try {
          const result = await originalMethod.apply(this, args);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          span.recordException(error as Exception);
          throw error;
        } finally {
          span.end();
        }
      });
    } as T;

    return descriptor;
  };
}

/**
 * Simplified argument capture - only captures serializable values
 */
function captureMethodArguments(span: Span, args: unknown[]): void {
  try {
    args.forEach((arg, index) => {
      if (arg == null) return;

      const argKey = `arg.${String(index)}`;

      // Handle primitive types
      if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
        span.setAttribute(argKey, arg as AttributeValue);
        return;
      }

      // Handle objects - try to extract common identifying fields
      if (typeof arg === 'object') {
        const obj = arg as Record<string, unknown>;

        // Common ID fields
        if ('id' in obj && (typeof obj['id'] === 'string' || typeof obj['id'] === 'number')) {
          span.setAttribute(`${argKey}.id`, String(obj['id']));
        }

        // Common name fields
        if ('name' in obj && typeof obj['name'] === 'string') {
          span.setAttribute(`${argKey}.name`, obj['name']);
        }

        // For arrays, capture length
        if (Array.isArray(arg)) {
          span.setAttribute(`${argKey}.length`, arg.length);
        }
      }
    });
  } catch {
    // Silently ignore argument capture errors
  }
}
