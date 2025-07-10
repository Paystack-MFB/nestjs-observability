# Manual Span Attributes API

## Overview

The NestJS Observability library now provides simple and powerful APIs for manually adding span attributes to your traces. This approach gives you full control over what gets traced while maintaining security through automatic sanitization.

## Key Features

- **Manual Control**: You decide exactly what attributes to add to spans
- **Automatic Sanitization**: Sensitive data is automatically redacted based on attribute names
- **Default Security**: Built-in patterns protect common sensitive fields
- **Extensible**: Add your own sensitive patterns via configuration
- **Performance**: No overhead from automatic argument processing

## API Reference

### `getCurrentSpan(): Span | undefined`

Gets the current active span. Returns `undefined` if no span is currently active.

```typescript
import { getCurrentSpan } from '@paystackhq/nestjs-observability';

const span = getCurrentSpan();
if (span) {
  // Use span directly for advanced operations
  span.setAttribute('custom.field', 'value');
}
```

### `addSpanAttribute(key: string, value: unknown): void`

Adds a single attribute to the current active span with automatic sanitization.

```typescript
import { addSpanAttribute } from '@paystackhq/nestjs-observability';

addSpanAttribute('user.id', userId);
addSpanAttribute('operation.type', 'user-lookup');
addSpanAttribute('user.email', email); // Automatically redacted
```

### `addSpanAttributes(attributes: Record<string, unknown>): void`

Adds multiple attributes to the current active span with automatic sanitization.

```typescript
import { addSpanAttributes } from '@paystackhq/nestjs-observability';

addSpanAttributes({
  'user.id': userId,
  'operation.type': 'user-update',
  'user.password': password, // Automatically redacted
  'response.size': dataSize,
});
```

## Automatic Sanitization

### Default Sensitive Patterns

The following patterns are **built-in** and cannot be overridden:

- `/password/i` - Matches "password", "Password", "PASSWORD", etc.
- `/token/i` - Matches "token", "accessToken", "refreshToken", etc.
- `/secret/i` - Matches "secret", "clientSecret", "apiSecret", etc.
- `/key/i` - Matches "key", "apiKey", "secretKey", etc.
- `/auth/i` - Matches "auth", "authorization", "authenticate", etc.
- `/bearer/i` - Matches "bearer", "bearerToken", etc.
- `/jwt/i` - Matches "jwt", "jwtToken", etc.
- `/credit/i` - Matches "credit", "creditCard", "creditNumber", etc.
- `/card/i` - Matches "card", "cardNumber", "cardInfo", etc.
- `/ssn/i` - Matches "ssn", "socialSecurityNumber", etc.
- `/social/i` - Matches "social", "socialSecurity", etc.

### Configuration

You can extend the default patterns by providing additional sensitive patterns:

```typescript
ObservabilityModule.forRoot({
  // ... other config
  tracing: {
    attributeSanitization: {
      enabled: true,
      redactedPlaceholder: '[REDACTED]',
      additionalSensitivePatterns: [/custom-secret/i, /internal-key/i, /private-data/i],
    },
    // ... other tracing config
  },
});
```

## Usage Examples

### Basic Usage

```typescript
import { Injectable } from '@nestjs/common';
import { TraceClass, addSpanAttribute, addSpanAttributes } from '@paystackhq/nestjs-observability';

@Injectable()
@TraceClass()
export class UserService {
  async findUser(id: string) {
    // Add single attributes
    addSpanAttribute('user.id', id);
    addSpanAttribute('operation.type', 'user-lookup');

    const user = await this.userRepository.findById(id);

    // Add multiple attributes
    addSpanAttributes({
      'user.found': !!user,
      'user.email': user?.email, // Automatically redacted
      'response.size': JSON.stringify(user).length,
    });

    return user;
  }
}
```

### Advanced Usage

```typescript
import { Injectable } from '@nestjs/common';
import { TraceClass, getCurrentSpan, addSpanAttribute } from '@paystackhq/nestjs-observability';

@Injectable()
@TraceClass()
export class PaymentService {
  async processPayment(paymentData: PaymentData) {
    // Get current span for advanced operations
    const span = getCurrentSpan();
    if (span) {
      span.setAttribute('payment.method', paymentData.method);
      span.setAttribute('payment.currency', paymentData.currency);
    }

    // Add conditional attributes
    if (paymentData.amount > 1000) {
      addSpanAttribute('payment.high_value', true);
    }

    try {
      const result = await this.paymentGateway.process(paymentData);

      addSpanAttributes({
        'payment.success': true,
        'payment.transaction_id': result.transactionId,
        'payment.credit_card': paymentData.creditCard, // Automatically redacted
      });

      return result;
    } catch (error) {
      addSpanAttribute('payment.error', error.message);
      throw error;
    }
  }
}
```

### Error Handling

The span attribute APIs are designed to be safe and non-blocking:

```typescript
// These calls will safely do nothing if no span is active
addSpanAttribute('user.id', userId); // No-op if no active span
addSpanAttributes(attributes); // No-op if no active span

// getCurrentSpan() returns undefined if no span is active
const span = getCurrentSpan();
if (span) {
  // Only execute if span is available
  span.setAttribute('custom.field', 'value');
}
```

## Migration from Automatic Arguments

If you were previously using automatic argument capture, you'll need to update your code:

### Before (Automatic)

```typescript
@Injectable()
@TraceClass({ captureArgs: true }) // ❌ No longer supported
export class UserService {
  async findUser(id: string, options: FindOptions) {
    // Arguments were automatically captured
    return this.userRepository.findById(id, options);
  }
}
```

### After (Manual)

```typescript
@Injectable()
@TraceClass() // ✅ Simplified - no captureArgs option
export class UserService {
  async findUser(id: string, options: FindOptions) {
    // Manually add only the attributes you need
    addSpanAttribute('user.id', id);
    addSpanAttribute('query.limit', options.limit);
    addSpanAttribute('query.offset', options.offset);

    return this.userRepository.findById(id, options);
  }
}
```

## Benefits

1. **Security**: Only trace what you explicitly choose to trace
2. **Performance**: No overhead from automatic argument processing
3. **Flexibility**: Full control over attribute names and values
4. **Maintainability**: Clear and explicit tracing code
5. **Compliance**: Easier to ensure sensitive data is not traced

## Best Practices

1. **Use Descriptive Names**: Choose clear, consistent attribute names

   ```typescript
   addSpanAttribute('user.id', userId); // ✅ Clear
   addSpanAttribute('id', userId); // ❌ Ambiguous
   ```

2. **Group Related Attributes**: Use prefixes to group related attributes

   ```typescript
   addSpanAttributes({
     'user.id': userId,
     'user.role': userRole,
     'user.active': isActive,
   });
   ```

3. **Add Context Early**: Add important context attributes at the beginning of methods

   ```typescript
   async processOrder(orderId: string) {
     addSpanAttribute('order.id', orderId);
     addSpanAttribute('operation.type', 'order-processing');

     // ... rest of method
   }
   ```

4. **Use Conditional Attributes**: Add attributes based on conditions

   ```typescript
   if (isHighValue) {
     addSpanAttribute('order.high_value', true);
   }
   ```

5. **Trust the Sanitization**: The system will automatically redact sensitive data
   ```typescript
   addSpanAttributes({
     'user.email': user.email, // Automatically redacted
     'auth.token': token, // Automatically redacted
     'user.name': user.name, // Not redacted
   });
   ```
