# NestJS Observability - Basic Example App

This example application demonstrates the complete functionality of the `@paystackhq/nestjs-observability` library, showcasing structured logging, metrics collection, and distributed tracing with automatic controller and service instrumentation.

## 🚀 Features Demonstrated

### 1. **Automatic Controller Tracing**

- All controller methods are automatically traced with HTTP context
- Request/response tracing with performance metrics
- Argument sanitization for sensitive data protection

### 2. **Service Method Tracing**

- `UserService` and `PaymentService` use `@TraceClass()` decorator
- Automatic tracing of all public methods
- Nested service calls create proper parent-child trace relationships

### 3. **Argument Sanitization**

- Sensitive data (passwords, tokens, card numbers) are automatically redacted
- Configurable sanitization patterns and placeholder text
- Demonstration with `/payments/sensitive` endpoint

### 4. **Enhanced Structured Logging**

- Context-aware logging with persistent fields
- Business event tracking
- Performance metrics logging
- Exception handling with context

### 5. **Metrics Collection**

- Prometheus metrics available at `/metrics`
- HTTP request metrics (duration, status codes, routes)
- Custom business metrics
- Memory and CPU usage monitoring

### 6. **OpenTelemetry Integration**

- Automatic instrumentation for HTTP, database, and file system operations
- OTLP export support for traces and logs
- Distributed tracing across service boundaries

## 📋 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Choose the appropriate environment configuration:

#### Development (Console Exporters)

```bash
cp .env.development .env
```

#### Production (OTLP Exporters)

```bash
cp .env.production .env
```

#### Docker/Container Deployment

```bash
cp .env.docker .env
```

#### Integration Testing with Mock Collector

```bash
cp .env.test-otlp .env
```

Or create your own based on `env.example` which includes all available configuration options.

### 3. Run the Application

#### Option A: Traditional NestJS Module Pattern

```bash
# Development mode with hot reload
pnpm run start:dev

# Production mode
pnpm run build
pnpm run start:prod
```

#### Option B: Register Pattern (Recommended)

```bash
# Build first
pnpm run build

# Start with register module for automatic OpenTelemetry initialization
node -r @paystackhq/nestjs-observability/register dist/src/main.js
```

The register pattern provides:

- Automatic OpenTelemetry SDK initialization
- Environment variable-driven configuration
- Auto-instrumentation out of the box
- No code changes required

### 4. Test the Endpoints

#### Automated Testing

Run the included test script to hit all endpoints:

```bash
node test-endpoints.js
```

#### Manual Testing

The app runs on `http://localhost:3000` with these endpoints:

**Basic Endpoints:**

- `GET /` - Hello world
- `GET /status` - Service status
- `GET /complex` - Complex operation demonstration

**User Management:**

- `POST /users` - Create user
- `GET /users/:id` - Get user by ID
- `GET /users/:id/profile` - Get user profile
- `POST /users/validate` - Validate user data
- `GET /users/:id/advanced-profile` - Complex nested operations

**Payment Processing:**

- `POST /payments` - Process payment
- `GET /payments/:id/validate` - Validate payment
- `GET /payments/:id/status` - Get payment status
- `POST /payments/:id/refund` - Refund payment
- `POST /payments/sensitive` - **Sensitive data demo** (shows argument sanitization)

**Logging Demonstrations:**

- `POST /logs/info` - Info logging
- `POST /logs/error` - Error logging
- `POST /logs/user-action` - User action tracking
- `POST /logs/performance` - Performance metrics
- `POST /logs/business-event` - Business event logging
- `POST /logs/security-event` - Security event logging
- `POST /logs/exception` - Exception handling

**Context Management:**

- `GET /logs/demo/context-persistence` - Context persistence demo
- `GET /logs/demo/context-updates` - Context updates demo
- `GET /logs/demo/comprehensive` - Full transaction flow

**Error Testing:**

- `GET /error-test` - Error handling demonstration

## 🔧 Configuration Options

### OpenTelemetry Standard Environment Variables (Recommended)

The register pattern uses standard OpenTelemetry environment variables for configuration:

#### Service Identification

```env
OTEL_SERVICE_NAME=basic-example
OTEL_SERVICE_VERSION=1.0.0
OTEL_RESOURCE_ATTRIBUTES=service.name=basic-example,service.version=1.0.0,deployment.environment=production
```

#### Exporter Configuration

```env
# Choose exporters: console, otlp, jaeger, zipkin
OTEL_TRACES_EXPORTER=console
OTEL_METRICS_EXPORTER=console
OTEL_LOGS_EXPORTER=none
```

#### OTLP Endpoints

```env
# General endpoint (used by all signals if specific endpoints not set)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Signal-specific endpoints (override general endpoint)
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://localhost:4318/v1/logs
```

#### OTLP Authentication

