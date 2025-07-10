# nestjs-observability

A comprehensive observability package for NestJS applications that provides structured logging, metrics collection, and distributed tracing capabilities with OpenTelemetry integration.

## 🎯 Features

### Core Observability

- **🔍 Distributed Tracing**: OpenTelemetry-based automatic request tracing with span correlation
- **📊 Metrics Collection**: Prometheus-compatible metrics with custom counters, gauges, and histograms
- **📝 Structured Logging**: Enhanced NestJS logger with trace context and structured data support
- **🌍 Environment-Aware**: Automatically adapts configuration based on development/production environments

### Advanced Capabilities

- **🚀 Auto-Tracing Decorators**: Modern decorator system for automatic method tracing
- **🔒 Attribute Sanitization**: Automatic PII/sensitive data redaction in traces
- **📈 HTTP Interceptors**: Automatic request/response logging and metrics collection
- **🎛️ Flexible Configuration**: Support for both sync and async configuration patterns
- **🔄 Multi-Format Support**: Dual CommonJS/ESM package distribution

### Integration Features

- **🔗 OpenTelemetry Integration**: Full OTLP export support with custom headers
- **📊 Prometheus Metrics**: Built-in `/metrics` endpoint with default and custom metrics
- **🏗️ NestJS Native**: Extends built-in NestJS ConsoleLogger for seamless integration
- **🌐 Auto-Instrumentation**: Automatic discovery and instrumentation of controllers and providers

## 📦 Installation

```bash
npm install @paystackhq/nestjs-observability
# or
pnpm add @paystackhq/nestjs-observability
# or
yarn add @paystackhq/nestjs-observability
```

### Peer Dependencies

Make sure you have these peer dependencies installed:

```bash
npm install @nestjs/common @nestjs/core @nestjs/config reflect-metadata rxjs
```

### Optional Dependencies

For full OpenTelemetry tracing and Prometheus metrics:

```bash
npm install @opentelemetry/api prom-client
```

## 🚀 Quick Start

### 1. Basic Module Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ObservabilityModule } from '@paystackhq/nestjs-observability';

@Module({
  imports: [
    // Basic setup with default configuration
    ObservabilityModule.forRoot({
      serviceName: 'my-service',
      serviceVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    }),
  ],
})
export class AppModule {}
```

### 2. Advanced Configuration

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ObservabilityModule } from '@paystackhq/nestjs-observability';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ObservabilityModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        serviceName: configService.get('SERVICE_NAME', 'my-service'),
        serviceVersion: configService.get('SERVICE_VERSION', '1.0.0'),
        environment: configService.get('NODE_ENV', 'development'),

        // Logging configuration
        logging: {
          level: configService.get('LOG_LEVEL', 'info'),
          consoleOutput: true,
          otlpExport: {
            enabled: configService.get('OTLP_LOGS_ENABLED', 'false') === 'true',
            endpoint: configService.get('OTLP_LOGS_ENDPOINT', 'http://localhost:4318/v1/logs'),
          },
        },

        // Metrics configuration
        metrics: {
          enabled: configService.get('METRICS_ENABLED', 'true') === 'true',
          endpoint: configService.get('METRICS_ENDPOINT', '/metrics'),
          defaultLabels: {
            environment: configService.get('NODE_ENV', 'development'),
            region: configService.get('AWS_REGION', 'us-east-1'),
          },
          defaultMetrics: true,
        },

        // Tracing configuration
        tracing: {
          enabled: configService.get('TRACING_ENABLED', 'true') === 'true',
          exporter: {
            type: 'otlp',
            endpoint: configService.get('OTLP_TRACES_ENDPOINT', 'http://localhost:4318/v1/traces'),
            headers: configService.get('OTLP_HEADERS') ? JSON.parse(configService.get('OTLP_HEADERS')!) : undefined,
          },
          sampler: {
            type: 'trace_id_ratio',
            ratio: parseFloat(configService.get('TRACING_SAMPLE_RATE', '1.0')),
          },
          attributeSanitization: {
            enabled: configService.get('TRACING_SANITIZATION_ENABLED', 'true') === 'true',
            redactedPlaceholder: '[REDACTED]',
          },
        },
      }),
    }),
  ],
})
export class AppModule {}
```

