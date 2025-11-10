/**
 * List of sensitive field names to mask in log data
 * Uses lowercase for case-insensitive matching
 * Optimized for high-volume request processing with simple string comparison
 */
const SENSITIVE_FIELDS = [
  // Authentication & Authorization
  'access_token',
  'accesstoken',
  'apikey',
  'bearer',
  'jwt',
  'key',
  'password',
  'pin',
  'secret',
  'secretkey',
  'token',
  'webhook_authentication_token',
  'securitycredential',
  // Payment & Card Data
  'accountnumber',
  'card',
  'credit',
  'cvc',
  'cvv',
  'number',
  'pan',
  // Personal Identifiable Information (PII)
  'address',
  'email',
  'identifiervalue',
  'identitynumber',
  'idnumber',
  'phone',
  'social',
  'ssn',
  'surname',
] as const;

/**
 * Additional sensitive fields added at runtime
 */
let additionalSensitiveFields: string[] = [];

/**
 * Add additional sensitive field names to the masking list
 * @param fields - Array of field names to mask (will be converted to lowercase)
 */
export function addSensitiveFields(fields: string[]): void {
  additionalSensitiveFields.push(...fields.map((f) => f.toLowerCase()));
}

/**
 * Get all sensitive fields (default + additional)
 * @returns Combined array of all sensitive field names
 */
export function getAllSensitiveFields(): string[] {
  return [...SENSITIVE_FIELDS, ...additionalSensitiveFields];
}

/**
 * Check if a field name should be masked
 * @param key - The field name to check
 * @returns True if the field should be masked
 */
function isSensitiveField(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return (
    SENSITIVE_FIELDS.includes(lowerKey as (typeof SENSITIVE_FIELDS)[number]) ||
    additionalSensitiveFields.includes(lowerKey)
  );
}

/**
 * Recursively masks sensitive fields in objects and arrays
 *
 * This utility function traverses through objects and arrays to identify
 * and mask sensitive information before logging. It handles circular references
 * and preserves the original data structure while replacing sensitive values
 * with masked placeholders.
 *
 * @param data - The data to be masked (can be any type)
 * @param visited - WeakSet to track visited objects for circular reference detection
 * @returns The data with sensitive information masked
 */
export function maskSensitiveFields(data: unknown, visited = new WeakSet()): unknown {
  // Handle null, undefined, and primitive types
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  // Preserve Date objects as-is
  if (data instanceof Date) {
    return data;
  }

  // Check for circular references
  if (visited.has(data)) {
    return '[Circular Reference]';
  }

  // Add current object to visited set
  visited.add(data);

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveFields(item, visited));
  }

  // Handle objects
  return Object.entries(data).reduce((accumulator, [key, value]) => {
    // Check if the key (case-insensitive) should be masked
    if (isSensitiveField(key)) {
      return { ...accumulator, [key]: '[MASKED]' };
    }

    // Recursively process the value
    return { ...accumulator, [key]: maskSensitiveFields(value, visited) };
  }, {});
}

/**
 * Reset additional sensitive fields (primarily for testing)
 */
export function resetAdditionalSensitiveFields(): void {
  additionalSensitiveFields = [];
}
