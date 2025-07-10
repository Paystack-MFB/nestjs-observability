# Migration Plan: Manual Span Attributes

## Overview

This plan outlines the migration from automatic argument logging to manual span attribute management. This change provides users with full control over what gets traced while maintaining security through name-based sanitization.

## 🎯 Goals

1. **Remove Automatic Argument Capture**: Eliminate all automatic argument logging from decorators and interceptors
2. **Simplify Configuration**: Remove complex sanitization configuration in favor of simple regex patterns
3. **Provide Manual APIs**: Create easy-to-use APIs for adding span attributes
4. **Maintain Security**: Keep sanitization based on attribute name patterns
5. **Improve Performance**: Reduce overhead by eliminating automatic argument processing

## 📋 Changes Required

### 1. Remove Automatic Argument Capture

#### From Decorators

- Remove `captureArgs` option from `@TraceClass` and `@Trace` decorators
- Remove argument processing from `createTracedMethod`
- Simplify `TraceClassOptions` and `TraceOptions` interfaces

#### From Interceptors

- Remove argument capture from `AutoTraceInterceptor`
- Remove `addArgumentAttributes` method
- Keep only basic span attributes (controller, method, HTTP context)

### 2. Remove Sanitization Service and Configuration

#### Remove Files

- Delete `src/services/sanitization.service.ts`
- Remove `SanitizationService` from module providers

#### Update Configuration

- Remove `ArgumentSanitizationConfig` interface
- Remove `argumentSanitization` from `ObservabilityConfig`
- Add simple `attributeSanitization` configuration

### 3. Create Span Attribute APIs

#### Core API Functions

```typescript
// Get current active span
export function getCurrentSpan(): Span | undefined;

// Add single attribute with automatic sanitization
export function addSpanAttribute(key: string, value: unknown): void;

// Add multiple attributes with automatic sanitization
export function addSpanAttributes(attributes: Record<string, unknown>): void;

// Add attribute without sanitization (for trusted data)
export function addSpanAttributeUnsafe(key: string, value: unknown): void;

// Add attributes with custom sanitization
export function addSpanAttributeWithSanitization(
  key: string,
  value: unknown,
  sanitizer: (value: unknown) => string
): void;
```

#### Helper Functions

```typescript
// Common attribute patterns
export function addUserId(userId: string): void;
export function addRequestId(requestId: string): void;
export function addOperationResult(success: boolean, error?: Error): void;
export function addDatabaseQuery(query: string, params?: Record<string, unknown>): void;
```

### 4. Simple Attribute Sanitization

#### Configuration

```typescript
export interface AttributeSanitizationConfig {
  /**
   * Regex patterns for attribute names that should be redacted
   * @default [/password/i, /token/i, /secret/i, /key/i, /auth/i]
   */
  sensitiveNamePatterns: RegExp[];

  /**
   * Placeholder text for redacted values
   * @default '[REDACTED]'
   */
  redactedPlaceholder: string;

  /**
   * Whether to enable attribute sanitization
   * @default true
   */
  enabled: boolean;
}
```

#### Implementation

```typescript
function sanitizeAttributeValue(key: string, value: unknown, config: AttributeSanitizationConfig): string {
  if (!config.enabled) {
    return String(value);
  }

  // Check if attribute name matches sensitive patterns
  const isSensitive = config.sensitiveNamePatterns.some((pattern) => pattern.test(key));

  if (isSensitive) {
    return config.redactedPlaceholder;
  }

  return String(value);
}
```

## 🔄 Migration Strategy

### Phase 1: Remove Automatic Features

1. Remove argument capture from decorators
2. Remove sanitization service
3. Update configuration structure
4. Update module providers

### Phase 2: Create Manual APIs

1. Create span attribute utility functions
2. Implement simple name-based sanitization
3. Create helper functions for common patterns

### Phase 3: Update Examples and Documentation

1. Update example services to use manual APIs
2. Create migration guide for users
3. Update documentation with new patterns

### Phase 4: Testing and Validation