### 3. Factory Pattern Configuration

The `ObservabilityModule.forRootAsync()` method uses a factory pattern that provides powerful dependency injection capabilities. This pattern is essential when you need to:

- Access `ConfigService` for environment-based configuration
- Perform async operations during module initialization
- Inject other services into the configuration factory

#### Why Use the Factory Pattern?

```typescript
// ❌ DON'T: This won't work with ConfigService
@Module({
  imports: [
    ConfigModule.forRoot(),
    ObservabilityModule.forRoot({
      serviceName: configService.get('SERVICE_NAME'), // ❌ configService not available
    }),
  ],
})
export class AppModule {}

// ✅ DO: Use factory pattern for proper dependency injection
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // ⚠️ MUST be loaded first
    ObservabilityModule.forRootAsync({
      imports: [ConfigModule], // Explicitly import ConfigModule
      inject: [ConfigService], // Inject ConfigService
      useFactory: (configService: ConfigService) => ({
        serviceName: configService.get('SERVICE_NAME'), // ✅ ConfigService available
        // ... other config
      }),
    }),
  ],
})
export class AppModule {}
```

#### Module Loading Order

**Critical**: The loading order of modules matters for proper dependency injection:

```typescript
@Module({
  imports: [
    // 1. Load ConfigModule FIRST (with isGlobal: true)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      expandVariables: true,
    }),

    // 2. Load ObservabilityModule SECOND (depends on ConfigModule)
    ObservabilityModule.forRootAsync({
      imports: [ConfigModule], // Redundant but explicit
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Factory function receives ConfigService instance
        serviceName: configService.get('SERVICE_NAME', 'my-service'),
        serviceVersion: configService.get('SERVICE_VERSION', '1.0.0'),
        environment: configService.get('NODE_ENV', 'development'),
        // All other configuration...
      }),
    }),

    // 3. Load other modules that depend on observability
    DatabaseModule,
    AuthModule,
    // ... other modules
  ],
})
export class AppModule {}
```

#### Advanced Factory Patterns

For complex scenarios like multi-service dependencies, external configuration services, feature flags, and error handling patterns, see the [Advanced Factory Configuration Guide](docs/advanced-factory-configuration.md).

#### Common Factory Pattern Mistakes

```typescript
// ❌ DON'T: Missing ConfigModule import
ObservabilityModule.forRootAsync({
  // Missing: imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({...}),
})

// ❌ DON'T: Wrong injection token
ObservabilityModule.forRootAsync({
  imports: [ConfigModule],
  inject: ['ConfigService'], // ❌ Should be ConfigService class
  useFactory: (configService: ConfigService) => ({...}),
})

// ❌ DON'T: Synchronous factory for async operations
ObservabilityModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    // ❌ This won't work if getConfig() is async
    const config = someAsyncService.getConfig();
    return { serviceName: config.name };
  },
})

// ✅ DO: Proper async factory
ObservabilityModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    // ✅ Properly await async operations
    const config = await someAsyncService.getConfig();
    return { serviceName: config.name };
  },
})
```

### 4. Global Logger Configuration

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from '@paystackhq/nestjs-observability';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get the logger service from the app context
  const logger = app.get(LoggerService);

  // Replace the global logger
  app.useLogger(logger);

  logger.log('Application starting', 'Bootstrap');
  await app.listen(3000);
  logger.log('Application started on port 3000', 'Bootstrap');
}
bootstrap();
```

## 🌍 Environment Variables

### Core Configuration

```bash
# Service identification
SERVICE_NAME=my-service
SERVICE_VERSION=1.0.0
NODE_ENV=production

# Logging
LOG_LEVEL=info                    # error, warn, info, debug, verbose
LOG_CONSOLE_OUTPUT=true           # Enable console output
OTLP_LOGS_ENABLED=false          # Export logs via OTLP
OTLP_LOGS_ENDPOINT=http://localhost:4318/v1/logs