```env
# General headers (used by all signals if specific headers not set)
OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer your-token,x-custom-header=value

# Signal-specific headers (override general headers)
OTEL_EXPORTER_OTLP_TRACES_HEADERS=x-trace-header=trace-value
OTEL_EXPORTER_OTLP_METRICS_HEADERS=x-metrics-header=metrics-value
OTEL_EXPORTER_OTLP_LOGS_HEADERS=x-logs-header=logs-value
```

#### Sampling Configuration

```env
# Sample all traces
OTEL_TRACES_SAMPLER=always_on

# Sample 10% of traces
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

#### Export Intervals

```env
# Metrics export interval in milliseconds
OTEL_METRIC_EXPORT_INTERVAL=10000
```

## 🎯 Testing Different Scenarios

### 1. **Argument Sanitization Testing**

```bash
# Test sensitive data redaction
curl -X POST http://localhost:3000/payments/sensitive \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "4111111111111111",
    "cvv": "123",
    "apiKey": "secret-key-123",
    "password": "mypassword"
  }'
```

Check the logs to see sensitive data is redacted as `[REDACTED]`.

### 2. **Nested Service Calls**

```bash
# Test complex nested operations
curl http://localhost:3000/users/1/advanced-profile
```

This endpoint demonstrates:

- Controller -> Service -> Nested Service calls
- Proper parent-child trace relationships
- Argument passing and sanitization

### 3. **Error Handling**

```bash
# Test error tracing
curl http://localhost:3000/error-test
```

Shows how errors are captured in traces and logs.

### 4. **Performance Monitoring**

```bash
# Generate multiple requests to see metrics
for i in {1..10}; do
  curl http://localhost:3000/complex
done

# Check metrics
curl http://localhost:3000/metrics
```

## 📊 Observability Stack Setup

### Local Development with Docker Compose

For complete observability testing, set up the full stack:

```yaml
version: '3.8'
services:
  # OpenTelemetry Collector
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ['--config=/etc/otelcol-contrib/config.yaml']
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - '4317:4317' # OTLP gRPC receiver
      - '4318:4318' # OTLP HTTP receiver
      - '8888:8888' # Prometheus metrics
      - '8889:8889' # Prometheus exporter metrics

  # Jaeger for traces
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - '16686:16686'
      - '14250:14250'
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  # Prometheus for metrics
  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

### Viewing Observability Data

1. **Traces**: Visit http://localhost:16686 (Jaeger UI)
2. **Metrics**: Visit http://localhost:9090 (Prometheus UI)
3. **Application Metrics**: Visit http://localhost:3000/metrics
4. **Logs**: Check console output (pretty-printed in development)

## 🔍 What to Look For

### In the Logs

- **Structured JSON** (when NODE_ENV != 'development')
- **Context persistence** across service calls
- **Argument sanitization** in sensitive endpoints
- **Performance metrics** and timing information
- **Error context** with stack traces and metadata

### In the Traces

- **HTTP request spans** with method, URL, status code
- **Service method spans** with arguments and return values
- **Nested service calls** with proper parent-child relationships
- **Database/external service calls** (if any)
- **Error spans** with exception details

### In the Metrics

- **HTTP request metrics**: duration, count, status codes
- **System metrics**: memory usage, CPU, garbage collection
- **Custom business metrics**: user actions, payment processing
- **OpenTelemetry metrics**: trace export statistics

## 🛠️ Development Commands

```bash
# Start development server
pnpm run start:dev

# Build for production
pnpm run build

# Run tests
pnpm run test

# Run tests with coverage
pnpm run test:cov

# Lint code
pnpm run lint

# Format code
pnpm run format
```

## 🎨 Customization

### Adding Custom Metrics

```typescript
// In your service
constructor(private readonly metricsService: MetricsService) {
  this.customCounter = this.metricsService.createCounter({
    name: 'custom_operations_total',
    help: 'Total custom operations',
    labelNames: ['type', 'status']
  });
}

someMethod() {
  this.customCounter.inc({ type: 'user_action', status: 'success' });
}
```

### Adding Custom Tracing

```typescript
// Use individual method tracing
@Trace()
async customMethod() {
  // This method will be traced
}

// Or trace entire class
@TraceClass()
class MyService {
  // All public methods will be traced
}
```

### Custom Logging Context

```typescript
// In your service
constructor(private readonly logger: LoggerService) {}

someMethod() {
  this.logger.setContext('userId', '123');
  this.logger.setContext('operation', 'user_creation');
  this.logger.info('User created successfully');
}
```

## 📝 Notes

- The example uses the `@TraceClass()` decorator for services to demonstrate automatic tracing
- Controllers are automatically traced by the `AutoTraceInterceptor`
- All configuration is environment-variable driven for easy deployment
- The `/payments/sensitive` endpoint specifically demonstrates argument sanitization
- Log structured output varies by environment (pretty in development, JSON in production)

## 🔗 Related Documentation

- [Auto-Tracing Documentation](../../docs/autotracing-v2.md)
- [Main Library README](../../README.md)
- [Configuration Guide](../../docs/configuration.md)
