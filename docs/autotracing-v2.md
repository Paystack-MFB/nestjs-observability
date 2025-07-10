# Auto-Tracing V2: Simplified Interceptor-Based Approach

## Overview

Implement automatic tracing for NestJS applications using interceptors for controllers and decorators for services, eliminating the complexity of DiscoveryModule while maintaining flexible control.

## Core Principles

### 1. Interceptor-Based Controller Tracing

- **Default interceptor** automatically traces all controller methods
- **No DiscoveryModule** required - leverages NestJS's natural request flow
- **Simpler implementation** with better performance
- **Cleaner coordination** between tracing and HTTP context

### 2. Decorator-Based Service Tracing

- **Explicit opt-in** for services using `@TraceClass()`
- **Method-level control** with `@Trace()` and `@NoTrace()`
- **Manual tracing** with existing `@Trace()` decorator
- **No automatic discovery** - developers choose what to trace

### 3. Unified Control System

- **Consistent decorator API** across controllers and services
- **Predictable behavior** - no hidden auto-instrumentation
- **Easy debugging** - clear trace origins

## Implementation Strategy

### Phase 1: Enhanced Controller Interceptor

Replace the complex auto-instrumentation service with a comprehensive controller interceptor:

```typescript
@Injectable()
export class AutoTraceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const className = context.getClass().name;
    const methodName = context.getHandler().name;

    // Check for @NoTrace decorator
    if (this.isNoTrace(context)) {
      return next.handle();
    }

    // Get custom options from @Trace decorator
    const options = this.getTraceOptions(context);

    // Create span with controller-specific attributes
    return this.createControllerSpan(context, next, options);
  }
}
```

### Phase 2: Service Decorator System

Keep the existing decorator approach but simplify it:

```typescript
// Opt-in for service tracing
@Injectable()
@TraceClass()
export class UserService {
  // Auto-traced with decorator-based instrumentation
  async findById(id: string) { ... }

  @NoTrace()
  private internalHelper() { ... }
}

// Manual method tracing (existing)
@Injectable()
export class PaymentService {
  @Trace('process-payment')
  async processPayment(amount: number) { ... }
}
```

### Phase 3: Remove DiscoveryModule

- Remove `AutoInstrumentationService`
- Remove `DiscoveryModule` dependency
- Simplify module registration
- Clean up coordination logic

## New Architecture

### Controller Flow

```
HTTP Request → AutoTraceInterceptor → Controller Method → Response
                      ↓
                 [Automatic Span]
                      ↓
                [HTTP Attributes]
                      ↓
                [Method Context]
```

### Service Flow

```
Service Method → @TraceClass/@Trace → Manual Span Creation
                                      ↓
                                 [Method Context]
```

## API Design

### Controller Auto-Tracing (Default)

```typescript
@Controller('users')
export class UserController {
  // ✅ Auto-traced by interceptor as "UserController.getUsers"
  async getUsers() { ... }

  // ✅ Custom span name via decorator
  @Trace('fetch-user-profile')
  async getUserById(@Param('id') id: string) { ... }

  // ❌ Not traced (explicitly excluded)
  @NoTrace()
  async healthCheck() { ... }
}
```

### Service Opt-in Tracing

```typescript
// Explicit opt-in with @TraceClass
@Injectable()
@TraceClass()
export class UserService {
  // ✅ Traced with decorator-based instrumentation
  async findById(id: string) { ... }

  // ✅ Custom span name
  @Trace('user-creation')
  async createUser(data: CreateUserDto) { ... }

  // ❌ Not traced (explicitly excluded)
  @NoTrace()
  private validateUser(user: User) { ... }
}

// Manual tracing for specific methods
@Injectable()
export class PaymentService {
  // ✅ Manual tracing with @Trace decorator
  @Trace('process-payment')
  async processPayment(amount: number) { ... }

  // ❌ Not traced (no decorator)
  async calculateTax(amount: number) { ... }
}
```

## Implementation Details

### 1. AutoTraceInterceptor

