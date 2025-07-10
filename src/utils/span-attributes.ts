import { Span, trace } from '@opentelemetry/api';

import { AttributeSanitizationConfig } from '../config/observability.config';

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
];

// Global configuration for attribute sanitization
let globalSanitizationConfig: AttributeSanitizationConfig = {
  additionalSensitivePatterns: [],
  enabled: true,
  redactedPlaceholder: '[REDACTED]',
};

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
 * Gets the current active span
 * @returns The current active span or undefined if no span is active
 */
export function getCurrentSpan(): Span | undefined {
  const span = trace.getActiveSpan();
  return span ?? undefined;
}

/**
 * Sets the global sanitization configuration
 * This is called by the ObservabilityModule during initialization
 */
export function setAttributeSanitizationConfig(config: AttributeSanitizationConfig): void {
  globalSanitizationConfig = config;
}

/**
 * Sanitizes an attribute value based on its name
 */
function sanitizeAttributeValue(key: string, value: unknown): string {
  if (!globalSanitizationConfig.enabled) {
    return String(value);
  }

  // Combine hardcoded default patterns with user's additional patterns
  const allPatterns = [...DEFAULT_SENSITIVE_PATTERNS, ...globalSanitizationConfig.additionalSensitivePatterns];

  // Check if attribute name matches sensitive patterns
  const isSensitive = allPatterns.some((pattern) => pattern.test(key));

  if (isSensitive) {
    return globalSanitizationConfig.redactedPlaceholder;
  }

  return String(value);
}
