# nestjs-observability

A comprehensive observability package for NestJS applications that provides structured logging, metrics collection, and distributed tracing capabilities.

## Features

- **Enhanced Native NestJS Logger**: Extends NestJS's built-in ConsoleLogger with observability features
- **Environment-Aware Logging**: Structured format for production, pretty format for development
- **OpenTelemetry Integration**: Automatic trace context inclusion in logs
- **Structured Logging**: Support for structured log data with additional context
- **Metrics Collection**: Prometheus-compatible metrics with custom counters, gauges, and histograms
- **Distributed Tracing**: OpenTelemetry-based request tracing
- **HTTP Interceptors**: Automatic request/response logging and metrics
- **Method Decorators**: Easy tracing for individual methods and classes
- **Global Module**: Easy integration across your entire application

## Installation

```bash
npm install nestjs-observability
# or
pnpm add nestjs-observability
# or
yarn add nestjs-observability
```

### Peer Dependencies

Make sure you have these peer dependencies installed:

```bash
npm install @nestjs/common @nestjs/core @nestjs/config reflect-metadata rxjs
```

### Optional Dependencies

For OpenTelemetry tracing and Prometheus metrics:

```bash
npm install @opentelemetry/api prom-client
```

## Quick Start

### 1. Import the Module

In your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ObservabilityModule } from 'nestjs-observability';

