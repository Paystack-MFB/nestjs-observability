import { Span, trace } from '@opentelemetry/api';

// Default sensitive name patterns - these cannot be overridden by users
const DEFAULT_SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /auth/i,
  /bearer/i,
  /jwt/i,
  /credit/i,
  /card/i,
  /ssn/i,
  /social/i,
  /email/i,
  /phone/i,
  /address/i,
];

/**
 * Adds a single attribute to the current active span with automatic sanitization
 * @param key - The attribute key
 * @param value - The attribute value
 */
export function addSpanAttribute(key: string, value: unknown): void {
  const span = getCurrentSpan();
  if (!span) {
    return;
  }

  const sanitizedValue = sanitizeAttributeValue(key, value);
  span.setAttribute(key, sanitizedValue);
}

/**
 * Adds multiple attributes to the current active span with automatic sanitization
 * @param attributes - Object containing key-value pairs of attributes
 */
export function addSpanAttributes(attributes: Record<string, unknown>): void {
  const span = getCurrentSpan();
  if (!span) {
    return;
  }

  for (const [key, value] of Object.entries(attributes)) {
    const sanitizedValue = sanitizeAttributeValue(key, value);
    span.setAttribute(key, sanitizedValue);
  }
}

/**
 * Adds multiple attributes to the current active span without sanitization
 * Use this when you're certain the attributes are safe
 * @param attributes - Object containing key-value pairs of attributes
 */
export function addSpanAttributesUnsafe(attributes: Record<string, unknown>): void {
  const span = getCurrentSpan();
  if (!span) {
    return;
  }

  for (const [key, value] of Object.entries(attributes)) {
    span.setAttribute(key, String(value));
  }
}

/**
 * Adds a single attribute to the current active span without sanitization
 * Use this when you're certain the attribute is safe
 * @param key - The attribute key
 * @param value - The attribute value
 */
export function addSpanAttributeUnsafe(key: string, value: unknown): void {
  const span = getCurrentSpan();
  if (!span) {
    return;
  }

  span.setAttribute(key, String(value));
}

/**
 * Add an event to the current active span
 * @param name - Event name
 * @param attributes - Optional event attributes
 */
export function addSpanEvent(name: string, attributes?: Record<string, unknown>): void {
  const span = getCurrentSpan();
  if (!span) {
    return;
  }

  if (attributes) {
    const sanitizedAttributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(attributes)) {
      sanitizedAttributes[key] = sanitizeAttributeValue(key, value);
    }
    span.addEvent(name, sanitizedAttributes);
  } else {
    span.addEvent(name);
  }
}

/**
 * Gets the current active span
 * @returns The current active span or undefined if no span is active
 */
export function getCurrentSpan(): Span | undefined {
  const span = trace.getActiveSpan();
  return span ?? undefined;
}

/**
 * Get the current span ID
 * @returns Span ID string or undefined if no active span
 */
export function getCurrentSpanId(): string | undefined {
  const span = getCurrentSpan();
  if (span) {
    const spanContext = span.spanContext();
    return spanContext.spanId;
  }
  return undefined;
}

/**
 * Get the current trace ID
 * @returns Trace ID string or undefined if no active span
 */
export function getCurrentTraceId(): string | undefined {
  const span = getCurrentSpan();
  if (span) {
    const spanContext = span.spanContext();
    return spanContext.traceId;
  }
  return undefined;
}

/**
 * Check if a span is currently active
 * @returns True if there is an active span
 */
export function hasActiveSpan(): boolean {
  return getCurrentSpan() !== undefined;
}

/**
 * Check if a key would be considered sensitive
 * @param key - The key to check
 * @returns True if the key matches sensitive patterns
 */
export function isSensitiveKey(key: string): boolean {
  return DEFAULT_SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Record an exception in the current active span
 * @param exception - The exception to record
 */
export function recordSpanException(exception: Error): void {
  const span = getCurrentSpan();
  if (!span) {
    return;
  }

  span.recordException(exception);
  span.setStatus({ code: 2, message: exception.message }); // ERROR
}

/**
 * Set the status of the current active span
 * @param status - Span status ('OK' or 'ERROR')
 * @param message - Optional status message
 */
export function setSpanStatus(status: 'ERROR' | 'OK', message?: string): void {
  const span = getCurrentSpan();
  if (!span) {
    return;
  }

  const code = status === 'OK' ? 1 : 2;
  if (message) {
    span.setStatus({ code, message });
  } else {
    span.setStatus({ code });
  }
}

/**
 * Get the redacted placeholder value from environment or use default
 * @returns Placeholder string for redacted values
 */
function getRedactedPlaceholder(): string {
  return process.env['OTEL_SPAN_ATTRIBUTE_REDACTED_PLACEHOLDER'] || '[REDACTED]';
}

/**
 * Check if span attribute sanitization is enabled via environment variable
 * @returns True if sanitization is enabled
 */
function isSanitizationEnabled(): boolean {
  const envValue = process.env['OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED'];
  if (envValue === undefined) {
    return true; // Default to enabled
  }
  return envValue.toLowerCase() === 'true' || envValue === '1';
}

/**
 * Sanitizes an attribute value based on its name
 * @param key - Attribute key
 * @param value - Attribute value
 * @returns Sanitized string value
 */
function sanitizeAttributeValue(key: string, value: unknown): string {
  if (!isSanitizationEnabled()) {
    return String(value);
  }

  // Check if attribute name matches sensitive patterns
  const isSensitive = DEFAULT_SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));

  if (isSensitive) {
    return getRedactedPlaceholder();
  }

  return String(value);
}
