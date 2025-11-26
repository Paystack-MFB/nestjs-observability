# Best Practices for NestJS Observability

This document outlines best practices for using the NestJS Observability library effectively in production environments.

## Table of Contents

1. [Tracing Best Practices](#tracing-best-practices)
2. [Logging Best Practices](#logging-best-practices)
3. [Metrics Best Practices](#metrics-best-practices)
4. [Configuration Best Practices](#configuration-best-practices)
5. [Performance Best Practices](#performance-best-practices)
6. [Security Best Practices](#security-best-practices)
7. [Production Best Practices](#production-best-practices)
8. [Development Best Practices](#development-best-practices)
9. [Architecture Best Practices](#architecture-best-practices)
10. [Troubleshooting Best Practices](#troubleshooting-best-practices)

## Tracing Best Practices

### When to Use Tracing Decorators

#### ✅ **DO: Use @TraceClass for Business Logic Services**

```typescript
@Injectable()
@TraceClass()
export class UserService {
  // All business methods automatically traced
  async createUser(userData: CreateUserDto): Promise<User> {
    return this.userRepository.create(userData);
  }

  async findUser(id: string): Promise<User> {
    return this.userRepository.findById(id);
  }
}
```

#### ✅ **DO: Use @Trace for Important Operations**

```typescript
@Injectable()
export class PaymentService {
  @Trace('payment.process')
  async processPayment(paymentData: PaymentDto): Promise<Payment> {
    // Critical business operation with custom span name
    return this.paymentProcessor.process(paymentData);
  }
}
```

#### ❌ **DON'T: Trace Utility Services**

```typescript
// Avoid tracing utility services
@Injectable()
export class UtilityService {
  // Don't trace these - they add noise
  formatDate(date: Date): string { ... }
  validateEmail(email: string): boolean { ... }
}
```

### Span Naming Conventions

#### ✅ **DO: Use Descriptive, Hierarchical Names**

```typescript
@Injectable()
@TraceClass()
export class OrderService {
  @Trace('order.validate')
  async validateOrder(order: OrderDto): Promise<void> { ... }

  @Trace('order.process')
  async processOrder(order: OrderDto): Promise<Order> { ... }

  @Trace('order.fulfill')
  async fulfillOrder(orderId: string): Promise<void> { ... }
}
```

#### ❌ **DON'T: Use Generic or Vague Names**

```typescript
// Bad span names
@Trace('process')  // Too generic
@Trace('doStuff')  // Not descriptive
@Trace('method1')  // Meaningless
```

### Excluding Sensitive Operations

#### ✅ **DO: Use @NoTrace for Sensitive Operations**

```typescript
@Injectable()
@TraceClass()
export class AuthService {
  @NoTrace() // Exclude sensitive authentication logic
  private async validateCredentials(credentials: LoginDto): Promise<boolean> {
    // Authentication logic should not be traced
    return this.verifyPassword(credentials.password);
  }

  @NoTrace() // Exclude password hashing
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
```

### Manual Span Attributes

#### ✅ **DO: Add Meaningful Attributes**

```typescript
@Injectable()
@TraceClass()
export class UserService {
  async createUser(userData: CreateUserDto): Promise<User> {
    // Add business context
    addSpanAttributes({
      'user.email': userData.email,
      'user.role': userData.role,
      'user.plan': userData.plan,
      'operation.priority': 'high',
    });

    const user = await this.userRepository.create(userData);

    // Add result attributes
    addSpanAttributes({
      'user.id': user.id,
      'user.created_at': user.createdAt.toISOString(),
      'operation.status': 'success',
    });

    return user;
  }
}
```

#### ❌ **DON'T: Add Sensitive or High-Cardinality Attributes**

```typescript
// Bad attributes
addSpanAttributes({
  'user.password': userData.password, // Sensitive data
  'user.credit_card': userData.creditCard, // Sensitive data
  'request.timestamp': Date.now(), // High cardinality
  'session.id': generateUniqueId(), // High cardinality
});
```

## Logging Best Practices

### Structured Logging

#### ✅ **DO: Use Structured Logging**

```typescript
@Injectable()
export class OrderService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('OrderService');
  }

  async processOrder(orderData: OrderDto): Promise<Order> {
    // Structured log with context
    this.logger.info({
      message: 'Processing order',
      orderId: orderData.id,
      userId: orderData.userId,
      amount: orderData.total,
      currency: orderData.currency,
      timestamp: new Date().toISOString(),
    });

    try {
      const order = await this.createOrder(orderData);

      this.logger.info({
        message: 'Order processed successfully',
        orderId: order.id,
        status: order.status,
        processingTime: Date.now() - startTime,
      });

      return order;
    } catch (error) {
      this.logger.error({
        message: 'Order processing failed',
        orderId: orderData.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
```

#### ❌ **DON'T: Use String Interpolation**

```typescript
// Bad logging practices
this.logger.info(`Processing order ${orderId} for user ${userId}`);
this.logger.error(`Order ${orderId} failed: ${error.message}`);
```

### Log Levels

#### ✅ **DO: Use Appropriate Log Levels**

```typescript
@Injectable()
export class PaymentService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('PaymentService');
  }

  async processPayment(paymentData: PaymentDto): Promise<Payment> {
    // DEBUG: Detailed information for debugging
    this.logger.debug({
      message: 'Starting payment processing',
      paymentId: paymentData.id,
      amount: paymentData.amount,
      provider: paymentData.provider,
    });

    // INFO: General information about normal operations
    this.logger.info({
      message: 'Payment processing initiated',
      paymentId: paymentData.id,
      amount: paymentData.amount,
    });

    try {
      const payment = await this.processPaymentInternal(paymentData);

      // INFO: Successful operations
      this.logger.info({
        message: 'Payment processed successfully',
        paymentId: payment.id,
        status: payment.status,
      });

      return payment;
    } catch (error) {
      if (error instanceof ValidationError) {
        // WARN: Expected errors that don't require immediate attention
        this.logger.warn({
          message: 'Payment validation failed',
          paymentId: paymentData.id,
          error: error.message,
        });
      } else {
        // ERROR: Unexpected errors that require attention
        this.logger.error({
          message: 'Payment processing failed',
          paymentId: paymentData.id,
          error: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  }
}
```

### Automatic Request Correlation (Tag)

The library automatically provides request correlation via a `tag` field that appears in all logs and spans for each request. This matches legacy `paystack-api` behavior.

#### How It Works

**Tag is automatically:**
1. **Extracted** from incoming request headers (`tag` or `x-aws-sqsd-attr-tag`)
2. **Generated** as UUID if no header is present
3. **Added** to all log `attributes.tag` for the request
4. **Added** to all span attributes for the request
5. **Propagated** as `Tag` header to all downstream HTTP calls

**No configuration needed** - this happens automatically for all HTTP requests.

#### ✅ **DO: Search by Tag in DataDog**

```typescript
// In DataDog, you can search logs and traces by tag:
// Logs: attributes.tag:"abc-123-def"
// Traces: tag:"abc-123-def"
```

#### ✅ **DO: Pass Tag to Downstream Services**

```typescript
// Tag automatically propagates to downstream services
// via the 'Tag' header on all HTTP calls
const response = await axios.get('https://api.example.com/users');
// The 'Tag' header is automatically added by OpenTelemetry propagator
```

#### ✅ **DO: Use Tag for SQS Jobs**

```typescript
// For AWS SQS daemon jobs, send tag as message attribute:
const params = {
  MessageAttributes: {
    tag: {
      DataType: 'String',
      StringValue: currentTag, // Pass current request's tag
    },
  },
};
// SQS daemon converts this to 'x-aws-sqsd-attr-tag' header
```

#### 📝 **Note: Tag vs TraceId**

The `tag` field is separate from OpenTelemetry's `traceId`:
- **tag**: Custom correlation ID for Paystack's DataDog workflows (legacy ps-api compatibility)
- **traceId**: OpenTelemetry standard for distributed tracing

Both are available in logs and spans. Use `tag` for business correlation in DataDog.

### Context Management

#### ✅ **DO: Use Context Effectively**

```typescript
@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('UserService');
  }

  async handleUserRequest(userId: string, requestId: string): Promise<void> {
    // Add persistent context for this request
    this.logger.addContext({
      userId,
      requestId,
      timestamp: new Date().toISOString(),
    });

    this.logger.info('Processing user request');

    try {
      await this.processUserData(userId);
      await this.updateUserProfile(userId);
      await this.sendNotification(userId);

      this.logger.info('User request completed successfully');
    } catch (error) {
      this.logger.error({
        message: 'User request failed',
        error: error.message,
        stack: error.stack,
      });
      throw error;
    } finally {
      // Clean up context
      this.logger.clearContext();
    }
  }
}
```

#### ✅ **DO: Use Child Loggers for Scoped Operations**

```typescript
@Injectable()
export class OrderService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('OrderService');
  }

  async processOrder(orderData: OrderDto): Promise<Order> {
    // Create child logger for this specific order
    const orderLogger = this.logger.createChildLogger('OrderProcessor', {
      orderId: orderData.id,
      userId: orderData.userId,
      correlationId: generateCorrelationId(),
    });

    orderLogger.log('Starting order processing');

    try {
      await this.validateOrder(orderLogger, orderData);
      await this.processPayment(orderLogger, orderData);
      await this.fulfillOrder(orderLogger, orderData);

      orderLogger.log('Order processing completed');
    } catch (error) {
      orderLogger.error({
        message: 'Order processing failed',
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  private async validateOrder(logger: LoggerService, orderData: OrderDto): Promise<void> {
    // Child logger automatically includes parent context
    logger.debug('Validating order data');
    // ... validation logic
  }
}
```

## Metrics Best Practices

### Metric Types and Usage

#### ✅ **DO: Use Appropriate Metric Types**

```typescript
@Injectable()
export class BusinessMetricsService {
  private readonly requestCounter: Counter<string>;
  private readonly responseTimeHistogram: Histogram<string>;
  private readonly activeConnectionsGauge: Gauge<string>;

  constructor(private readonly metricsService: MetricsService) {
    // Counter: For counting events
    this.requestCounter = this.metricsService.createCounter('http_requests_total', 'Total number of HTTP requests', [
      'method',
      'status_code',
      'route',
    ]);

    // Histogram: For measuring durations and sizes
    this.responseTimeHistogram = this.metricsService.createHistogram(
      'http_request_duration_seconds',
      'HTTP request duration in seconds',
      ['method', 'route'],
      [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10] // Appropriate buckets
    );

    // Gauge: For measuring current values
    this.activeConnectionsGauge = this.metricsService.createGauge(
      'active_connections',
      'Number of active connections',
      ['connection_type']
    );
  }

  recordRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.requestCounter.inc({ method, route, status_code: statusCode.toString() });
    this.responseTimeHistogram.observe({ method, route }, duration);
  }

  updateActiveConnections(connectionType: string, count: number): void {
    this.activeConnectionsGauge.set({ connection_type: connectionType }, count);
  }
}
```

### Label Best Practices

#### ✅ **DO: Use Low-Cardinality Labels**

```typescript
// Good labels - low cardinality
this.requestCounter.inc({
  method: 'GET', // ~10 values
  status_code: '200', // ~20 values
  route: '/api/users', // ~100 values
});

// Good business metrics
this.paymentCounter.inc({
  payment_method: 'credit_card', // ~5 values
  currency: 'USD', // ~10 values
  status: 'success', // ~5 values
});
```

#### ❌ **DON'T: Use High-Cardinality Labels**

```typescript
// Bad labels - high cardinality
this.requestCounter.inc({
  user_id: '12345', // Potentially millions of values
  request_id: 'req-abc123', // Unique per request
  timestamp: '1640995200', // Unique per second
  ip_address: '192.168.1.1', // Thousands of values
});
```

### Custom Business Metrics

#### ✅ **DO: Create Meaningful Business Metrics**

```typescript
@Injectable()
export class BusinessMetricsService {
  private readonly userRegistrationCounter: Counter<string>;
  private readonly orderValueHistogram: Histogram<string>;
  private readonly inventoryGauge: Gauge<string>;

  constructor(private readonly metricsService: MetricsService) {
    this.userRegistrationCounter = this.metricsService.createCounter(
      'user_registrations_total',
      'Total number of user registrations',
      ['plan_type', 'source']
    );

    this.orderValueHistogram = this.metricsService.createHistogram(
      'order_value_dollars',
      'Order value in dollars',
      ['product_category'],
      [10, 25, 50, 100, 250, 500, 1000, 2500, 5000] // Dollar amount buckets
    );

    this.inventoryGauge = this.metricsService.createGauge('inventory_items', 'Current inventory levels', [
      'product_type',
      'warehouse',
    ]);
  }

  recordUserRegistration(planType: string, source: string): void {
    this.userRegistrationCounter.inc({ plan_type: planType, source });
  }

  recordOrderValue(category: string, value: number): void {
    this.orderValueHistogram.observe({ product_category: category }, value);
  }

  updateInventory(productType: string, warehouse: string, count: number): void {
    this.inventoryGauge.set({ product_type: productType, warehouse }, count);
  }
}
```

## Configuration Best Practices

### Environment-Specific Configuration

#### ✅ **DO: Use Environment Variables for Configuration**

As of v1.0.0, the library uses **environment-driven configuration** following OpenTelemetry standards. No configuration objects are needed - just set the appropriate environment variables:

```bash
# Production Environment
OTEL_SERVICE_ENV=production
OTEL_SERVICE_NAME=my-service
OTEL_SERVICE_VERSION=1.0.0
OTEL_RESOURCE_ATTRIBUTES=environment=production

# Logging Configuration
OTEL_LOGS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=https://your-otlp-logs-endpoint

# Tracing Configuration
OTEL_TRACES_EXPORTER=otlp
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://your-otlp-traces-endpoint
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # Sample 10% in production

# Metrics Configuration
OTEL_METRICS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://your-otlp-metrics-endpoint

# Development vs Production
OTEL_SERVICE_ENV=production  # This affects observability behaviors
```

**NestJS Module Usage (No changes needed):**

```typescript
// app.module.ts
@Module({
  imports: [
    ObservabilityModule.forRoot(), // No configuration needed!
  ],
})
export class AppModule {}
```

**Environment-specific examples:**

```bash
# Development Environment
OTEL_SERVICE_ENV=development
OTEL_SERVICE_NAME=my-service
OTEL_SERVICE_VERSION=1.0.0
OTEL_LOGS_EXPORTER=console
OTEL_TRACES_EXPORTER=console
OTEL_METRICS_EXPORTER=console
OTEL_TRACES_SAMPLER=always_on  # Trace everything in development

# Staging Environment
OTEL_SERVICE_ENV=staging
OTEL_SERVICE_NAME=my-service-staging
OTEL_SERVICE_VERSION=1.0.0
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.5  # Sample 50% in staging
OTEL_EXPORTER_OTLP_ENDPOINT=https://staging-otlp-endpoint
```

## Performance Best Practices

### Sampling Strategies

#### ✅ **DO: Use Appropriate Sampling**

Configure sampling using environment variables based on your environment:

```bash
# Production: 1% sampling for high-traffic services
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.01

# Staging: 10% sampling for better testing coverage
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1

# Development: 100% sampling for debugging
OTEL_TRACES_SAMPLER=always_on

# Custom sampling for specific needs
OTEL_TRACES_SAMPLER=parentbased_traceidratio  # Respects parent decisions
OTEL_TRACES_SAMPLER_ARG=0.05  # 5% sampling
```

**Available sampler types:**

- `always_on` - Sample all traces (development)
- `always_off` - Sample no traces (disabled)
- `traceidratio` - Sample based on trace ID ratio
- `parentbased_always_on` - Respect parent sampling, default to always_on
- `parentbased_always_off` - Respect parent sampling, default to always_off
- `parentbased_traceidratio` - Respect parent sampling, default to ratio

### Avoiding Performance Bottlenecks

#### ✅ **DO: Optimize Hot Paths**

```typescript
@Injectable()
export class HighThroughputService {
  // Don't trace utility methods called frequently
  private formatData(data: any): any {
    return data.map((item) => ({ ...item, formatted: true }));
  }

  @Trace('process.batch')
  async processBatch(items: any[]): Promise<void> {
    // Trace the batch operation, not individual items
    const formattedItems = this.formatData(items);

    // Add meaningful attributes without high cardinality
    addSpanAttributes({
      'batch.size': items.length,
      'batch.type': 'user_data',
      'processing.priority': 'high',
    });

    await this.processItems(formattedItems);
  }
}
```

#### ❌ **DON'T: Trace Every Operation**

```typescript
// Bad - too much tracing overhead
@Injectable()
@TraceClass()
export class UtilityService {
  @Trace('format.single-item') // Don't trace individual items
  formatSingleItem(item: any): any {
    return { ...item, formatted: true };
  }

  @Trace('validate.field') // Don't trace field validation
  validateField(field: string): boolean {
    return field.length > 0;
  }
}
```

### Memory Management

#### ✅ **DO: Manage Context Properly**

```typescript
@Injectable()
export class RequestHandler {
  constructor(private readonly logger: LoggerService) {}

  async handleRequest(requestData: RequestDto): Promise<Response> {
    // Add context for this request
    this.logger.addContext({
      requestId: requestData.id,
      userId: requestData.userId,
    });

    try {
      const result = await this.processRequest(requestData);
      return result;
    } finally {
      // Always clean up context to prevent memory leaks
      this.logger.clearContext();
    }
  }
}
```

## Security Best Practices

### Sensitive Data Protection

#### ✅ **DO: Sanitize Sensitive Data**

```typescript
@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('UserService');
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    // Log sanitized data
    this.logger.info({
      message: 'Creating user',
      email: userData.email,
      // Never log passwords, tokens, or PII
      hasPassword: !!userData.password,
      dataSource: 'api',
    });

    // Add sanitized span attributes
    addSpanAttributes({
      'user.email_domain': userData.email.split('@')[1],
      'user.has_password': !!userData.password,
      'user.registration_source': 'web',
    });

    const user = await this.userRepository.create(userData);

    // Log success with non-sensitive data
    this.logger.info({
      message: 'User created successfully',
      userId: user.id,
      email: user.email,
      createdAt: user.createdAt,
    });

    return user;
  }
}
```

#### ❌ **DON'T: Log Sensitive Information**

```typescript
// Bad - logging sensitive data
this.logger.info({
  message: 'User login',
  email: userData.email,
  password: userData.password, // Never log passwords
  creditCard: userData.creditCard, // Never log credit cards
  ssn: userData.ssn, // Never log SSNs
  apiKey: userData.apiKey, // Never log API keys
});

// Bad - tracing sensitive data
addSpanAttributes({
  'user.password': userData.password,
  'payment.credit_card': paymentData.creditCard,
  'auth.token': authToken,
});
```

### Configuring Sensitive Data Patterns

The library automatically redacts common sensitive attributes (passwords, tokens, secrets, etc.) in span data. You can extend this protection with custom patterns for your business-specific sensitive data.

#### ✅ **DO: Add Custom Sensitive Patterns**

```typescript
import { addSensitivePatterns, configureAttributeSanitization } from '@paystackhq/nestjs-observability';

// Method 1: Add patterns incrementally to defaults
addSensitivePatterns([
  /customer[_-]?id/i, // Match customer_id, customer-id, customerId
  /account[_-]?number/i, // Match account_number, account-number, accountNumber
  /transaction[_-]?ref/i, // Match transaction_ref, transaction-ref, transactionRef
  /\b\d{16}\b/, // Match 16-digit numbers (like card numbers)
  /user[_-]?data/i, // Match user_data, user-data, userData
  /internal[_-]?reference/i, // Match internal_reference, internal-reference
]);

// Method 2: Configure all sanitization settings at once
configureAttributeSanitization({
  additionalSensitivePatterns: [/company[_-]?secret/i, /database[_-]?url/i, /session[_-]?key/i, /api[_-]?response/i],
  customRedactedPlaceholder: '[BUSINESS_DATA]',
});

// Method 3: Reset and set new patterns (replaces additional patterns)
configureAttributeSanitization({
  additionalSensitivePatterns: [/financial[_-]?data/i, /personal[_-]?info/i],
});
```

#### 📝 **Pattern Guidelines**

When creating custom sensitive patterns:

- **Use case-insensitive regex** with `/i` flag for flexible matching
- **Consider naming conventions**: snake_case, kebab-case, camelCase
- **Be specific enough** to avoid false positives
- **Test patterns** with your actual attribute names
- **Include common variations** of your sensitive field names

```typescript
// Examples of comprehensive patterns
const businessPatterns = [
  // Customer data
  /customer[_-]?(id|number|ref|reference)/i,
  /client[_-]?(id|number|ref|reference)/i,

  // Financial data
  /account[_-]?(number|id|balance)/i,
  /payment[_-]?(method|token|reference)/i,
  /transaction[_-]?(id|ref|amount)/i,
  /card[_-]?(number|token|cvv)/i,

  // Internal references
  /internal[_-]?(id|ref|key|token)/i,
  /system[_-]?(id|key|reference)/i,
  /tracking[_-]?(id|number|reference)/i,

  // User data
  /user[_-]?(data|info|details|profile)/i,
  /profile[_-]?(data|info|details)/i,

  // Regex for specific patterns
  /\b\d{13,19}\b/, // Credit card numbers (13-19 digits)
  /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/, // IBAN format
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN format (US)
];

addSensitivePatterns(businessPatterns);
```

#### 🔍 **Default Protected Patterns**

The library automatically protects these common patterns:

- `password`, `passwd`, `pwd`
- `token`, `auth`, `authorization`
- `secret`, `key`, `apikey`
- `credit`, `card`, `payment`
- `ssn`, `social`, `address`
- And more common sensitive terms

#### ✅ **Verification**

You can verify your patterns are working:

```typescript
import { isSensitiveKey } from '@paystackhq/nestjs-observability';

// Test your patterns
console.log(isSensitiveKey('customer_id')); // true (if pattern added)
console.log(isSensitiveKey('account_number')); // true (if pattern added)
console.log(isSensitiveKey('user_email')); // false (not sensitive)
console.log(isSensitiveKey('password')); // true (default pattern)
```

### Sensitive Data Masking in All Logs

The package **automatically masks sensitive data in all logs** using the `maskSensitiveFields` utility. This applies to:

- All structured log data (info, error, warn, debug)
- Request/response logs (when `OTEL_LOG_HTTP_REQUESTS=true`)
- Persistent context data
- Any data passed to the logger

#### ✅ **DO: Add Custom Sensitive Fields for Your Domain**

You can configure domain-specific fields that should be masked across all logging:

```typescript
// main.ts
import { addSensitiveFields } from '@paystackhq/nestjs-observability';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Add domain-specific sensitive fields (uses fast string matching, not regex)
  // These will be automatically masked in ALL logs throughout your application
  addSensitiveFields([
    'identifiervalue',
    'identitynumber',
    'bvn',
    'nin',
    'customerId',
    'merchantId',
    'deviceFingerprint',
  ]);

  await app.listen(3000);
}
```

#### 📝 **Default Masked Fields in All Logs**

The following fields are automatically masked in all logs:

**Authentication:**

- `access_token`, `accesstoken`, `apikey`, `bearer`, `jwt`, `key`, `password`, `pin`, `secret`, `secretkey`, `token`, `webhook_authentication_token`, `securitycredential`

**Payment Data:**

- `accountnumber`, `card`, `credit`, `cvc`, `cvv`, `number`, `pan`

**Personal Identifiable Information (PII):**

- `address`, `email`, `identifiervalue`, `identitynumber`, `idnumber`, `phone`, `social`, `ssn`, `surname`

#### ✅ **Example: Masking in Application Logs**

```typescript
@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('UserService');
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    // Sensitive fields are automatically masked in the log output
    this.logger.info('Creating user', {
      email: 'user@example.com', // Will be masked as [MASKED]
      password: 'secret123', // Will be masked as [MASKED]
      name: 'John Doe', // Not masked
      apiKey: 'key123', // Will be masked as [MASKED]
    });

    const user = await this.userRepository.create(userData);
    return user;
  }
}
```

### Request/Response Logging

HTTP request/response logging is a **separate opt-in feature** controlled by the `OTEL_LOG_HTTP_REQUESTS` environment variable. When enabled, it logs HTTP requests and responses with the same automatic masking applied.

### Request/Response Logging

HTTP request/response logging is a **separate opt-in feature** controlled by the `OTEL_LOG_HTTP_REQUESTS` environment variable. When enabled, it logs HTTP requests and responses with the same automatic masking applied.

**Enable HTTP Request/Response Logging:**

```bash
# Opt-in to enable request/response logging (disabled by default)
export OTEL_LOG_HTTP_REQUESTS="true"
```

**Important Notes:**

- This feature is **disabled by default** to prevent unexpected log volume. Services must explicitly opt-in by setting the environment variable.
- This setting is evaluated **at application startup**. To enable or disable request/response logging, you must **restart the application**.
- When disabled, the request logging interceptor is not registered, providing zero runtime overhead.

#### ✅ **DO: Exclude Health Checks and Internal Endpoints**

When HTTP request/response logging is enabled, you should exclude high-frequency endpoints like health checks to reduce log volume.

```typescript
import { Controller, Get } from '@nestjs/common';
import { NoLog, NoLogClass } from '@paystackhq/nestjs-observability';

// Exclude entire controller from logging (e.g., health checks)
@Controller('health')
@NoLogClass() // Disables logs for the whole class
export class HealthController {
  @Get()
  getHealth() {
    // This endpoint won't generate request/response logs (even when OTEL_LOG_HTTP_REQUESTS=true)
    return { status: 'ok', timestamp: Date.now() };
  }

  @Get('/ready')
  getReadiness() {
    // This endpoint also won't be logged
    return { ready: true };
  }
}

// Log most endpoints, but exclude specific ones
@Controller('users')
export class UserController {
  @Get()
  getUsers() {
    // Logged with masked sensitive fields (when OTEL_LOG_HTTP_REQUESTS=true)
    return this.userService.findAll();
  }

  @Post()
  createUser(@Body() userData: CreateUserDto) {
    // Request/response logged with automatic masking of sensitive fields (when enabled)
    return this.userService.create(userData);
  }

  @NoLog() // Exclude specific endpoint from logging
  @Get('/internal')
  getInternalData() {
    // This endpoint won't generate request/response logs (even when OTEL_LOG_HTTP_REQUESTS=true)
    return this.internalService.getData();
  }
}
```

#### ✅ **DO: Use @NoLog for Sensitive Operations**

Even when HTTP request/response logging is enabled, you can exclude specific endpoints from being logged:

```typescript
@Controller('auth')
export class AuthController {
  @Post('/login')
  @NoLog() // Don't log this endpoint at all (even when OTEL_LOG_HTTP_REQUESTS=true)
  async login(@Body() credentials: LoginDto) {
    // Authentication logic - not logged for security
    return this.authService.login(credentials);
  }

  @Get('/profile')
  async getProfile() {
    // Regular endpoints will be logged with masked sensitive fields (when OTEL_LOG_HTTP_REQUESTS=true)
    return this.authService.getProfile();
  }
}
```

#### 🔍 **Log Format**

When HTTP request/response logging is enabled (`OTEL_LOG_HTTP_REQUESTS=true`), the logs follow the Paystack log format with automatic trace correlation and sensitive data masking:

```typescript
// Request log
const req = {
  service: 'my-service',
  type: 'request',
  level: 'info',
  created: '2025-11-10T12:00:00.000Z',
  environment: 'production',
  age: 0,
  endpoint: '/api/users',
  traceId: 'abc123',
  spanId: 'def456',
  payload: {
    verb: 'POST',
    client: '192.168.1.1',
    headers: { 'user-agent': 'Mozilla/5.0', authorization: '[MASKED]' },
    query: { page: '1' },
    body: { email: '[MASKED]', password: '[MASKED]', name: 'John Doe' },
  },
};

// Response log
const res = {
  service: 'my-service',
  type: 'response',
  level: 'info',
  created: '2025-11-10T12:00:00.123Z',
  environment: 'production',
  age: 123,
  endpoint: '/api/users',
  traceId: 'abc123',
  spanId: 'def456',
  payload: {
    verb: 'POST',
    client: '192.168.1.1',
    status: 201,
    body: { id: 'user-123', email: '[MASKED]', token: '[MASKED]' },
  },
};
```

### Configuration Security

#### ✅ **DO: Secure Configuration**

```typescript
// Use environment variables for sensitive configuration
const observabilityConfig = {
  tracing: {
    enabled: process.env.TRACING_ENABLED === 'true',
    exporter: {
      type: 'otlp',
      endpoint: process.env.OTLP_TRACES_ENDPOINT,
      headers: {
        Authorization: `Bearer ${process.env.OTLP_API_TOKEN}`,
      },
    },
  },
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    // Don't expose internal service names in metrics
    defaultLabels: {
      service: process.env.SERVICE_NAME,
      version: process.env.SERVICE_VERSION,
      environment: process.env.OTEL_SERVICE_ENV,
    },
  },
};

// Never log the configuration that contains secrets
console.log('Observability initialized'); // Don't log config details
```

## Production Best Practices

### Monitoring and Alerting

#### ✅ **DO: Set Up Proper Monitoring**

```typescript
@Injectable()
export class HealthCheckService {
  constructor(
    private readonly logger: LoggerService,
    private readonly metricsService: MetricsService
  ) {
    this.logger.setContext('HealthCheckService');
  }

  @Trace('health.check')
  async performHealthCheck(): Promise<HealthCheckResult> {
    const healthMetrics = this.metricsService.createGauge(
      'service_health_status',
      'Service health status (1=healthy, 0=unhealthy)',
      ['component']
    );

    const checks = [
      { name: 'database', check: () => this.checkDatabase() },
      { name: 'redis', check: () => this.checkRedis() },
      { name: 'external_api', check: () => this.checkExternalApi() },
    ];

    const results = await Promise.all(
      checks.map(async ({ name, check }) => {
        try {
          const result = await check();
          healthMetrics.set({ component: name }, 1);
          return { name, status: 'healthy', ...result };
        } catch (error) {
          healthMetrics.set({ component: name }, 0);
          this.logger.error({
            message: `Health check failed for ${name}`,
            component: name,
            error: error.message,
          });
          return { name, status: 'unhealthy', error: error.message };
        }
      })
    );

    const overallHealthy = results.every((r) => r.status === 'healthy');
    healthMetrics.set({ component: 'overall' }, overallHealthy ? 1 : 0);

    return { healthy: overallHealthy, checks: results };
  }
}
```

### Error Handling and Recovery

#### ✅ **DO: Implement Proper Error Handling**

```typescript
@Injectable()
export class ResilientService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('ResilientService');
  }

  @Trace('process.with-retry')
  async processWithRetry<T>(operation: () => Promise<T>, maxRetries: number = 3, backoffMs: number = 1000): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        addSpanAttributes({
          'retry.attempt': attempt,
          'retry.max_attempts': maxRetries,
        });

        const result = await operation();

        if (attempt > 1) {
          this.logger.info({
            message: 'Operation succeeded after retry',
            attempt,
            totalAttempts: maxRetries,
          });
        }

        return result;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;

        if (isLastAttempt) {
          this.logger.error({
            message: 'Operation failed after all retries',
            attempt,
            totalAttempts: maxRetries,
            error: error.message,
            stack: error.stack,
          });

          addSpanAttributes({
            'retry.failed': true,
            'retry.final_attempt': attempt,
          });

          throw error;
        } else {
          this.logger.warn({
            message: 'Operation failed, retrying',
            attempt,
            totalAttempts: maxRetries,
            error: error.message,
            nextRetryIn: backoffMs * attempt,
          });

          await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt));
        }
      }
    }
  }
}
```

## Development Best Practices

### Testing Observability

#### ✅ **DO: Test Observability Features**

```typescript
// test/observability.test.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ObservabilityModule } from '@paystackhq/nestjs-observability';

describe('Observability Integration', () => {
  let app: TestingModule;

  beforeEach(async () => {
    app = await Test.createTestingModule({
      imports: [
        ObservabilityModule.forRoot({
          serviceName: 'test-service',
          serviceVersion: '1.0.0',
          environment: 'test',
          tracing: { enabled: false }, // Disable tracing in tests
          metrics: { enabled: false }, // Disable metrics in tests
          logging: { level: 'error', consoleOutput: false }, // Minimal logging
        }),
      ],
    }).compile();
  });

  it('should initialize without errors', () => {
    expect(app).toBeDefined();
  });
});
```

#### ✅ **DO: Mock Observability in Unit Tests**

```typescript
// user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@paystackhq/nestjs-observability';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let loggerService: LoggerService;

  beforeEach(async () => {
    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      setContext: jest.fn(),
      addContext: jest.fn(),
      clearContext: jest.fn(),
      createChildLogger: jest.fn().mockReturnValue({
        log: jest.fn(),
        error: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: LoggerService, useValue: mockLogger }],
    }).compile();

    service = module.get<UserService>(UserService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  it('should log user creation', async () => {
    const userData = { email: 'test@example.com', name: 'Test User' };

    await service.createUser(userData);

    expect(loggerService.log).toHaveBeenCalledWith({
      message: 'Creating user',
      email: userData.email,
      hasPassword: false,
    });
  });
});
```

### Local Development

#### ✅ **DO: Use Development-Friendly Configuration**

```typescript
// Local development configuration
export const developmentConfig = {
  serviceName: 'my-service-dev',
  serviceVersion: '1.0.0-dev',
  environment: 'development',

  logging: {
    level: 'debug',
    consoleOutput: true, // Enable console output for development
  },

  tracing: {
    enabled: true,
    sampler: {
      type: 'always_on', // Trace everything in development
    },
    exporter: {
      type: 'otlp',
      endpoint: 'http://localhost:4318/v1/traces', // Local Jaeger
    },
  },

  metrics: {
    enabled: true,
    endpoint: '/metrics',
  },
};
```

## Architecture Best Practices

### Microservices

#### ✅ **DO: Implement Distributed Tracing**

```typescript
@Injectable()
export class OrderService {
  constructor(
    private readonly logger: LoggerService,
    private readonly paymentService: PaymentService,
    private readonly inventoryService: InventoryService,
    private readonly notificationService: NotificationService
  ) {
    this.logger.setContext('OrderService');
  }

  @Trace('order.process')
  async processOrder(orderData: OrderDto): Promise<Order> {
    const correlationId = generateCorrelationId();

    // Add correlation ID to span
    addSpanAttributes({
      'order.correlation_id': correlationId,
      'order.total': orderData.total,
      'order.items_count': orderData.items.length,
    });

    // Add correlation ID to logs
    this.logger.addContext({ correlationId });

    try {
      // Each service call will create child spans
      const paymentResult = await this.paymentService.processPayment({
        ...orderData.payment,
        correlationId,
      });

      const inventoryResult = await this.inventoryService.reserveItems({
        ...orderData.items,
        correlationId,
      });

      const order = await this.createOrder(orderData, paymentResult, inventoryResult);

      // Fire and forget notification (separate span)
      this.notificationService.sendOrderConfirmation({
        orderId: order.id,
        correlationId,
      });

      return order;
    } finally {
      this.logger.clearContext();
    }
  }
}
```

### Event-Driven Architecture

#### ✅ **DO: Trace Across Event Boundaries**

```typescript
@Injectable()
export class EventHandler {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('EventHandler');
  }

  @Trace('event.handle')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    // Extract tracing context from event
    const traceContext = event.metadata?.traceContext;

    addSpanAttributes({
      'event.type': 'order.created',
      'event.id': event.id,
      'event.timestamp': event.timestamp,
      'order.id': event.orderId,
    });

    // Link to parent trace if available
    if (traceContext) {
      addSpanAttributes({
        'parent.trace_id': traceContext.traceId,
        'parent.span_id': traceContext.spanId,
      });
    }

    this.logger.info({
      message: 'Processing order created event',
      eventId: event.id,
      orderId: event.orderId,
      traceContext,
    });

    // Process the event
    await this.processOrderCreatedEvent(event);
  }
}
```

## Troubleshooting Best Practices

### Common Issues and Solutions

#### ✅ **DO: Implement Proper Error Correlation**

```typescript
@Injectable()
export class ErrorTrackingService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('ErrorTrackingService');
  }

  @Trace('error.track')
  async trackError(error: Error, context: ErrorContext): Promise<void> {
    const errorId = generateErrorId();

    // Add error attributes to span
    addSpanAttributes({
      'error.id': errorId,
      'error.type': error.constructor.name,
      'error.message': error.message,
      'error.stack_trace': error.stack,
      'error.context.user_id': context.userId,
      'error.context.operation': context.operation,
    });

    // Log detailed error information
    this.logger.error({
      message: 'Error occurred',
      errorId,
      errorType: error.constructor.name,
      errorMessage: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });

    // Send to error tracking service
    await this.sendToErrorTrackingService(errorId, error, context);
  }
}
```

#### ✅ **DO: Create Debugging Utilities**

```typescript
@Injectable()
export class DebugService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('DebugService');
  }

  @Trace('debug.performance')
  async measurePerformance<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    const startTime = Date.now();

    addSpanAttributes({
      'debug.operation': operationName,
      'debug.start_time': startTime,
    });

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      addSpanAttributes({
        'debug.duration_ms': duration,
        'debug.success': true,
      });

      this.logger.debug({
        message: `Operation completed: ${operationName}`,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      addSpanAttributes({
        'debug.duration_ms': duration,
        'debug.success': false,
        'debug.error': error.message,
      });

      this.logger.error({
        message: `Operation failed: ${operationName}`,
        duration,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }
}
```

### Performance Debugging

#### ✅ **DO: Monitor Performance Metrics**

```typescript
@Injectable()
export class PerformanceMonitor {
  private readonly performanceMetrics: Histogram<string>;

  constructor(private readonly metricsService: MetricsService) {
    this.performanceMetrics = this.metricsService.createHistogram(
      'operation_duration_seconds',
      'Operation duration in seconds',
      ['operation', 'status'],
      [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    );
  }

  @Trace('performance.monitor')
  async monitorOperation<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = (Date.now() - startTime) / 1000;

      this.performanceMetrics.observe({ operation: operationName, status: 'success' }, duration);

      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      this.performanceMetrics.observe({ operation: operationName, status: 'error' }, duration);

      throw error;
    }
  }
}
```

## Summary

Following these best practices will help you:

1. **Implement effective observability** without performance impact
2. **Maintain security** while gaining insights
3. **Scale your observability** with your application
4. **Troubleshoot issues** quickly and efficiently
5. **Optimize performance** based on real data

Remember to:

- Start simple and add complexity as needed
- Monitor the monitoring (observability overhead)
- Regular review and optimization of your observability setup
- Keep security and performance in mind at all times
- Use the right tool for the right job (logs vs metrics vs traces)

For more specific guidance on any of these topics, refer to the individual documentation sections or reach out to your platform team.
