# First Steps with NestJS Observability

## Overview

This guide helps you get started with the NestJS Observability library. The library provides automatic tracing, metrics, and structured logging for your NestJS applications.

## Installation

```bash
npm install nestjs-observability
# or
yarn add nestjs-observability
# or
pnpm add nestjs-observability
```

## Basic Setup

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { ObservabilityModule } from 'nestjs-observability';

@Module({
  imports: [
    ObservabilityModule.forRoot({
      serviceName: 'my-service',
      serviceVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      tracing: {
        enabled: true,
        autoInstrumentation: {
          enabled: true,
          captureArguments: true,
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
AUTO_INSTRUMENTATION_ENABLED=true
CAPTURE_ARGUMENTS=true
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

### Service Tracing with @TraceAllMethods

For services and providers, use the `@TraceAllMethods` decorator to enable automatic tracing:

```typescript
import { Injectable } from '@nestjs/common';
import { TraceAllMethods } from 'nestjs-observability';

@Injectable()
@TraceAllMethods() // Enable automatic tracing for all methods
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
@TraceAllMethods()
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

### Custom Span Names with @TraceMethod

Use the `@TraceMethod` decorator to customize span names or individual method tracing:

```typescript
@Injectable()
@TraceAllMethods()
export class OrderService {
  @TraceMethod('order.process-complex') // Custom span name
  async processComplexOrder(orderData: OrderDto): Promise<Order> {
    // This method is traced as "order.process-complex"
    return this.processOrder(orderData);
  }

  @TraceMethod('order.validate', false) // Custom name, don't capture arguments
  async validateOrder(order: Order): Promise<boolean> {
    // This method is traced as "order.validate" without argument capture
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
    autoInstrumentation: {
      enabled: true,
      captureArguments: true,
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
AUTO_INSTRUMENTATION_ENABLED=true
CAPTURE_ARGUMENTS=true

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
    autoInstrumentation: {
      enabled: process.env.AUTO_INSTRUMENTATION_ENABLED !== 'false',
      captureArguments: process.env.CAPTURE_ARGUMENTS !== 'false',
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

- Use `@TraceAllMethods` for business logic services
- Avoid tracing utility services (logging, caching) unless needed
- Use `@NoTrace` for sensitive operations

### 2. Performance Considerations

- The auto-tracing system has minimal overhead (< 1ms per method)
- Use `captureArguments: false` for methods with large payloads
- Exclude utility methods that don't provide business value

### 3. Span Naming

- Default span names follow the pattern: `ClassName.methodName`
- Use `@TraceMethod` for custom span names that better describe business operations
- Keep span names consistent across your application

### 4. Logging Format

- The logger automatically uses **structured logging** (JSON format) for all environments except `development`
- In `development` environment, it uses **pretty formatting** for better readability
- No manual configuration needed - this is handled automatically based on `NODE_ENV`

### 5. Error Handling

The auto-tracing system automatically captures errors and marks spans as failed. Your error handling remains unchanged:

```typescript
@Injectable()
@TraceAllMethods()
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
import { Trace } from 'nestjs-observability';

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
