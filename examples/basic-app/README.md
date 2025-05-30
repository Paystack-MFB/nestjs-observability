# Basic NestJS Observability Example

This is a minimal example demonstrating how to integrate the `nestjs-observability` library into a NestJS application.

## Features Demonstrated

- ✅ Enhanced logging with context and trace correlation
- ✅ Automatic metrics collection (`/metrics` endpoint)
- ✅ Distributed tracing with OpenTelemetry
- ✅ Health check endpoint
- ✅ Environment-based configuration
- ✅ Structured logging in production vs. pretty logging in development

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Configuration

Copy the example environment file and modify as needed:

```bash
cp .env.example .env
```

### 3. Run the Application

```bash
# Development mode with file watching
pnpm start:dev

# Production mode
pnpm start:prod
```

### 4. Test the Observability Features

```bash
# Health check
curl http://localhost:3000/health

# Hello endpoint (generates logs and metrics)
curl http://localhost:3000

# Metrics endpoint (Prometheus format)
curl http://localhost:3000/metrics

# Users endpoint (more complex example)
curl http://localhost:3000/users
```

## Environment Variables

| Variable               | Default                           | Description                               |
| ---------------------- | --------------------------------- | ----------------------------------------- |
| `SERVICE_NAME`         | `basic-example`                   | Service name for logging and tracing      |
| `SERVICE_VERSION`      | `1.0.0`                           | Service version                           |
| `NODE_ENV`             | `development`                     | Environment (development/production)      |
| `PORT`                 | `3000`                            | HTTP port                                 |
| `LOG_LEVEL`            | `info`                            | Log level (error/warn/info/debug/verbose) |
| `METRICS_ENABLED`      | `true`                            | Enable/disable metrics collection         |
| `TRACING_ENABLED`      | `true`                            | Enable/disable distributed tracing        |
| `OTLP_TRACES_ENDPOINT` | `http://localhost:4318/v1/traces` | OpenTelemetry traces endpoint             |

## Observability Features

### Logging

The example demonstrates different logging patterns:

- **Context-based logging**: Each service/controller sets its own context
- **Structured logging**: Logs include metadata objects in production
- **Trace correlation**: Logs automatically include trace IDs when available
- **Error handling**: Proper error logging with stack traces

### Metrics

Automatic metrics are collected for:

- HTTP requests (method, status code, duration)
- Response sizes
- Error rates
- Custom business metrics (demonstrated in UserService)

### Tracing

OpenTelemetry traces are automatically generated for:

- HTTP requests
- Database calls (if configured)
- Custom spans (demonstrated with decorators)

## Project Structure

```
src/
├── main.ts              # Bootstrap with observability setup
├── app.module.ts        # Main module with ObservabilityModule import
├── app.controller.ts    # Basic endpoints with logging
├── app.service.ts       # Service layer with observability
└── users/
    ├── users.module.ts  # Feature module example
    ├── users.controller.ts  # REST API with observability
    └── users.service.ts     # Business logic with custom metrics
```

## Development vs Production

### Development Mode

- Pretty-formatted logs with colors
- Verbose output for debugging
- All features enabled for testing

### Production Mode

- Structured JSON logs
- Efficient logging with proper levels
- Trace correlation for debugging
- Metrics for monitoring

## Monitoring Setup

For a complete monitoring stack, see the [docker-compose example](../docker-compose/).

The basic example includes:

- **Application logs**: Console output with trace correlation
- **Metrics endpoint**: Prometheus-compatible metrics at `/metrics`
- **Health checks**: Application health at `/health`

## Common Patterns

### Service with Logging

```typescript
@Injectable()
export class MyService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('MyService');
  }

  async processData(data: any) {
    this.logger.log('Processing data', { dataType: typeof data });

    try {
      // Business logic
      const result = await this.doWork(data);

      this.logger.log('Data processed successfully', {
        resultSize: result.length,
        processingTime: Date.now() - start,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to process data', error.stack, 'MyService');
      throw error;
    }
  }
}
```

### Controller with Metrics

```typescript
@Controller('api')
export class ApiController {
  constructor(
    private readonly service: MyService,
    private readonly logger: LoggerService,
    private readonly metricsService: MetricsService
  ) {
    this.logger.setContext('ApiController');
  }

  @Get('data')
  async getData() {
    const timer = this.metricsService.startTimer('api_request_duration', {
      endpoint: 'getData',
      method: 'GET',
    });

    try {
      this.logger.log('GET /api/data requested');
      const result = await this.service.processData();

      timer.end({ status: 'success' });
      return result;
    } catch (error) {
      timer.end({ status: 'error' });
      throw error;
    }
  }
}
```

## Troubleshooting

### Logs not showing trace context

- Ensure tracing is enabled (`TRACING_ENABLED=true`)
- Check OpenTelemetry endpoint connectivity
- Verify the application is receiving requests (trace context appears on active requests)

### Metrics not appearing

- Check `/metrics` endpoint is accessible
- Verify `METRICS_ENABLED=true`
- Ensure requests are being made to generate metrics

### Application not starting

- Check all environment variables are set correctly
- Verify dependencies are installed (`pnpm install`)
- Review logs for specific error messages

## Next Steps

- Explore [advanced examples](../README.md) for more complex scenarios
- Set up a [monitoring stack](../docker-compose/) for visualization
- Implement [custom metrics](../custom-metrics/) for your business logic
- Add [distributed tracing](../microservice/) across multiple services