# Metrics
METRICS_ENABLED=true              # Enable metrics collection
METRICS_ENDPOINT=/metrics         # Metrics endpoint path
METRICS_DEFAULT_ENABLED=true      # Enable default Node.js metrics

# Tracing
TRACING_ENABLED=true              # Enable distributed tracing
TRACING_SAMPLE_RATE=1.0          # Sampling ratio (0.0-1.0)
TRACING_SANITIZATION_ENABLED=true # Enable attribute sanitization
TRACING_REDACTED_PLACEHOLDER=[REDACTED]

# OpenTelemetry Export
OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTLP_HEADERS={"x-api-key":"your-api-key"}
```

### Advanced Tracing Configuration

```bash
# Instrumentation Control
TRACING_INSTRUMENTATIONS_DISABLED=fs,dns    # Comma-separated list
TRACING_INSTRUMENTATIONS_ENABLED=http,nestjs # Override auto-detection

# Sampler Configuration
TRACING_SAMPLER_TYPE=trace_id_ratio         # always_on, always_off, trace_id_ratio
TRACING_SAMPLER_RATIO=0.1                   # For trace_id_ratio sampler
```

## 📝 Logging

### Basic Logging

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@paystackhq/nestjs-observability';

@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('UserService');
  }

  async createUser(userData: any) {
    // Basic logging
    this.logger.log('Starting user creation');
    this.logger.debug('User data received', 'UserService');
    this.logger.warn('Validation warning');
    this.logger.error('Creation failed', '', 'UserService');
    this.logger.verbose('Detailed information');
    this.logger.fatal('Critical error occurred');
  }
}
```

### Structured Logging

```typescript
@Injectable()
export class PaymentService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('PaymentService');
  }

  async processPayment(paymentData: any) {
    // Structured logging with metadata
    this.logger.log({
      message: 'Processing payment',
      paymentId: paymentData.id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      userId: paymentData.userId,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await this.chargePayment(paymentData);

      this.logger.log({
        message: 'Payment processed successfully',
        paymentId: result.id,
        transactionId: result.transactionId,
        status: result.status,
        duration: result.processingTime,
      });

      return result;
    } catch (error) {
      this.logger.error({
        message: 'Payment processing failed',
        error: error.message,
        paymentId: paymentData.id,
        errorCode: error.code,
        stack: error.stack,
      });
      throw error;
    }
  }
}
```

### Context Management

```typescript
@Injectable()
export class OrderService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('OrderService');
  }

  async processOrder(orderId: string) {
    // Add persistent context
    this.logger.addContext({
      orderId,
      correlationId: `order_${Date.now()}`,
      sessionId: 'session_123',
    });

    // All subsequent logs will include this context
    this.logger.log('Order processing started');

    await this.validateOrder(orderId);
    await this.calculateTotals(orderId);

    this.logger.log('Order processing completed');

    // Clear context when done
    this.logger.clearContext();
  }

  private async validateOrder(orderId: string) {
    // Context is automatically included
    this.logger.debug('Validating order');

    // Create child logger for specific operation
    const childLogger = this.logger.createChildLogger('OrderValidation', {
      validationTimestamp: new Date().toISOString(),
    });

    childLogger.log('Starting validation process');
    // Child logger inherits parent context
  }
}
```

## 🔍 Distributed Tracing

### Auto-Tracing with Decorators

```typescript
import { Injectable, Controller, Get, Post, Body } from '@nestjs/common';
import { TraceClass, Trace, NoTrace } from '@paystackhq/nestjs-observability';

// Controllers are automatically traced
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async getUser(@Param('id') id: string) {
    // Automatically traced as UserController.getUser
    return await this.userService.findUser(id);
  }

  @Post()
  @Trace('user.create') // Custom span name
  async createUser(@Body() userData: any) {
    // Traced as 'user.create'
    return await this.userService.createUser(userData);
  }

  @Get('health')
  @NoTrace() // Exclude from tracing
  getHealth() {
    return { status: 'ok' };
  }
}

// Providers need explicit tracing
@Injectable()
@TraceClass() // Enable tracing for all methods
export class UserService {
  async findUser(id: string) {
    // Automatically traced as UserService.findUser
    return await this.userRepository.findById(id);
  }

  @Trace('user.complex-operation') // Custom name
  async complexOperation(data: any) {
    // Custom span name
    return await this.processComplexData(data);
  }

  @NoTrace() // Exclude this method from tracing
  private logSensitiveData(data: any) {
    // This method won't be traced
    console.log('Sensitive data:', data);
  }
}
```