```typescript
@Injectable()
export class AutoTraceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const className = context.getClass().name;
    const methodName = context.getHandler().name;

    // Check for @NoTrace on method or class
    if (this.hasNoTrace(context)) {
      return next.handle();
    }

    // Get @Trace options if present
    const traceOptions = this.getTraceOptions(context);
    const spanName = traceOptions?.spanName ?? `${className}.${methodName}`;

    // Create span with full context
    return this.tracer.startActiveSpan(spanName, (span) => {
      // Add controller-specific attributes
      span.setAttribute('controller.name', className);
      span.setAttribute('controller.method', methodName);

      // Add HTTP attributes
      this.addHttpAttributes(span, context);

      // Add arguments if enabled
      if (traceOptions?.captureArgs !== false) {
        this.addArgumentAttributes(span, context);
      }

      return next.handle().pipe(
        tap({
          next: () => span.setStatus({ code: SpanStatusCode.OK }),
          error: (error) => this.handleError(span, error),
          finalize: () => span.end(),
        })
      );
    });
  }
}
```

### 2. Decorator-Based Service Tracing

Keep the existing decorator system but remove the DiscoveryModule dependency:

```typescript
// Enhanced @TraceClass decorator
export function TraceClass(options?: TraceClassOptions) {
  return function <T extends Type>(target: T): T {
    // Use method interception instead of discovery
    const originalMethods = getTraceableMethodNames(target.prototype);

    originalMethods.forEach((methodName) => {
      const original = target.prototype[methodName];
      target.prototype[methodName] = createTracedMethod(original, target.name, methodName);
    });

    return target;
  };
}
```

### 3. Module Simplification

```typescript
@Module({
  providers: [
    LoggerService,
    MetricsService,
    TracingService,
    // Remove AutoInstrumentationService
    {
      provide: APP_INTERCEPTOR,
      useClass: AutoTraceInterceptor, // Single interceptor for all tracing
    },
  ],
  // Remove DiscoveryModule import
  imports: [ConfigModule],
})
export class ObservabilityModule {}
```

## Important Distinction: OpenTelemetry Auto-Instrumentations vs Controller Tracing

This implementation maintains **two separate automatic tracing systems**:

1. **OpenTelemetry Auto-Instrumentations** - Built-in OpenTelemetry instrumentations that automatically trace:

   - HTTP requests and responses
   - Database calls (MongoDB, PostgreSQL, MySQL, etc.)
   - Redis operations
   - File system operations
   - Network operations
   - Third-party library calls

2. **Our Custom Controller Tracing** - The `AutoTraceInterceptor` that automatically traces:
   - Controller method execution
   - Method arguments (with sanitization)
   - Controller-specific context
   - Method-level metrics

**Both systems work together** to provide comprehensive tracing coverage without interfering with each other.

## Configurable Argument Sanitization

The AutoTraceInterceptor supports configurable argument sanitization for **controller method tracing only**. This doesn't affect OpenTelemetry's automatic instrumentations.

### Configuration Structure

```typescript
import { ObservabilityModule } from '@paystackhq/nestjs-observability';

@Module({
  imports: [
    ObservabilityModule.forRoot({
      tracing: {
        // OpenTelemetry auto-instrumentations (keep these enabled)
        instrumentations: {
          autoInstrumentations: true, // Enables HTTP, DB, etc. tracing
          disabled: [], // Optionally disable specific ones
          overrides: {}, // Override specific configurations
        },

        // Our controller tracing configuration
        argumentSanitization: {
          enabled: true,
          maxStringLength: 150,
          redactedPlaceholder: '[SENSITIVE]',
          identifierFields: ['id', 'userId', 'name', 'email', 'orderId'],
          additionalSensitivePatterns: [/api[_-]?key/i, /database[_-]?url/i, /session[_-]?id/i],
        },
      },
    }),
  ],
})
export class AppModule {}
```

### Default Behavior

**OpenTelemetry Auto-Instrumentations:** Enabled by default, traces HTTP requests, database calls, etc.

**Controller Argument Sanitization:** Redacts values matching these patterns:

- `password`, `token`, `secret`, `key`, `auth`, `bearer`, `jwt`
- `credit`, `card`, `ssn`, `social`

### Example Configuration

#### Example 1: Basic Setup (Recommended)

```typescript
ObservabilityModule.forRoot({
  tracing: {
    // Keep OpenTelemetry auto-instrumentations enabled
    instrumentations: {
      autoInstrumentations: true,
    },

    // Configure controller tracing
    argumentSanitization: {
      enabled: true,
      additionalSensitivePatterns: [/api[_-]?key/i, /database[_-]?url/i],
    },
  },
});
```

#### Example 2: Disable Specific OpenTelemetry Instrumentations

```typescript
ObservabilityModule.forRoot({
  tracing: {
    // Keep most OpenTelemetry auto-instrumentations, disable specific ones
    instrumentations: {
      autoInstrumentations: true,
      disabled: ['fs', 'net'], // Disable file system and network tracing
    },

    // Enhanced controller tracing
    argumentSanitization: {
      enabled: true,
      maxStringLength: 200,
      redactedPlaceholder: '[REDACTED_BY_POLICY]',
      identifierFields: ['id', 'companyId', 'userId', 'tenantId'],
      additionalSensitivePatterns: [/employee[_-]?id/i, /salary/i, /medical/i],
    },
  },
});
```

#### Example 3: Disable Controller Argument Capture Only

```typescript
ObservabilityModule.forRoot({
  tracing: {
    // Keep all OpenTelemetry auto-instrumentations
    instrumentations: {
      autoInstrumentations: true,
    },

    // Disable only controller argument capture
    argumentSanitization: {
      enabled: false,
    },
  },
});
```

### What Gets Traced

**OpenTelemetry Auto-Instrumentations will trace:**

- `HTTP GET /api/users` (incoming request)
- `SELECT * FROM users` (database query)
- `Redis SET user:123` (cache operation)

**Controller Tracing will trace:**

- `UserController.getUsers()` (method execution)
- Method arguments: `{id=123, status=active}` (sanitized)
- Controller-specific metrics and context

### How It Works

1. **OpenTelemetry Layer**: Automatically instruments libraries and frameworks
2. **Controller Layer**: Our `AutoTraceInterceptor` adds method-level tracing
3. **Argument Sanitization**: Applied only to controller method arguments
4. **No Interference**: Both systems create separate spans in the same trace

### Best Practices

1. **Keep OpenTelemetry Auto-Instrumentations Enabled** - They provide valuable infrastructure-level tracing
2. **Customize Controller Argument Sanitization** - Add patterns specific to your domain
3. **Monitor Trace Volume** - Both systems generate spans, monitor your tracing costs
4. **Use Sampling** - Configure appropriate sampling rates for production
5. **Test Thoroughly** - Verify sensitive data is redacted in controller traces only

## Benefits

### Simplicity

- **No DiscoveryModule** - eliminates complex reflection and discovery logic
- **Single interceptor** - one place to handle all controller tracing
- **Predictable behavior** - interceptors are well-understood NestJS concept
- **Easier debugging** - clear execution flow

### Performance

- **Faster startup** - no discovery phase during app initialization
- **Lower overhead** - interceptors are optimized for request handling
- **Better memory usage** - no static registries or complex caching

### Maintainability

- **Clear separation** - controllers use interceptors, services use decorators
- **Explicit control** - developers choose what to trace
- **Easier testing** - interceptors are easy to test in isolation
- **Cleaner code** - less coordination between components

### Developer Experience

- **Familiar patterns** - interceptors are standard NestJS
- **Consistent API** - same decorators work everywhere
- **Better error messages** - simpler stack traces
- **Easier customization** - modify one interceptor vs complex service

## Migration Path

### Step 1: Implement AutoTraceInterceptor

1. Create new comprehensive interceptor
2. Add support for all existing decorators
3. Ensure HTTP context is properly captured
4. Test with existing controllers

### Step 2: Enhance Decorator System

