# NestJS Observability Package

A modern, production-ready observability package for NestJS applications that provides **zero-configuration** structured logging, metrics collection, and distributed tracing with OpenTelemetry 2025 best practices.

## 🚀 Quick Start

**Architecture - Zero Configuration Required!**

```bash
# 1. Install the package
npm install @paystackhq/nestjs-observability

# 2. Set environment variables (optional - has great defaults)
export OTEL_SERVICE_NAME="my-nestjs-app"
export OTEL_SERVICE_VERSION="1.0.0"
export OTEL_SERVICE_ENV="local"

# 3. Start your app with the register pattern
node -r @paystackhq/nestjs-observability/register dist/main.js
```

**That's it!** 🎉 Your app now has full observability with zero code changes needed.

## 🎯 Features

### Modern Architecture

- **🚀 Register Pattern**: OpenTelemetry initialization before app startup (Node.js `-r` flag)
- **🌐 Environment Variable Configuration**: Zero-config setup with OpenTelemetry standard variables
- **🏭 Global Provider Integration**: Uses OpenTelemetry global providers for maximum compatibility
- **📦 Simplified Module**: Just import `ObservabilityModule.forRoot()` - no configuration needed!

### Core Observability

- **🔍 Distributed Tracing**: OpenTelemetry-based automatic request tracing with span correlation
- **📊 Metrics Collection**: Prometheus-compatible metrics with custom counters, gauges, and histograms
- **📝 Structured Logging**: Enhanced logger with automatic trace context and request correlation
- **🌍 Multi-Environment**: Works seamlessly across development, staging, and production

### Enhanced Features

- **🎯 Auto-Tracing Decorators**: `@TraceClass`, `@Trace`, and `@NoTrace` for method-level control
- **🔒 Sensitive Data Protection**: Automatic PII redaction and `@NoTrace` for security-critical operations
- **⚡ Context Isolation**: Request-scoped logging with proper context separation
- **🔧 Environment-Driven**: All configuration via standard OpenTelemetry environment variables

### Enterprise Ready

- **🏢 Production Proven**: Battle-tested architecture with proper error handling
- **📈 Performance Optimized**: Minimal overhead with efficient OpenTelemetry integration
- **🔗 Platform Agnostic**: Works with Jaeger, Datadog, New Relic, Honeycomb, and any OTLP-compatible system
- **🛡️ Type Safe**: Full TypeScript support with comprehensive type definitions

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

## 🚀 Complete Setup Guide

### Step 1: Installation

```bash
npm install @paystackhq/nestjs-observability
```

### Step 2: Module Integration (Simple!)

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ObservabilityModule } from '@paystackhq/nestjs-observability';

@Module({
  imports: [
    // Zero configuration needed! 🎉
    ObservabilityModule.forRoot(),
  ],
})
export class AppModule {}
```

### Step 3: Environment Configuration

**Development Environment:**

```bash
# Service identification
export OTEL_SERVICE_NAME="my-nestjs-app"
export OTEL_SERVICE_VERSION="1.0.0"
export OTEL_SERVICE_ENV="dev"

# Development exporters (console output)
export OTEL_TRACES_EXPORTER="console"
export OTEL_METRICS_EXPORTER="console"
export OTEL_LOGS_EXPORTER="console"

# Optional: Enable HTTP request/response logging (disabled by default)
# Note: This is evaluated at startup - changing it requires an application restart
export OTEL_LOG_HTTP_REQUESTS="true"
```

**Production Environment:**

```bash
# Service identification
export OTEL_SERVICE_NAME="my-nestjs-app"
export OTEL_SERVICE_VERSION="1.0.0"
export OTEL_SERVICE_ENV="prod"
export NODE_ENV="production"

# Production exporters (OTLP)
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_LOGS_EXPORTER="otlp"

# OTLP configuration
export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.your-platform.com"
export OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer your-token"

# Performance tuning
export OTEL_TRACES_SAMPLER="traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.1"
```

### Step 4: Start Your Application

**Package.json scripts:**

```json
{
  "scripts": {
    "start": "node -r @paystackhq/nestjs-observability/register dist/main.js",
    "start:dev": "tsx --watch src/main.ts",
    "start:prod": "node -r @paystackhq/nestjs-observability/register dist/main.js"
  }
}
```

**Manual start:**

```bash
# Development
node -r @paystackhq/nestjs-observability/register dist/main.js

# With environment file
env $(cat .env.production | xargs) node -r @paystackhq/nestjs-observability/register dist/main.js
```

## 💡 Usage Examples

### Enhanced Logging with Context

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@paystackhq/nestjs-observability';

@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {
    // Set service-level context
    this.logger.setContext({
      service: 'UserService',
      version: '1.0.0',
    });
  }

  async createUser(userData: any) {
    // Add operation-specific context
    this.logger.addContext('operation', 'createUser');
    this.logger.addContext('userId', userData.id);

    this.logger.info('Creating user', {
      email: userData.email,
      roles: userData.roles,
    });

    // Business logic here...

    this.logger.info('User created successfully', {
      userId: userData.id,
      duration: '245ms',
    });
  }
}
```