### Manual Span Management

```typescript
import { Injectable } from '@nestjs/common';
import { addSpanAttribute, addSpanAttributes, getCurrentSpan } from '@paystackhq/nestjs-observability';

@Injectable()
@TraceClass()
export class AnalyticsService {
  async processAnalytics(data: any) {
    // Add custom attributes to current span
    addSpanAttribute('data.size', data.length);
    addSpanAttribute('processing.type', 'batch');

    // Add multiple attributes
    addSpanAttributes({
      'user.id': data.userId,
      'batch.id': data.batchId,
      'processing.priority': 'high',
    });

    // Get current span for advanced operations
    const span = getCurrentSpan();
    if (span) {
      span.addEvent('Processing started', {
        timestamp: Date.now(),
        attributes: { 'event.type': 'processing' },
      });
    }

    const result = await this.performAnalysis(data);

    // Add result attributes
    addSpanAttributes({
      'result.count': result.length,
      'processing.duration': result.processingTime,
      'processing.status': 'completed',
    });

    return result;
  }
}
```

### Excluding Classes from Tracing

```typescript
import { Injectable } from '@nestjs/common';
import { NoTraceClass } from '@paystackhq/nestjs-observability';

@Injectable()
@NoTraceClass() // Exclude entire class from auto-tracing
export class InternalService {
  // No methods in this class will be traced
  async internalOperation() {
    return 'internal result';
  }
}
```

## 📊 Metrics Collection

### Built-in Metrics

The library automatically collects:

- **HTTP Request Metrics**: Request count, duration, status codes
- **Node.js Metrics**: Memory usage, CPU, garbage collection
- **Application Metrics**: Service information, environment labels

### Custom Metrics

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from '@paystackhq/nestjs-observability';

@Injectable()
export class BusinessMetricsService {
  private readonly paymentCounter;
  private readonly orderDurationHistogram;
  private readonly activeUsersGauge;
  private readonly processingTimeSummary;

  constructor(private readonly metricsService: MetricsService) {
    // Create custom metrics
    this.paymentCounter = this.metricsService.createCounter('payments_total', 'Total number of payments processed', [
      'method',
      'status',
      'currency',
    ]);

    this.orderDurationHistogram = this.metricsService.createHistogram(
      'order_processing_duration_seconds',
      'Time spent processing orders',
      ['order_type', 'priority'],
      [0.1, 0.5, 1, 2, 5, 10, 30] // Custom buckets
    );

    this.activeUsersGauge = this.metricsService.createGauge('active_users', 'Number of currently active users', [
      'user_type',
    ]);

    this.processingTimeSummary = this.metricsService.createSummary(
      'processing_time_seconds',
      'Summary of processing times',
      ['operation_type'],
      [0.5, 0.9, 0.95, 0.99] // Custom percentiles
    );
  }

  recordPayment(method: string, status: string, currency: string) {
    this.paymentCounter.inc({ method, status, currency });
  }

  recordOrderProcessing(orderType: string, priority: string, duration: number) {
    this.orderDurationHistogram.observe({ order_type: orderType, priority }, duration);
  }

  updateActiveUsers(userType: string, count: number) {
    this.activeUsersGauge.set({ user_type: userType }, count);
  }

  recordProcessingTime(operationType: string, duration: number) {
    this.processingTimeSummary.observe({ operation_type: operationType }, duration);
  }
}
```

### Metrics Controller

Access metrics via the built-in endpoint:

```bash
curl http://localhost:3000/metrics
```

Response format:

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/users",status_code="200",service="my-service",version="1.0.0"} 42

# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/users",status_code="200",le="0.01"} 5
http_request_duration_seconds_bucket{method="GET",route="/users",status_code="200",le="0.05"} 15
```

