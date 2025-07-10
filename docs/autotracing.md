# Auto-Tracing Implementation Plan

## Overview

Implement automatic tracing for NestJS applications with decorator-based customization, providing seamless observability without complex configuration.

## Core Principles

### 1. Default Behavior

- **Controllers**: Auto-traced by default (no decorator required)
- **Providers/Services**: Opt-in via `@TraceClass()` decorator
- **Methods**: All public methods traced unless excluded

### 2. Decorator-Based Control

- Use decorators for customization and exclusion
- Simple, intuitive API
- No configuration files needed

## Implementation Strategy

### Phase 1: Core Decorators

#### `@TraceClass()` - Enable tracing for all methods in a provider

```typescript
@Injectable()
@TraceClass()
export class UserService {
  // All public methods automatically traced
  async getUserById(id: string) { ... }
  async createUser(userData: CreateUserDto) { ... }
  async updateUser(id: string, data: UpdateUserDto) { ... }
}
```

#### `@Trace()` - Customize method tracing

```typescript
@Controller('users')
export class UserController {
  // Custom span name
  @Trace('fetch-user-profile')
  async getUserById(id: string) { ... }

  // Disable argument capture for sensitive data
  @Trace(undefined, false)
  async updatePassword(userId: string, password: string) { ... }
}
```

#### `@NoTrace()` - Exclude methods from tracing

```typescript
@Controller('users')
export class UserController {
  // This method won't be traced
  @NoTrace()
  async healthCheck() { ... }

  // This method will be auto-traced
  async getUsers() { ... }
}
```

### Phase 2: Auto-Instrumentation Service

#### Controller Auto-Discovery

```typescript
@Injectable()
export class AutoInstrumentationService implements OnModuleInit {
  async onModuleInit() {
    // Discover all controllers
    // Automatically instrument public methods
    // Respect @NoTrace() exclusions
    // Apply @Trace() customizations
  }
}
```

#### Provider Discovery

```typescript
// Only instrument providers marked with @TraceClass()
// Respect method-level decorators for customization
```

## API Design

### Controller Auto-Tracing (Default)

```typescript
@Controller('users')
export class UserController {
  // ✅ Auto-traced as "UserController.getUsers"
  async getUsers() { ... }

  // ✅ Auto-traced as "UserController.getUserById"
  async getUserById(@Param('id') id: string) { ... }

  // ❌ Not traced (explicitly excluded)
  @NoTrace()
  async internalMethod() { ... }
}
```

### Provider Opt-in Tracing

```typescript
@Injectable()
@TraceClass()
export class UserService {
  // ✅ Auto-traced as "UserService.findById"
  async findById(id: string) { ... }

  // ✅ Custom span name "user-creation"
  @Trace('user-creation')
  async createUser(data: CreateUserDto) { ... }

  // ❌ Not traced (explicitly excluded)
  @NoTrace()
  private validateUser(user: User) { ... }
}
```

### Manual Tracing (Existing)

```typescript
@Injectable()
export class PaymentService {
  // ✅ Manual tracing with @Trace decorator
  @Trace('process-payment')
  async processPayment(amount: number) { ... }

  // ❌ Not traced (no decorator, no class-level auto-tracing)
  async calculateTax(amount: number) { ... }
}
```

## Implementation Details

### 1. Decorator Hierarchy

- `@TraceClass()` - Class-level enablement
- `@Trace()` - Method-level customization
- `@NoTrace()` - Method-level exclusion
- `@Trace()` - Manual method tracing (existing)

### 2. Span Naming Convention

- Controller methods: `{ControllerName}.{methodName}`
- Provider methods: `{ServiceName}.{methodName}`
- Custom names: Use provided span name
- HTTP routes: Include route pattern in attributes

### 3. Argument Capture

- Enabled by default for non-sensitive methods
- Disabled for methods with `@Trace(undefined, false)`
- Smart filtering of sensitive data (passwords, tokens)
- Capture common identifiers (id, name, etc.)

### 4. Integration Points

- Module initialization for auto-discovery
- Metadata scanning for decorator detection
- Existing interceptor coordination
- Logger service integration

## Migration Strategy

### Phase 1: Core Infrastructure

1. Create new decorators (`@TraceClass`, `@Trace`, `@NoTrace`)
2. Build auto-instrumentation service
3. Integrate with existing observability module

### Phase 2: Controller Auto-Tracing

1. Implement controller discovery
2. Auto-instrument controller methods
3. Respect exclusion decorators
4. Test with existing HTTP interceptor

### Phase 3: Provider Opt-in

1. Implement provider discovery
2. Process `@TraceClass` decorator
3. Apply method-level customizations
4. Ensure compatibility with manual `@Trace`

### Phase 4: Cleanup

1. Deprecate old complex decorators
2. Update documentation
3. Migrate examples
4. Remove unused code

## Benefits

### For Developers

- **Zero Configuration**: Controllers traced automatically
- **Opt-in Complexity**: Providers only traced when needed
- **Flexible Control**: Method-level customization available
- **Familiar API**: Decorator-based, follows NestJS patterns

### For Operations

- **Comprehensive Coverage**: All controller endpoints traced
- **Consistent Naming**: Predictable span names
- **Smart Defaults**: Sensible argument capture
- **Performance**: Minimal overhead with targeted instrumentation

## Examples

### Basic Usage

```typescript
// No changes needed - auto-traced
@Controller('orders')
export class OrderController {
  async getOrders() { ... }
  async createOrder(data: CreateOrderDto) { ... }
}

// Opt-in for service tracing
@Injectable()
@TraceClass()
export class OrderService {
  async processOrder(order: Order) { ... }
}
```

### Advanced Customization

```typescript
@Controller('payments')
export class PaymentController {
  @Trace('payment-processing')
  async processPayment(data: PaymentDto) { ... }

  @Trace('sensitive-operation', false) // No args
  async updatePaymentMethod(userId: string, method: PaymentMethod) { ... }

  @NoTrace()
  async healthCheck() { ... }
}
```

### Mixed Approach

```typescript
@Injectable()
export class UserService {
  // Manual tracing for specific methods
  @Trace('user-authentication')
  async authenticate(credentials: LoginDto) { ... }

  // No tracing for utility methods
  async hashPassword(password: string) { ... }
}

@Injectable()
@TraceClass()
export class NotificationService {
  // All methods auto-traced
  async sendEmail(to: string, subject: string) { ... }

  @NoTrace()
  async formatMessage(template: string, data: any) { ... }
}
```