@Module({
  imports: [
    // Basic setup with default configuration
    ObservabilityModule.forRoot(),

    // Or with custom configuration
    ObservabilityModule.forRoot({
      serviceName: 'my-service',
      environment: process.env.NODE_ENV || 'development',
      logging: {
        level: 'info',
        structuredLogging: process.env.NODE_ENV === 'production', // Structured in prod, pretty in dev
        consoleOutput: true,
      },
      metrics: {
        enabled: true,
        defaultLabels: {
          service: 'my-service',
          version: '1.0.0',
        },
      },
      tracing: {
        enabled: true,
        exporter: {
          type: 'otlp',
          endpoint: 'http://localhost:4318/v1/traces',
        },
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Configure Global Logger (Optional but Recommended)

In your `main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerFactory } from 'nestjs-observability';

async function bootstrap() {
  // Configure the global logger to replace NestJS's default logger
  const config = {
    serviceName: 'my-service',
    environment: process.env.NODE_ENV || 'development',
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      structuredLogging: process.env.NODE_ENV === 'production',
      consoleOutput: true,
    },
    // ... other config options
  };

  const logger = LoggerFactory.configureGlobalLogger(config);

  const app = await NestFactory.create(AppModule, {
    logger, // Use our enhanced logger for the entire application
  });

  logger.log('Application starting', 'Bootstrap');
  await app.listen(3000);
  logger.log('Application started on port 3000', 'Bootstrap');
}
bootstrap();
```

### 3. Async Configuration

For dynamic configuration using ConfigService:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ObservabilityModule } from 'nestjs-observability';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ObservabilityModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        serviceName: configService.get('SERVICE_NAME', 'my-service'),
        environment: configService.get('NODE_ENV', 'development'),
        logging: {
          level: configService.get('LOG_LEVEL', 'info'),
          structuredLogging: configService.get('NODE_ENV') === 'production',
          consoleOutput: true,
        },
        metrics: {
          enabled: configService.get('METRICS_ENABLED', 'true') === 'true',
        },
        tracing: {
          enabled: configService.get('TRACING_ENABLED', 'true') === 'true',
          exporter: {
            type: 'otlp',
            endpoint: configService.get('OTLP_TRACES_ENDPOINT', 'http://localhost:4318/v1/traces'),
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Usage

### Basic Logging

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from 'nestjs-observability';

@Injectable()
export class MyService {
  constructor(private readonly logger: LoggerService) {
    // Set context for this service
    this.logger.setContext('MyService');
  }

  async doSomething() {
    // Basic logging methods
    this.logger.log('Starting operation');
    this.logger.debug('Debug information');
    this.logger.warn('Warning message');
    this.logger.error('Error occurred');
    this.logger.verbose('Verbose details');
    this.logger.fatal('Critical error'); // Maps to error with FATAL prefix
  }
}
```

### Structured Logging

```typescript
@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('UserService');
  }

  async createUser(userData: any) {
    // Structured logging with additional context
    this.logger.log({
      message: 'Creating new user',
      userId: userData.id,
      email: userData.email,
      requestId: 'req_123',
    });

    try {
      // Your business logic
      const user = await this.userRepository.create(userData);

      this.logger.log({
        message: 'User created successfully',
        userId: user.id,
        email: user.email,
        createdAt: user.createdAt,
      });

      return user;
    } catch (error) {
      this.logger.error({
        message: 'Failed to create user',
        error: error.message,
        stack: error.stack,
        userData: { email: userData.email }, // Don't log sensitive data
      });
      throw error;
    }
  }
}
```

### Child Loggers with Persistent Context

```typescript
@Injectable()
export class PaymentService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('PaymentService');
  }

  async processPayment(paymentData: any) {
    // Create a child logger with persistent context for this operation
    const paymentLogger = this.logger.createChildLogger('PaymentProcessor', {
      paymentId: paymentData.id,
      sessionId: paymentData.sessionId,
      correlationId: `corr_${Date.now()}`,
    });

    // All logs from this child logger will include the persistent context
    paymentLogger.log('Payment processing started');

    try {
      paymentLogger.log('Validating payment data');
      await this.validatePayment(paymentData);

      paymentLogger.log('Authorizing payment');
      const authResult = await this.authorizePayment(paymentData);

      paymentLogger.log('Payment authorized successfully', { authCode: authResult.code });
      return authResult;
    } catch (error) {
      paymentLogger.error({
        message: 'Payment processing failed',
        error: error.message,
        step: 'authorization',
      });
      throw error;
    }
  }
}
```

### Controller Logging with Request Context

```typescript
@Controller('api')
export class ApiController {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('ApiController');
  }

  @Post('process')
  async processData(@Body() data: any, @Req() request: any) {
    const requestId = request.headers['x-request-id'] || `req_${Date.now()}`;

    // Create request-scoped logger
    const requestLogger = this.logger.createChildLogger('ProcessData', {
      requestId,
      endpoint: request.url,
      userAgent: request.headers['user-agent'],
    });

    requestLogger.log({
      message: 'Processing request started',
      dataSize: JSON.stringify(data).length,
      contentType: request.headers['content-type'],
    });

    try {
      const result = await this.processBusinessLogic(data);

      requestLogger.log({
        message: 'Request processed successfully',
        resultId: result.id,
        duration: `${Date.now() - requestStart}ms`,
      });

      return result;
    } catch (error) {
      requestLogger.error({
        message: 'Request processing failed',
        error: error.message,
        duration: `${Date.now() - requestStart}ms`,
      });
      throw error;
    }
  }
}
```

## Environment Configuration

### Development Environment

- Pretty formatted logs for readability
- Debug level logging enabled
- Colorized output
- Full stack traces

### Production Environment

- Structured JSON formatted logs for log aggregation
- Info/warn level logging
- Structured format for monitoring tools
- Trace correlation with OpenTelemetry

### Environment Variables

```bash
# Basic Configuration
NODE_ENV=production
SERVICE_NAME=my-service
SERVICE_VERSION=1.0.0
LOG_LEVEL=info

# OpenTelemetry Configuration
TRACING_ENABLED=true
OTLP_TRACES_ENDPOINT=https://api.honeycomb.io/v1/traces
OTLP_LOGS_ENDPOINT=https://api.honeycomb.io/v1/logs
OTLP_HEADERS={"x-honeycomb-team":"your-api-key"}

# Metrics Configuration
METRICS_ENABLED=true
METRICS_ENDPOINT=/metrics
```

## Integration with OpenTelemetry

The logger automatically includes trace context when OpenTelemetry tracing is active:

**Development Output (Pretty Format):**

```
[12:34:56.789] LOG [MyService] Processing user data [trace: a1b2c3d4]
```

**Production Output (Structured Format):**

```json
{
  "level": "info",
  "timestamp": "2024-01-01T12:34:56.789Z",
  "message": "Processing user data",
  "context": "MyService",
  "service": "my-service",
  "environment": "production",
  "traceId": "a1b2c3d4e5f6g7h8",
  "spanId": "i9j0k1l2m3n4",
  "userId": "12345",
  "operation": "user-processing"
}
```

## Best Practices

1. **Set Context**: Always set context for your services using `logger.setContext()`
2. **Use Structured Logging**: Include relevant metadata as objects rather than string interpolation
3. **Child Loggers**: Use child loggers for request-scoped or operation-scoped logging
4. **Error Handling**: Include error context, correlation IDs, and relevant state
5. **Performance Monitoring**: Log operation durations and success/failure metrics
6. **Security**: Never log sensitive data like passwords, tokens, or PII
7. **Correlation**: Use correlation IDs to track requests across services

## Configuration Options

### Complete Configuration Interface

```typescript
interface ObservabilityConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;

  logging: {
    level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
    consoleOutput: boolean;
    structuredLogging: boolean;
    otlpExport: {
      enabled: boolean;
      endpoint: string;
    };
  };

  metrics: {
    enabled: boolean;
    endpoint: string;
    defaultLabels: Record<string, string>;
    defaultMetrics: boolean;
  };

  tracing: {
    enabled: boolean;
    sampler: {
      type: 'always_on' | 'always_off' | 'trace_id_ratio';
      ratio?: number;
    };
    exporter: {
      type: 'otlp';
      endpoint: string;
      headers?: Record<string, string>;
    };
    instrumentations: {
      http: boolean;
      nestJs: boolean;
      winston: boolean;
    };
  };
}
```

## API Reference

### LoggerService

The enhanced logger extends NestJS's native ConsoleLogger and provides:

- `log(message, context?)`: Info level logging
- `error(message, stack?, context?)`: Error level logging
- `warn(message, context?)`: Warning level logging
- `debug(message, context?)`: Debug level logging
- `verbose(message, context?)`: Verbose level logging
- `fatal(message, context?)`: Fatal level logging (maps to error)
- `logWithContext(level, message, contextData, contextName?)`: Structured logging
- `createChildLogger(context, persistentContext?)`: Create child logger with persistent context
- `setContext(context)`: Set the context name for the logger

### LoggerFactory

Factory methods for creating and configuring loggers:

- `LoggerFactory.create(config)`: Create a logger instance
- `LoggerFactory.createChild(config, context, additionalContext?)`: Create child logger
- `LoggerFactory.configureGlobalLogger(config)`: Configure global NestJS logger
- `LoggerFactory.createForService(config, serviceName)`: Create service-specific logger

## Migration from Winston

If you're migrating from Winston-based logging:

1. Remove Winston dependencies and imports
2. Replace Winston logger injection with `LoggerService`
3. Update logging calls to use native NestJS logger methods
4. Configure environment-specific structured/pretty formatting
5. Set up OpenTelemetry integration for trace correlation

The enhanced logger maintains compatibility with existing NestJS logging patterns while adding observability features.

## Metrics Endpoint

The package automatically exposes a `/metrics` endpoint (configurable) that returns Prometheus-formatted metrics:

```bash
curl http://localhost:3000/metrics
```

### Automatic Controller Registration

When you import `ObservabilityModule` into your NestJS application, the `MetricsController` is **automatically registered** if metrics are enabled (which is the default). This means:

1. **No manual controller registration needed** - The `/metrics` endpoint becomes available immediately
2. **Conditional registration** - The controller is only registered when `metrics.enabled !== false`
3. **Configurable endpoint** - You can customize the metrics endpoint path through configuration

```typescript
// The controller is automatically included with default config
ObservabilityModule.forRoot();

// Or explicitly enable/disable it
ObservabilityModule.forRoot({
  metrics: {
    enabled: true, // MetricsController will be registered
    endpoint: '/custom-metrics', // Custom endpoint path (future feature)
  },
});

// To disable the metrics endpoint entirely
ObservabilityModule.forRoot({
  metrics: {
    enabled: false, // MetricsController will NOT be registered
  },
});
```

### What this means for your application:

- **Zero configuration**: Import the module and `/metrics` endpoint is ready
- **Production ready**: Metrics are available for Prometheus scraping immediately
- **No route conflicts**: The controller uses the standard `/metrics` path
- **Automatic headers**: Proper `Content-Type: text/plain; charset=utf-8` headers are set

```bash
# Test the metrics endpoint
curl http://localhost:3000/metrics

# Expected response format:
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
# http_requests_total{method="GET",status="200"} 42
# ...
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for your changes
4. Ensure all tests pass
5. Submit a pull request

## Support

For issues and questions, please use the GitHub issue tracker.
