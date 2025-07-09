# NestJS Observability - Basic Example App

This example application demonstrates the complete functionality of the `nestjs-observability` library, showcasing structured logging, metrics collection, and distributed tracing with automatic controller and service instrumentation.

## 🚀 Features Demonstrated

### 1. **Automatic Controller Tracing**

- All controller methods are automatically traced with HTTP context
- Request/response tracing with performance metrics
- Argument sanitization for sensitive data protection

### 2. **Service Method Tracing**

- `UserService` and `PaymentService` use `@TraceAllMethods()` decorator
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

Copy the example environment file:

```bash
cp env.example .env
```

The example includes all available configuration options:

- **Application**: service name, version, port
- **Logging**: level, OTLP export settings
- **Metrics**: Prometheus endpoint, labels
- **Tracing**: OpenTelemetry configuration
- **Argument Sanitization**: configurable data protection

### 3. Run the Application

```bash
# Development mode with hot reload
pnpm run start:dev

# Production mode
pnpm run build
pnpm run start:prod
```

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

### Environment Variables

#### Basic Configuration

```env
SERVICE_NAME=basic-example
SERVICE_VERSION=1.0.0
NODE_ENV=development
PORT=3000
```

#### Logging Configuration

```env
LOG_LEVEL=info
OTLP_LOGS_ENABLED=false
OTLP_LOGS_ENDPOINT=http://localhost:4318/v1/logs
```

#### Metrics Configuration

```env
METRICS_ENABLED=true
METRICS_ENDPOINT=/metrics
```

#### Tracing Configuration

```env
TRACING_ENABLED=true
OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
TRACING_SAMPLER_TYPE=always_on
TRACING_SAMPLER_RATIO=1.0
```

#### OpenTelemetry Auto-Instrumentations

```env
TRACING_AUTO_INSTRUMENTATIONS=true
TRACING_DISABLED_INSTRUMENTATIONS=@opentelemetry/instrumentation-fs
TRACING_INSTRUMENTATION_OVERRIDES={}
```

#### Argument Sanitization

```env
ARGUMENT_SANITIZATION_ENABLED=true
ARGUMENT_SANITIZATION_MAX_LENGTH=100
ARGUMENT_SANITIZATION_PLACEHOLDER=[REDACTED]
ARGUMENT_SANITIZATION_IDENTIFIER_FIELDS=id,userId,name,email,type,status
ARGUMENT_SANITIZATION_ADDITIONAL_PATTERNS=api[_-]?key,secret,token,password
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
@TraceAllMethods()
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

- The example uses the `@TraceAllMethods()` decorator for services to demonstrate automatic tracing
- Controllers are automatically traced by the `AutoTraceInterceptor`
- All configuration is environment-variable driven for easy deployment
- The `/payments/sensitive` endpoint specifically demonstrates argument sanitization
- Log structured output varies by environment (pretty in development, JSON in production)

## 🔗 Related Documentation

- [Auto-Tracing Documentation](../../docs/autotracing-v2.md)
- [Main Library README](../../README.md)
- [Configuration Guide](../../docs/configuration.md)
