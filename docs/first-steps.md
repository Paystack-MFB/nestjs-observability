# First Steps with NestJS Observability

## Overview

This guide helps you get started with the NestJS Observability library. The library provides automatic tracing, metrics, and structured logging for your NestJS applications.

## Installation

```bash
npm install @paystackhq/nestjs-observability
# or
yarn add @paystackhq/nestjs-observability
# or
pnpm add @paystackhq/nestjs-observability
```

## Basic Setup

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { ObservabilityModule } from '@paystackhq/nestjs-observability';

@Module({
  imports: [
    ObservabilityModule.forRoot({
      serviceName: 'my-service',
      serviceVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      tracing: {
        enabled: true,
        instrumentations: {
          autoInstrumentations: true,
        },
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Basic Configuration

Create a `.env` file with basic configuration:

```env
SERVICE_NAME=my-service
SERVICE_VERSION=1.0.0
NODE_ENV=development
TRACING_ENABLED=true
TRACING_AUTO_INSTRUMENTATIONS=true
OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
```

## Auto-Tracing with Decorators

The observability library provides automatic tracing for your application with minimal configuration.

### Controller Tracing

Controllers are automatically traced by default. Every controller method creates a span automatically:

```typescript
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async getUser(@Param('id') id: string) {
    // This method is automatically traced as "UserController.getUser"
    // HTTP attributes (method, path, status code) are automatically included
    return this.userService.findUser(id);
  }

  @Post()
  async createUser(@Body() userData: CreateUserDto) {
    // This method is automatically traced as "UserController.createUser"
    return this.userService.createUser(userData);
  }
}
```

### Service Tracing with @TraceClass

For services and providers, use the `@TraceClass` decorator to enable automatic tracing:

```typescript
import { Injectable } from '@nestjs/common';
import { TraceClass } from '@paystackhq/nestjs-observability';

@Injectable()
@TraceClass() // Enable automatic tracing for all methods
export class UserService {
  async findUser(id: string): Promise<User> {
    // This method is automatically traced as "UserService.findUser"
    return this.userRepository.findById(id);
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    // This method is automatically traced as "UserService.createUser"
    return this.userRepository.create(userData);
  }
}
```

### Excluding Methods with @NoTrace

Use the `@NoTrace` decorator to exclude specific methods from tracing:

```typescript
@Injectable()
@TraceClass()
export class PaymentService {
  async processPayment(paymentData: PaymentDto): Promise<Payment> {
    // This method is automatically traced
    return this.paymentProcessor.process(paymentData);
  }

  @NoTrace() // Exclude this method from tracing
  private async logSensitiveData(data: any): Promise<void> {
    // This method will not be traced (sensitive data)
    console.log('Processing sensitive payment data');
  }
}
```

### Custom Span Names with @Trace

Use the `@Trace` decorator to customize span names or individual method tracing:

```typescript
@Injectable()
@TraceClass()
export class OrderService {
  @Trace('order.process-complex') // Custom span name
  async processComplexOrder(orderData: OrderDto): Promise<Order> {
    // This method is traced as "order.process-complex"
    return this.processOrder(orderData);
  }

  @Trace('order.validate') // Custom name
  async validateOrder(order: Order): Promise<boolean> {
    // This method is traced as "order.validate"
    return this.validator.validate(order);
  }
}
```

## Configuration Options

### Basic Configuration

```typescript
ObservabilityModule.forRoot({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'production',
  tracing: {
    enabled: true,
    instrumentations: {
      autoInstrumentations: true,
    },
  },
});
```

### Environment Variables

```env
# Basic Configuration
SERVICE_NAME=my-service
SERVICE_VERSION=1.0.0
NODE_ENV=production

# Tracing Configuration
TRACING_ENABLED=true
TRACING_AUTO_INSTRUMENTATIONS=true

# OpenTelemetry Configuration
OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
```

### Full Configuration Example

```typescript
ObservabilityModule.forRoot({
  serviceName: process.env.SERVICE_NAME || 'my-service',
  serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    consoleOutput: true,
    otlpExport: {
      enabled: process.env.OTLP_LOGS_ENABLED === 'true',
      endpoint: process.env.OTLP_LOGS_ENDPOINT || 'http://localhost:4318/v1/logs',
    },
  },

  // Metrics Configuration
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    endpoint: process.env.METRICS_ENDPOINT || '/metrics',
    defaultMetrics: true,
    defaultLabels: {
      // Note: 'service' and 'version' labels are ALWAYS automatically added from
      // the top-level serviceName and serviceVersion configuration, even if you
      // provide your own service and version labels here - they will be overridden
      environment: process.env.NODE_ENV || 'development',
      region: process.env.AWS_REGION || 'us-east-1',
      customLabel: 'your-custom-value',
    },
  },

  // Tracing Configuration
  tracing: {
    enabled: process.env.TRACING_ENABLED !== 'false',
    instrumentations: {
      autoInstrumentations: process.env.TRACING_AUTO_INSTRUMENTATIONS !== 'false',
    },
    sampler: {
      type: 'always_on',
      ratio: 1.0,
    },
    exporter: {
      type: 'otlp',
      endpoint: process.env.OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
    },
  },
});
```

## Best Practices

### 1. Service Organization

- Use `@TraceClass` for business logic services
- Avoid tracing utility services (logging, caching) unless needed
- Use `@NoTrace` for sensitive operations

### 2. Performance Considerations

- The auto-tracing system has minimal overhead (< 1ms per method)
- Use `autoInstrumentations: false` to disable automatic instrumentation if needed
- Exclude utility methods that don't provide business value

### 3. Span Naming

- Default span names follow the pattern: `ClassName.methodName`
- Use `@Trace` for custom span names that better describe business operations
- Keep span names consistent across your application

### 4. Logging

The observability library provides enhanced logging with OpenTelemetry integration and context support.

#### Automatic Logging Features

- **Structured Logging**: JSON format for production environments
- **Pretty Logging**: Human-readable format for development
- **Trace Linking**: All logs automatically include trace and span IDs
- **Context Persistence**: Maintains context across async operations
- **Proper Error Handling**: Special handling for Error objects

#### Basic Usage

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@paystackhq/nestjs-observability';

@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {
    // Set context for this service
    this.logger.setContext('UserService');
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    // Basic logging methods
    this.logger.info('Creating new user');
    this.logger.debug('User data validation started');

    try {
      const user = await this.userRepository.create(userData);
      this.logger.info(`User created successfully: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error.stack);
      throw error;
    }
  }
}
```

#### Structured Logging with Context

```typescript
@Injectable()
export class OrderService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('OrderService');
  }

  async processOrder(orderData: OrderDto): Promise<Order> {
    // Structured logging with additional context
    this.logger.info({
      message: 'Processing order',
      orderId: orderData.id,
      userId: orderData.userId,
      amount: orderData.total,
      currency: orderData.currency,
    });

    try {
      const order = await this.orderRepository.create(orderData);

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

#### Context Persistence

```typescript
@Injectable()
export class PaymentService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('PaymentService');
  }

  async processPayment(paymentData: PaymentDto): Promise<Payment> {
    // Add persistent context that will be included in all subsequent logs
    this.logger.addContext({
      paymentId: paymentData.id,
      userId: paymentData.userId,
      amount: paymentData.amount,
    });

    this.logger.info('Starting payment processing');

    await this.validatePayment(paymentData);
    await this.chargeCard(paymentData);
    await this.updateInventory(paymentData);

    this.logger.info('Payment processing completed');

    // Clear context when done
    this.logger.clearContext();
  }

  private async validatePayment(paymentData: PaymentDto): Promise<void> {
    // This log will automatically include the persistent context
    this.logger.debug('Validating payment data');

    if (!paymentData.cardNumber) {
      this.logger.warn('Payment validation failed: missing card number');
      throw new BadRequestException('Card number is required');
    }
  }
}
```

#### Child Loggers

```typescript
@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('UserService');
  }

  async handleUserRequest(userId: string): Promise<void> {
    // Create a child logger with additional context
    const childLogger = this.logger.createChildLogger('UserRequest', {
      userId,
      requestId: generateRequestId(),
      timestamp: new Date().toISOString(),
    });

    childLogger.info('Processing user request');

    await this.processUserData(childLogger, userId);
    await this.updateUserProfile(childLogger, userId);

    childLogger.info('User request completed');
  }

  private async processUserData(logger: LoggerService, userId: string): Promise<void> {
    // Child logger maintains the original context
    logger.debug('Processing user data');
    // ... processing logic
  }
}
```

#### Error Handling

```typescript
@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('UserService');
  }

  async findUser(id: string): Promise<User> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        this.logger.warn(`User not found: ${id}`);
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      // Error objects are automatically formatted with proper structure
      this.logger.error(error); // Automatically includes stack trace and error details
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await this.userRepository.delete(id);
      this.logger.info(`User deleted: ${id}`);
    } catch (error) {
      // Custom error logging with additional context
      this.logger.error({
        message: 'Failed to delete user',
        userId: id,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}
```

#### Log Levels

```typescript
@Injectable()
export class DebugService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('DebugService');
  }

  async complexOperation(): Promise<void> {
    // Different log levels for different purposes
    this.logger.verbose('Starting complex operation'); // Very detailed info
    this.logger.debug('Debug information for developers'); // Debug info
    this.logger.info('General information'); // General info
    this.logger.warn('Warning message'); // Warnings
    this.logger.error('Error occurred'); // Errors
    this.logger.fatal('Critical system error'); // Critical errors
  }
}
```

#### Logging Configuration

```typescript
// In your module configuration
ObservabilityModule.forRoot({
  logging: {
    level: process.env.LOG_LEVEL || 'info', // debug, info, warn, error
    consoleOutput: true, // Enable/disable console output
    otlpExport: {
      enabled: process.env.OTLP_LOGS_ENABLED === 'true',
      endpoint: process.env.OTLP_LOGS_ENDPOINT || 'http://localhost:4318/v1/logs',
    },
  },
});
```

#### Environment-Specific Logging

```env
# Development
NODE_ENV=development
LOG_LEVEL=debug

# Production
NODE_ENV=production
LOG_LEVEL=info
OTLP_LOGS_ENABLED=true
OTLP_LOGS_ENDPOINT=https://your-otlp-endpoint.com/v1/logs
```

#### Output Examples

**Development (Pretty Format):**

```
[2024-01-15 10:30:45] [LOG] [UserService] Creating new user [trace: a1b2c3d4]
[2024-01-15 10:30:45] [DEBUG] [UserService] User data validation started [trace: a1b2c3d4]
```

**Production (Structured JSON):**

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "serviceName": "my-service",
  "serviceVersion": "1.0.0",
  "environment": "production",
  "pid": 12345,
  "context": "UserService",
  "message": "Creating new user",
  "traceId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "spanId": "q1r2s3t4u5v6w7x8",
  "userId": "user-123",
  "requestId": "req-456"
}
```

### 5. Error Handling

The auto-tracing system automatically captures errors and marks spans as failed. Your error handling remains unchanged:

```typescript
@Injectable()
@TraceClass()
export class UserService {
  async findUser(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }
}
```

## Manual Tracing

For cases where you need more control, you can still use manual tracing:

```typescript
import { Injectable } from '@nestjs/common';
import { Trace } from '@paystackhq/nestjs-observability';

@Injectable()
export class LegacyService {
  @Trace('legacy.process')
  async processLegacyData(data: any): Promise<any> {
    // Manual tracing for specific methods
    return this.processData(data);
  }
}
```

## Next Steps

1. **Set up your observability backend** (Jaeger, Zipkin, or compatible OTLP collector)
2. **Configure your endpoints** for traces, metrics, and logs
3. **Add decorators to your services** to enable automatic tracing
4. **Monitor your application** and tune the configuration as needed

For advanced configuration and production deployment, see the [Configuration Guide](./configuration.md).

For information about different tracing patterns and use cases, see the [Tracing Guide](./tracing.md).
