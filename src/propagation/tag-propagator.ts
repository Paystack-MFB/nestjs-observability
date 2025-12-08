import { Context, TextMapGetter, TextMapPropagator, TextMapSetter } from '@opentelemetry/api';
import { getLoggerContextValue } from '../logger/logger-context-storage';

/**
 * Custom OpenTelemetry propagator that adds the tag header to outgoing HTTP requests
 * Matches legacy ps-api behavior of propagating Tag header (Title-Case) to downstream services
 *
 * This propagator reads the tag from logger context (AsyncLocalStorage) and injects it
 * as a 'Tag' header on all outgoing HTTP requests made during request processing.
 */
export class TagPropagator implements TextMapPropagator {
  /**
   * Inject the tag into outgoing request headers
   * Reads tag from AsyncLocalStorage context and adds it as 'Tag' header (Title-Case)
   */
  inject(_context: Context, carrier: unknown, setter: TextMapSetter): void {
    // Get tag from logger context (AsyncLocalStorage)
    const tag = getLoggerContextValue('tag');

    // Only inject if tag is a non-empty string
    if (tag && typeof tag === 'string') {
      // Use Title-Case 'Tag' header to match ps-api convention
      setter.set(carrier, 'Tag', tag);
    }
  }

  /**
   * Extract is not needed for our use case (we only propagate outbound)
   * Tag extraction happens in the instrumentation middleware from incoming request headers
   */
  extract(context: Context, _carrier: unknown, _getter: TextMapGetter): Context {
    // No-op: Tag extraction is handled by the instrumentation middleware
    return context;
  }

  /**
   * Return the list of fields used by this propagator
   */
  fields(): string[] {
    return ['Tag'];
  }
}