1. Improve @TraceClass to work without discovery
2. Ensure @Trace and @NoTrace work on controllers
3. Keep compatibility with existing @Trace decorator
4. Test with existing services

### Step 3: Remove DiscoveryModule

1. Remove AutoInstrumentationService
2. Remove DiscoveryModule dependency
3. Simplify module registration
4. Clean up coordination logic

### Step 4: Update Documentation

1. Update examples to show new approach
2. Document migration from v1 to v2
3. Provide clear guidelines for when to use what
4. Update troubleshooting guides

## Examples

### Basic Controller (Zero Config)

```typescript
@Controller('orders')
export class OrderController {
  // Auto-traced by interceptor
  async getOrders() { ... }
  async createOrder(data: CreateOrderDto) { ... }
}
```

### Advanced Controller

```typescript
@Controller('payments')
export class PaymentController {
  @Trace('payment-processing')
  async processPayment(data: PaymentDto) { ... }

  @Trace('sensitive-operation', { captureArgs: false })
  async updatePaymentMethod(userId: string, method: PaymentMethod) { ... }

  @NoTrace()
  async healthCheck() { ... }
}
```

### Service with Auto-Tracing

```typescript
@Injectable()
@TraceClass()
export class OrderService {
  async processOrder(order: Order) { ... }

  @NoTrace()
  private validateOrder(order: Order) { ... }
}
```

### Service with Manual Tracing

```typescript
@Injectable()
export class EmailService {
  @Trace('send-email')
  async sendEmail(to: string, template: string) { ... }

  // Not traced
  async validateEmail(email: string) { ... }
}
```

## Implementation Status

### Current Status: ✅ Phase 3 Complete

**Last Updated:** January 2025

#### Phase 1: Enhanced Controller Interceptor

- [x] Create new `AutoTraceInterceptor` class
- [x] Add support for `@NoTrace` decorator detection
- [x] Add support for `@Trace` decorator options
- [x] Implement HTTP context capture
- [x] Add argument capture functionality
- [x] Integrate with ObservabilityModule
- [x] Replace current `ControllerMethodTraceInterceptor`
- [ ] Test with existing controllers

#### Phase 2: Enhanced Decorator System

- [x] Modify `@TraceClass` to work without discovery
- [x] Add `TraceClassOptions` interface for configuration
- [x] Add `createTracedMethod` utility function
- [x] Add argument sanitization for security
- [x] Enhanced `getTraceableMethodNames` with filtering
- [ ] Fix linter errors in enhanced decorators
- [ ] Test with existing services
- [ ] Test compatibility with existing `@Trace` decorator

#### Phase 3: Remove DiscoveryModule

- [x] Remove `AutoInstrumentationService`
- [x] Remove `DiscoveryModule` dependency from module
- [x] Simplify module registration
- [x] Clean up coordination logic
- [x] Update configuration
- [x] Fix TypeScript compilation errors

#### Phase 4: Update Documentation

- [ ] Update examples to show new approach
- [ ] Document migration from v1 to v2
- [ ] Provide clear guidelines for usage
- [ ] Update troubleshooting guides

### Next Steps

1. **~~Implement AutoTraceInterceptor~~** - ✅ **COMPLETED** - Created the new comprehensive interceptor
2. **~~Replace current interceptors~~** - ✅ **COMPLETED** - Updated the module to use the new AutoTraceInterceptor
3. **~~Enhance decorator system~~** - ✅ **COMPLETED** - Enhanced decorators to work without discovery
4. **~~Remove DiscoveryModule~~** - ✅ **COMPLETED** - Removed complex auto-instrumentation code
5. **Test with existing controllers** - Ensure the new interceptor works with existing controllers
6. **Documentation and examples** - Update documentation and examples

## Conclusion

This approach provides:

- **Simpler implementation** with interceptors handling controllers naturally
- **Explicit control** with decorators for services
- **Better performance** without discovery overhead
- **Cleaner architecture** with clear separation of concerns
- **Easier maintenance** with standard NestJS patterns

The result is a more maintainable, performant, and developer-friendly auto-tracing system that leverages NestJS's strengths instead of fighting against them.