## 🛠️ Best Practices

### 1. Logging Best Practices

```typescript
@Injectable()
export class OrderService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('OrderService');
  }

  async processOrder(orderId: string) {
    // ✅ DO: Use structured logging
    this.logger.log({
      message: 'Processing order',
      orderId,
      timestamp: new Date().toISOString(),
    });

    // ❌ DON'T: Use string interpolation
    this.logger.log(`Processing order ${orderId}`);

    // ✅ DO: Include correlation IDs
    this.logger.addContext({
      orderId,
      correlationId: generateCorrelationId(),
    });

    // ✅ DO: Log both success and failure
    try {
      const result = await this.processOrderLogic(orderId);

      this.logger.log({
        message: 'Order processed successfully',
        orderId,
        processingTime: result.duration,
        status: result.status,
      });

      return result;
    } catch (error) {
      this.logger.error({
        message: 'Order processing failed',
        orderId,
        error: error.message,
        errorCode: error.code,
      });
      throw error;
    }
  }
}
```

### 2. Tracing Best Practices

```typescript
@Injectable()
@TraceClass()
export class PaymentService {
  // ✅ DO: Use meaningful span names
  @Trace('payment.process')
  async processPayment(data: any) {
    // Add relevant attributes
    addSpanAttributes({
      'payment.id': data.id,
      'payment.amount': data.amount,
      'payment.currency': data.currency,
    });

    return await this.chargePayment(data);
  }

  // ✅ DO: Exclude sensitive operations
  @NoTrace()
  private logCreditCardDetails(cardData: any) {
    // Sensitive operations should not be traced
  }

  // ✅ DO: Use child spans for complex operations
  @Trace('payment.validate')
  async validatePayment(data: any) {
    const span = getCurrentSpan();
    if (span) {
      span.addEvent('Validation started');
    }

    await this.validateCard(data.card);
    await this.validateAmount(data.amount);

    if (span) {
      span.addEvent('Validation completed');
    }
  }
}
```

### 3. Metrics Best Practices

```typescript
@Injectable()
export class MetricsCollector {
  constructor(private readonly metricsService: MetricsService) {}

  // ✅ DO: Use consistent naming
  private readonly apiRequestCounter = this.metricsService.createCounter('api_requests_total', 'Total API requests', [
    'method',
    'endpoint',
    'status',
  ]);

  // ✅ DO: Include relevant labels
  recordApiRequest(method: string, endpoint: string, status: number) {
    this.apiRequestCounter.inc({
      method: method.toUpperCase(),
      endpoint: this.normalizeEndpoint(endpoint),
      status: status.toString(),
    });
  }

  // ✅ DO: Normalize high-cardinality labels
  private normalizeEndpoint(endpoint: string): string {
    return endpoint.replace(/\/\d+/g, '/:id');
  }
}
```

### 4. Error Handling Best Practices

```typescript
@Injectable()
export class RobustService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('RobustService');
  }

  async processData(data: any) {
    const startTime = Date.now();

    try {
      // Add tracing context
      addSpanAttributes({
        'data.size': data.length,
        'processing.type': 'batch',
      });

      const result = await this.performProcessing(data);

      // Log successful completion
      this.logger.log({
        message: 'Data processing completed',
        duration: Date.now() - startTime,
        recordsProcessed: result.length,
        success: true,
      });

      return result;
    } catch (error) {
      // Comprehensive error logging
      this.logger.error({
        message: 'Data processing failed',
        duration: Date.now() - startTime,
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack,
        dataSize: data.length,
        success: false,
      });

      // Add error attributes to span
      addSpanAttributes({
        'error.type': error.constructor.name,
        'error.message': error.message,
        'processing.success': false,
      });

      throw error;
    }
  }
}
```

## 🔧 Development & Contributing

### Development Setup

```bash
# Clone the repository
git clone https://github.com/paystackhq/nestjs-observability.git
cd nestjs-observability

# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type checking
pnpm type-check

# Linting
pnpm lint
pnpm lint:fix

# Format code
pnpm format
```

### Building the Library