1. Update all tests to remove sanitization tests
2. Add tests for new span attribute APIs
3. Validate performance improvements

## 📚 API Usage Examples

### Before (Automatic)

```typescript
@TraceClass({ captureArgs: true })
@Injectable()
export class UserService {
  async findUser(id: string, options: FindOptions) {
    // Arguments automatically captured and sanitized
    return this.userRepository.findOne(id, options);
  }
}
```

### After (Manual)

```typescript
@TraceClass()
@Injectable()
export class UserService {
  async findUser(id: string, options: FindOptions) {
    // Manual attribute addition
    addSpanAttribute('user.id', id);
    addSpanAttribute('query.limit', options.limit);
    addSpanAttribute('query.includeDeleted', options.includeDeleted);

    return this.userRepository.findOne(id, options);
  }
}
```

### Advanced Usage

```typescript
@TraceClass()
@Injectable()
export class PaymentService {
  async processPayment(data: PaymentData) {
    // Use helper functions
    addUserId(data.userId);
    addRequestId(data.requestId);

    // Add business attributes
    addSpanAttribute('payment.amount', data.amount);
    addSpanAttribute('payment.currency', data.currency);
    addSpanAttribute('payment.method', data.method);

    // Sensitive data will be automatically redacted
    addSpanAttribute('payment.cardToken', data.cardToken); // Will be [REDACTED]

    try {
      const result = await this.paymentGateway.process(data);
      addOperationResult(true);
      return result;
    } catch (error) {
      addOperationResult(false, error);
      throw error;
    }
  }
}
```

## 🚀 Benefits

1. **Better Performance**: No automatic argument processing overhead
2. **Full Control**: Users decide exactly what gets traced
3. **Cleaner Code**: Explicit attribute additions make code more readable
4. **Simpler Configuration**: Only need to configure sensitive name patterns
5. **Better Security**: Users can choose what sensitive data to trace
6. **Easier Debugging**: Clear visibility into what attributes are being added

## 📦 Breaking Changes

1. **Decorator Options**: `captureArgs` option removed from decorators
2. **Configuration**: `argumentSanitization` configuration removed
3. **Service**: `SanitizationService` no longer available
4. **Automatic Behavior**: Arguments no longer automatically captured

## 🔧 Migration Guide for Users

### Step 1: Remove Argument Sanitization Config

```typescript
// Before
ObservabilityModule.forRoot({
  tracing: {
    argumentSanitization: {
      enabled: true,
      // ... other config
    },
  },
});

// After
ObservabilityModule.forRoot({
  tracing: {
    attributeSanitization: {
      enabled: true,
      sensitiveNamePatterns: [/password/i, /token/i, /secret/i],
      redactedPlaceholder: '[REDACTED]',
    },
  },
});
```

### Step 2: Update Decorators

```typescript
// Before
@TraceClass({ captureArgs: true })
@Trace('custom-span', true)

// After
@TraceClass()
@Trace('custom-span')
```

### Step 3: Add Manual Attributes

```typescript
// Before - arguments captured automatically
async findUser(id: string, options: FindOptions) {
  return this.userRepository.findOne(id, options);
}

// After - manual attribute addition
async findUser(id: string, options: FindOptions) {
  addSpanAttribute('user.id', id);
  addSpanAttribute('query.limit', options.limit);
  return this.userRepository.findOne(id, options);
}
```

## 📋 Implementation Checklist

- [ ] Remove argument capture from decorators
- [ ] Remove SanitizationService
- [ ] Update configuration interfaces
- [ ] Create span attribute APIs
- [ ] Implement name-based sanitization
- [ ] Update interceptor
- [ ] Update examples
- [ ] Update documentation
- [ ] Update tests
- [ ] Performance testing

## 🎯 Success Criteria

1. All automatic argument capture removed
2. Manual span attribute APIs working correctly
3. Name-based sanitization functioning
4. All tests passing
5. Examples updated and working
6. Documentation reflects new approach
7. Performance improved or maintained