### Custom Metrics Collection

```typescript
// payment.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { MetricsService } from '@paystackhq/nestjs-observability';

@Injectable()
export class PaymentService implements OnModuleInit {
  private paymentCounter: any;
  private paymentDuration: any;

  constructor(private readonly metrics: MetricsService) {}

  onModuleInit() {
    // Create custom business metrics
    this.paymentCounter = this.metrics.createCounter('payments_total', 'Total number of payment transactions');

    this.paymentDuration = this.metrics.createHistogram('payment_duration_seconds', 'Payment processing duration');
  }

  async processPayment(amount: number, currency: string) {
    const startTime = Date.now();

    try {
      // Business logic here...

      // Record successful payment
      this.paymentCounter.add(1, {
        currency,
        status: 'success',
      });

      const duration = (Date.now() - startTime) / 1000;
      this.paymentDuration.record(duration, { currency });
    } catch (error) {
      // Record failed payment
      this.paymentCounter.add(1, {
        currency,
        status: 'failed',
      });
      throw error;
    }
  }
}
```

### Advanced Tracing with Decorators

```typescript
// order.service.ts
import { Injectable } from '@nestjs/common';
import { TraceClass, Trace, NoTrace } from '@paystackhq/nestjs-observability';

@TraceClass({ spanNamePrefix: 'OrderService' })
@Injectable()
export class OrderService {
  @Trace() // Automatic tracing with span name "OrderService.createOrder"
  async createOrder(orderData: any) {
    // This method is automatically traced
    return this.processOrder(orderData);
  }

  @Trace('custom-order-processing') // Custom span name
  private async processOrder(orderData: any) {
    // Custom span name: "custom-order-processing"
    return { orderId: 'order-123', status: 'created' };
  }

  @NoTrace() // This method won't be traced (for sensitive operations)
  @NoLog() // This method won't be logged (for sensitive operations)
  async validatePaymentDetails(creditCard: string) {
    // Sensitive payment validation - not traced or logged for security
    return this.encryptPaymentData(creditCard);
  }
}
```

### Automatic Sensitive Data Masking

The package **automatically masks sensitive data in all logs** throughout your application:

```typescript
// Example: All structured logs are automatically masked
import { LoggerService } from '@paystackhq/nestjs-observability';

@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {}

  async createUser(userData: CreateUserDto) {
    // Sensitive fields are automatically masked in log output
    this.logger.info('Creating user', {
      email: 'user@example.com', // Will be masked as [MASKED]
      password: 'secret123', // Will be masked as [MASKED]
      name: 'John Doe', // Not masked
      apiKey: 'key123', // Will be masked as [MASKED]
    });
  }
}
```

**Default Masked Fields:**

- **Authentication**: password, token, secret, key, apikey, bearer, jwt, pin, securitycredential
- **Payment Data**: card, pan, cvv, accountnumber, credit, cvc
- **PII**: email, phone, address, ssn, surname, identifiervalue, identitynumber

**Add Custom Sensitive Fields:**

```typescript
// main.ts
import { addSensitiveFields } from '@paystackhq/nestjs-observability';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Add domain-specific fields to mask across ALL logs
  addSensitiveFields(['bvn', 'nin', 'customerId', 'merchantId']);

  await app.listen(3000);
}
```

### Request/Response Logging (Opt-In)

HTTP request/response logging is **opt-in** via environment variable:

```bash
# Enable request/response logging (disabled by default)
export OTEL_LOG_HTTP_REQUESTS="true"
```

**Important:** This setting is evaluated at application startup. To enable or disable request/response logging, you must restart the application.

When enabled, all HTTP requests and responses are logged with the same automatic masking applied:

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { NoLog, NoLogClass } from '@paystackhq/nestjs-observability';

@Controller('health')
@NoLogClass() // Exclude entire controller from request/response logging
export class HealthController {
  @Get()
  getHealth() {
    // This endpoint won't generate request/response logs (even when OTEL_LOG_HTTP_REQUESTS=true)
    return { status: 'ok' };
  }
}

@Controller('users')
export class UserController {
  @Get()
  getUsers() {
    // Logged with masked sensitive fields (when OTEL_LOG_HTTP_REQUESTS=true)
    return this.userService.findAll();
  }