```bash
# Build both CommonJS and ESM versions
pnpm build

# Build information
pnpm build:info

# Validate build
pnpm validate-build

# Clean build artifacts
pnpm clean
```

### Testing Changes

```bash
# Run the example application
cd examples/basic-app
pnpm install
pnpm start

# Test different endpoints
curl http://localhost:3000/health
curl http://localhost:3000/metrics
curl http://localhost:3000/users
```

### Publishing New Versions

This library uses [Changesets](https://github.com/changesets/changesets) for version management:

```bash
# Add a changeset for your changes
pnpm changeset

# Version packages (updates package.json and CHANGELOG.md)
pnpm changeset:version

# Publish to registry
pnpm changeset:publish
```

#### Changeset Types

- **patch**: Bug fixes, minor improvements
- **minor**: New features, backwards compatible
- **major**: Breaking changes

#### Example Changeset Process

```bash
# 1. Make your changes
git checkout -b feature/new-feature

# 2. Add changeset
pnpm changeset
# Choose change type and describe your changes

# 3. Commit everything
git add .
git commit -m "feat: add new feature"

# 4. Create PR
# After merge, maintainers will run version and publish
```

### Build Architecture

The library supports dual package distribution:

```
dist/
├── cjs/                    # CommonJS build
│   ├── index.js
│   ├── index.d.ts
│   └── ...
├── esm/                    # ESM build
│   ├── index.js
│   ├── index.d.ts
│   └── ...
```

**Build Scripts:**

- `scripts/build-info.js` - Display build information
- `scripts/fix-esm-imports.js` - Fix ESM import extensions
- `scripts/validate-build.js` - Validate build outputs

### Pre-commit Hooks

The project uses Husky for pre-commit hooks:

```bash
# Runs automatically before commits
- ESLint checking
- Prettier formatting
- Type checking
```

### CI/CD Pipeline

The library uses GitHub Actions for:

- **Testing**: Run tests on multiple Node.js versions
- **Building**: Validate build outputs
- **Publishing**: Automatic publishing on version tags

### Documentation

Update documentation when:

- Adding new features
- Changing APIs
- Updating configuration options
- Adding new examples

### Performance Considerations

When developing:

- **Tracing**: Minimize overhead in hot paths
- **Logging**: Use appropriate log levels
- **Metrics**: Avoid high-cardinality labels
- **Memory**: Monitor memory usage in long-running processes

## 📚 Documentation

- [First Steps Guide](docs/first-steps.md) - Complete getting started guide
- [Best Practices](docs/best-practices.md) - Production-ready best practices and patterns
- [Advanced Factory Configuration](docs/advanced-factory-configuration.md) - Complex configuration patterns

## 📚 Examples

### Complete NestJS Application

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ObservabilityModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        serviceName: config.get('SERVICE_NAME', 'example-app'),
        serviceVersion: config.get('SERVICE_VERSION', '1.0.0'),
        environment: config.get('NODE_ENV', 'development'),
        // Environment variables are automatically loaded
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

// app.controller.ts
@Controller('api')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService
  ) {
    this.logger.setContext('AppController');
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    // Automatically traced and logged
    return await this.appService.findUser(id);
  }

  @Post('users')
  @Trace('user.create')
  async createUser(@Body() userData: any) {
    // Custom span name
    return await this.appService.createUser(userData);
  }
}

// app.service.ts
@Injectable()
@TraceClass()
export class AppService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('AppService');
  }

  async findUser(id: string) {
    // Automatically traced as AppService.findUser
    this.logger.log({ message: 'Finding user', userId: id });

    addSpanAttribute('user.id', id);

    return { id, name: 'John Doe' };
  }

  async createUser(userData: any) {
    // Traced and logged with full context
    this.logger.log({
      message: 'Creating user',
      email: userData.email,
      timestamp: new Date().toISOString(),
    });

    addSpanAttributes({
      'user.email': userData.email,
      'user.type': userData.type || 'standard',
    });

    return { id: 'new-id', ...userData };
  }
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the PROPRIETARY License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Join our GitHub Discussions for questions and ideas
