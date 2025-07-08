# First Steps

## Getting Started

This guide will help you get started with the NestJS Observability module.

## Installation

```bash
npm install nestjs-observability
```

## Basic Setup

```typescript
import { Module } from '@nestjs/common';
import { ObservabilityModule } from 'nestjs-observability';

@Module({
  imports: [
    ObservabilityModule.forRoot({
      serviceName: 'my-app',
      serviceVersion: '1.0.0',
      tracing: {
        enabled: true,
        exporter: {
          endpoint: 'http://localhost:4318/v1/traces',
          type: 'otlp',
        },
      },
    }),
  ],
})
export class AppModule {}
```

## Instrumentation Configuration

The module uses a modern approach to instrumentation configuration that provides maximum coverage out of the box while allowing fine-grained control when needed.

### Default Behavior (Recommended)

By default, **all available auto-instrumentations are enabled**. This includes:

- **HTTP/Express/NestJS**: Web framework instrumentations
- **Database**: PostgreSQL, MySQL, MongoDB, Redis, etc.
- **Message Queues**: AWS SQS, RabbitMQ, Kafka, etc.
- **Logging**: Winston, Pino, Bunyan, etc.
- **File System**: FS operations
- **Network**: DNS, Net, HTTP client requests
- **And many more...**

This means you get comprehensive tracing for your entire application without any additional configuration.

### Environment Variables

```bash
# Enable/disable all auto-instrumentations (default: true)
TRACING_AUTO_INSTRUMENTATIONS=true

# Disable specific instrumentations (comma-separated list)
TRACING_DISABLED_INSTRUMENTATIONS="@opentelemetry/instrumentation-fs,@opentelemetry/instrumentation-dns"

# Override specific instrumentation configurations (JSON format)
TRACING_INSTRUMENTATION_OVERRIDES='{"@opentelemetry/instrumentation-http": {"requestHook": "custom"}, "@opentelemetry/instrumentation-express": {"requestHook": "custom"}}'
```

### Configuration Examples

#### Example 1: Basic Setup (All instrumentations enabled)

```typescript
// This enables ALL available instrumentations automatically
ObservabilityModule.forRoot({
  serviceName: 'my-app',
  tracing: {
    enabled: true,
    instrumentations: {
      autoInstrumentations: true, // Default: true
      disabled: [],
      overrides: {},
    },
  },
});
```

#### Example 2: Disable problematic instrumentations

```typescript
// Disable file system and DNS instrumentations if they're too noisy
ObservabilityModule.forRoot({
  serviceName: 'my-app',
  tracing: {
    enabled: true,
    instrumentations: {
      autoInstrumentations: true,
      disabled: ['@opentelemetry/instrumentation-fs', '@opentelemetry/instrumentation-dns'],
      overrides: {},
    },
  },
});
```

#### Example 3: Custom configuration for specific instrumentations

```typescript
// Fine-tune specific instrumentations
ObservabilityModule.forRoot({
  serviceName: 'my-app',
  tracing: {
    enabled: true,
    instrumentations: {
      autoInstrumentations: true,
      disabled: [],
      overrides: {
        '@opentelemetry/instrumentation-http': {
          requestHook: (span, request) => {
            // Custom request hook
          },
        },
        '@opentelemetry/instrumentation-pg': {
          addSqlCommenterCommentToQueries: true,
        },
      },
    },
  },
});
```

#### Example 4: Production-optimized configuration

```typescript
// Disable noisy instrumentations in production
ObservabilityModule.forRoot({
  serviceName: 'my-app',
  tracing: {
    enabled: true,
    instrumentations: {
      autoInstrumentations: true,
      disabled: [
        '@opentelemetry/instrumentation-fs',
        '@opentelemetry/instrumentation-dns',
        '@opentelemetry/instrumentation-net',
      ],
      overrides: {
        '@opentelemetry/instrumentation-http': {
          ignoreOutgoingRequestHook: (req) => {
            // Ignore health checks and metrics endpoints
            return req.path === '/health' || req.path === '/metrics';
          },
        },
      },
    },
  },
});
```

### Supported Technologies

With auto-instrumentations enabled, you automatically get tracing for:

**Web Frameworks:**

- Express.js
- NestJS
- Fastify
- Koa

**Databases:**

- PostgreSQL
- MySQL/MySQL2
- MongoDB
- Redis
- Cassandra
- DynamoDB

**Message Queues:**

- AWS SQS
- RabbitMQ/AMQP
- Kafka
- Google Pub/Sub

**Logging:**

- Winston
- Pino
- Bunyan

**Cloud Services:**

- AWS SDK
- Google Cloud
- Azure

**And many more...**

### Best Practices

1. **Start with defaults**: Enable all auto-instrumentations and only disable specific ones that cause issues
2. **Use environment variables**: Configure instrumentations via environment variables for different environments
3. **Monitor performance**: Some instrumentations can be noisy in high-traffic applications
4. **Test thoroughly**: Validate that your specific technology stack works well with the enabled instrumentations

### Migration from Previous Versions

If you're upgrading from an older version that used the `http`, `nestJs`, and `winston` flags:

```typescript
// Old approach (deprecated)
tracing: {
  instrumentations: {
    http: true,
    nestJs: true,
    winston: true,
  },
}

// New approach (recommended)
tracing: {
  instrumentations: {
    autoInstrumentations: true, // Enables ALL instrumentations including the above
    disabled: [], // Disable specific ones if needed
    overrides: {}, // Fine-tune specific ones if needed
  },
}
```

The new approach provides much more comprehensive coverage and is future-proof for new technologies.