  @NoLog() // Exclude specific endpoint from logging
  @Get('/internal')
  getInternalData() {
    // This endpoint won't generate request/response logs (even when OTEL_LOG_HTTP_REQUESTS=true)
    return this.internalService.getData();
  }
}
```

## 🌐 Platform Integration

### Jaeger Integration

```bash
# Environment variables for Jaeger
export OTEL_SERVICE_NAME="my-nestjs-app"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://jaeger:14268/api/traces"
```

### Datadog Integration

```bash
# Environment variables for Datadog
export OTEL_SERVICE_NAME="my-nestjs-app"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.datadoghq.com"
export OTEL_EXPORTER_OTLP_HEADERS="dd-api-key=your-api-key"
```

### New Relic Integration

```bash
# Environment variables for New Relic
export OTEL_SERVICE_NAME="my-nestjs-app"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp.nr-data.net:4317"
export OTEL_EXPORTER_OTLP_HEADERS="api-key=your-license-key"
```

### Honeycomb Integration

```bash
# Environment variables for Honeycomb
export OTEL_SERVICE_NAME="my-nestjs-app"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.honeycomb.io"
export OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=your-api-key,x-honeycomb-dataset=your-dataset"
```

### Custom OTLP Platform

```bash
# Environment variables for custom platform
export OTEL_SERVICE_NAME="my-nestjs-app"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_LOGS_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://your-custom-platform.com"
export OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer your-token"
```

## 🔧 Environment Variables Reference

### Core OpenTelemetry Variables

| Variable               | Description                 | Default         | Example              |
| ---------------------- | --------------------------- | --------------- | -------------------- |
| `OTEL_SERVICE_NAME`    | Service identification name | `"nestjs-app"`  | `"my-ecommerce-api"` |
| `OTEL_SERVICE_VERSION` | Service version             | `"1.0.0"`       | `"2.1.3"`            |
| `OTEL_SERVICE_ENV`     | Service environment         | `"local"`       | `"prod"`             |
| `NODE_ENV`             | Environment name            | `"development"` | `"production"`       |

### Exporter Configuration

| Variable                | Description           | Options                   | Default     |
| ----------------------- | --------------------- | ------------------------- | ----------- |
| `OTEL_TRACES_EXPORTER`  | Traces exporter type  | `console`, `otlp`, `none` | `"console"` |
| `OTEL_METRICS_EXPORTER` | Metrics exporter type | `console`, `otlp`, `none` | `"console"` |
| `OTEL_LOGS_EXPORTER`    | Logs exporter type    | `console`, `otlp`, `json` | `"console"` |

### OTLP Configuration

| Variable                      | Description               | Example                           |
| ----------------------------- | ------------------------- | --------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint URL         | `"https://api.honeycomb.io"`      |
| `OTEL_EXPORTER_OTLP_HEADERS`  | OTLP headers (auth, etc.) | `"api-key=abc123,x-custom=value"` |
| `OTEL_EXPORTER_OTLP_TIMEOUT`  | Request timeout (ms)      | `"30000"`                         |

### Sampling Configuration

| Variable                  | Description       | Example                         |
| ------------------------- | ----------------- | ------------------------------- |
| `OTEL_TRACES_SAMPLER`     | Sampling strategy | `"always_on"`, `"traceidratio"` |
| `OTEL_TRACES_SAMPLER_ARG` | Sampler argument  | `"0.1"` (10% sampling)          |

### Resource Attributes

```bash
# Custom resource attributes (comma-separated key=value pairs)
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=staging,service.namespace=ecommerce,k8s.cluster.name=prod-cluster"
```

### Library-Specific Variables

| Variable                                   | Description                       | Default      |
| ------------------------------------------ | --------------------------------- | ------------ |
| `OTEL_METRICS_ENABLED`                     | Enable/disable metrics collection | `"true"`     |
| `OTEL_METRICS_ENDPOINT`                    | Metrics HTTP endpoint path        | `"/metrics"` |
| `OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED` | Enable PII sanitization           | `"true"`     |

## 🆘 Troubleshooting

### Common Issues

**Problem**: App starts but no traces/metrics appear

```bash
# Solution: Check environment variables
echo $OTEL_SERVICE_NAME
echo $OTEL_TRACES_EXPORTER

# For local JSON logs to stdout (for shippers like Filebeat)
export OTEL_LOGS_EXPORTER="json"

# To disable signals entirely
export OTEL_TRACES_EXPORTER="none"
export OTEL_METRICS_EXPORTER="none"

# Enable debug logging
export OTEL_LOG_LEVEL="debug"
```

**Problem**: "Cannot resolve module" error

```bash
# Solution: Ensure proper package installation
npm install @paystackhq/nestjs-observability
npm run build
```

**Problem**: TypeScript compilation errors

```bash
# Solution: Ensure proper TypeScript configuration
npm install --save-dev @types/node
```

## 📖 Documentation

- [Environment Variables Guide](./docs/environment-variables.md)
- [Best Practices](./docs/best-practices.md)
- [Examples](./examples/basic-app/)

## 🤝 Contributing

We welcome contributions! Please feel free to:

- Open issues for bug reports or feature requests
- Submit pull requests with improvements
- Share feedback and suggestions

Before contributing, please ensure your code follows our formatting and testing standards.

## 📄 License

Proprietary License - see [LICENSE](./LICENSE) file for details.
