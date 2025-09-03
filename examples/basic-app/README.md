# NestJS Observability Example Application

This example application demonstrates all features of the `@paystackhq/nestjs-observability` package using the modern register pattern and environment variable configuration.

## 🚀 Quick Start

### 1. Build the Package

From the root directory:

```bash
cd ../../
pnpm build
```

### 2. Build the Example App

```bash
pnpm build
```

### 3. Run with Register Pattern

```bash
# Development mode with console output
pnpm run demo:console

# Or manually with environment variables
OTEL_SERVICE_NAME=my-app OTEL_TRACES_EXPORTER=console node -r ../../dist/cjs/register.js dist/src/main.js
```

## 📋 Available Scripts

### Standard Scripts

- `pnpm build` - Build the application
- `pnpm start` - Start with register pattern
- `pnpm start:dev` - Development mode with hot reload
- `pnpm start:prod` - Production mode with register pattern

### Environment-Specific Scripts

- `pnpm run start:development` - Console exporters for local development
- `pnpm run start:staging` - OTLP exporters for staging
- `pnpm run start:docker` - Docker-optimized configuration

### Demo Scripts

- `pnpm run demo:console` - Console output demo
- `pnpm run demo:metrics` - Metrics endpoint demo

## 🌍 Environment Configuration

The application uses OpenTelemetry standard environment variables. We provide several pre-configured environment files for different deployment scenarios.

### Environment Files Available

- **`env.example`** - Base template with all available options
- **`env.production`** - Production-ready configuration with OTLP exporters
- **`env.staging`** - Staging configuration with moderate sampling
- **`env.test.otlp`** - Test configuration for OTLP integration testing
- **`env.docker`** - Docker/container deployment configuration

Copy the appropriate file to `.env` and adjust values as needed:

```bash
# For development
cp env.example .env

# For production
cp env.production .env

# For staging
cp env.staging .env

# For Docker deployment
cp env.docker .env
```

### Key Environment Variables

```bash
# Service identification
OTEL_SERVICE_NAME=my-nestjs-app
OTEL_SERVICE_VERSION=1.0.0
OTEL_SERVICE_ENV=development  # Observability environment (NEW in v1.0.0)
NODE_ENV=development          # Application environment
```

### Development Configuration

```bash
# Service identification
OTEL_SERVICE_NAME=my-nestjs-app
OTEL_SERVICE_VERSION=1.0.0
OTEL_SERVICE_ENV=development
NODE_ENV=development

# Console exporters for local development
OTEL_TRACES_EXPORTER=console
OTEL_METRICS_EXPORTER=console
OTEL_LOGS_EXPORTER=console

# Always sample for development
OTEL_TRACES_SAMPLER=always_on
```

### Production Configuration

```bash
# Service identification
OTEL_SERVICE_NAME=my-nestjs-app
OTEL_SERVICE_VERSION=1.2.3
OTEL_SERVICE_ENV=production
NODE_ENV=production

# OTLP exporters for production
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp

# Your observability platform
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=your-api-key

# Sample 10% for cost efficiency
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

## 🔍 API Endpoints

### Health and Status

- `GET /health` - Application health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /health/metrics` - Health metrics
- `GET /health/version` - Version information

### Observability Features

- `GET /metrics` - Prometheus metrics endpoint
- `GET /metrics/health` - Metrics system health
- `GET /metrics/names` - Available metric names

### Example Service Endpoints

These endpoints demonstrate all observability features:

#### Simple Operations

- `POST /example/simple` - Basic operation with logging and tracing
  ```bash
  curl -X POST http://localhost:3000/example/simple \
    -H "Content-Type: application/json" \
    -d '{"test": "data", "timestamp": "2025-01-01T00:00:00Z"}'
  ```

#### Complex Operations

- `POST /example/complex/:userId` - Complex operation with metrics and manual tracing
  ```bash
  curl -X POST http://localhost:3000/example/complex/user123 \
    -H "Content-Type: application/json" \
    -d '{"operation": "test", "complexity": "high"}'
  ```

#### Concurrent Operations

- `POST /example/concurrent` - Demonstrates context isolation
  ```bash
  curl -X POST http://localhost:3000/example/concurrent \
    -H "Content-Type: application/json" \
    -d '[{"id":1,"data":"test1"},{"id":2,"data":"test2"}]'
  ```

#### Sensitive Operations

- `POST /example/sensitive` - Demonstrates @NoTrace decorator
  ```bash
  curl -X POST http://localhost:3000/example/sensitive \
    -H "Content-Type: application/json" \
    -d '{"sensitive": "data", "password": "secret123"}'
  ```

#### Health Check

- `GET /example/health` - Example service health check

## 📊 Observability Features Demonstrated

### 1. Structured Logging

The application demonstrates structured logging with:

- **Context Isolation**: Each request maintains separate logging context
- **Child Loggers**: Operation-specific loggers with inherited context
- **Trace Correlation**: Automatic inclusion of trace IDs in logs
- **Data Sanitization**: Sensitive data redaction in logs

```typescript
// Example from ExampleService
const operationLogger = this.logger.createChildLogger();
operationLogger.setContext({
  operationId,
  userId,
  operation: 'complexOperation',
});

operationLogger.log('Starting complex operation', {
  userId,
  inputSize: JSON.stringify(data).length,
});
```

### 2. Custom Metrics

Business metrics are created and tracked:

- **Counters**: `example_requests_total` - Request counting by operation and status
- **Gauges**: `example_active_operations` - Currently active operations
- **Histograms**: `example_operation_duration_seconds` - Operation timing

```typescript
// Metrics creation
this.requestCounter = this.metrics.createCounter('example_requests_total', 'Total number of example requests', [
  'operation',
  'status',
]);

// Metrics usage
this.requestCounter.inc({ operation: 'complex', status: 'success' });
```

### 3. Distributed Tracing

Multiple tracing patterns are demonstrated:

- **@TraceClass**: Automatic tracing for entire service
- **@Trace**: Method-level tracing annotation
- **@NoTrace**: Exclude sensitive methods from tracing
- **Manual Spans**: Custom span creation with attributes

```typescript
@TraceClass('ExampleService')
@Injectable()
export class ExampleService {
  @Trace('simpleOperation')
  async simpleOperation(data: any): Promise<any> {
    // Automatically traced
  }

  @NoTrace()
  async sensitiveOperation(data: any): Promise<any> {
    // Not traced for security
  }
}
```

### 4. Enhanced Features

- **Attribute Sanitization**: Automatic redaction of sensitive data
- **Environment Control**: Full configuration via environment variables
- **Performance Tuning**: Configurable batch processing and export settings
- **Multiple Exporters**: Console, OTLP, Jaeger, Prometheus support

## 🧪 Testing

### Run Comprehensive Tests

```bash
# From root directory
./scripts/test-complete-example.sh
```

This test suite validates:

- Register pattern startup
- Environment variable configuration
- All observability features working together
- Context isolation with concurrent requests
- Custom metrics collection
- Tracing with decorators
- Sensitive data handling
- Performance characteristics

### Manual Testing

1. **Start the application**:

   ```bash
   pnpm run demo:console
   ```

2. **Test endpoints**:

   ```bash
   # Simple operation
   curl -X POST http://localhost:3000/example/simple \
     -H "Content-Type: application/json" \
     -d '{"test": "manual"}'

   # Check metrics
   curl http://localhost:3000/metrics

   # Check health
   curl http://localhost:3000/health
   ```

3. **Observe output**: Check console for structured logs and traces

## 🐳 Docker Usage

### Using Environment File

```bash
# Build the package and app
pnpm build

# Run with Docker environment
docker run -d \
  --env-file .env.docker \
  -p 3000:3000 \
  my-nestjs-app:latest \
  node -r @paystackhq/nestjs-observability/register dist/src/main.js
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  app:
    build: .
    env_file:
      - .env.production
    environment:
      - OTEL_SERVICE_NAME=my-app
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
    ports:
      - '3000:3000'
    command: node -r @paystackhq/nestjs-observability/register dist/src/main.js
    depends_on:
      - otel-collector

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    ports:
      - '4317:4317'
```

## ☁️ Platform Integration Examples

### Honeycomb

```bash
export OTEL_SERVICE_NAME="my-app"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.honeycomb.io"
export OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=your-api-key"
export OTEL_TRACES_SAMPLER="traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.1"

node -r ../../dist/cjs/register.js dist/src/main.js
```

### Datadog

```bash
export OTEL_SERVICE_NAME="my-app"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.datadoghq.com"
export OTEL_EXPORTER_OTLP_HEADERS="DD-API-KEY=your-datadog-key"

node -r ../../dist/cjs/register.js dist/src/main.js
```

### New Relic

```bash
export OTEL_SERVICE_NAME="my-app"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp.nr-data.net:4317"
export OTEL_EXPORTER_OTLP_HEADERS="api-key=your-license-key"

node -r ../../dist/cjs/register.js dist/src/main.js
```

## 🔧 Troubleshooting

### Common Issues

1. **Module not found error**:

   ```bash
   # Ensure package is built
   cd ../../ && pnpm build
   ```

2. **Metrics endpoint returns 404**:

   ```bash
   # Check metrics are enabled
   export OTEL_METRICS_ENABLED=true
   ```

3. **No traces visible**:

   ```bash
   # Ensure trace exporter is set
   export OTEL_TRACES_EXPORTER=console
   # Or for production
   export OTEL_TRACES_EXPORTER=otlp
   ```

4. **Performance issues**:
   ```bash
   # Reduce sampling
   export OTEL_TRACES_SAMPLER=traceidratio
   export OTEL_TRACES_SAMPLER_ARG=0.1
   ```

### Debug Mode

Enable debug logging:

```bash
export OTEL_LOG_LEVEL=debug
export DEBUG="*"
node -r ../../dist/cjs/register.js dist/src/main.js
```

## 📚 Architecture

This example demonstrates the modern OpenTelemetry architecture:

1. **Register Module**: `node -r register.js` initializes OpenTelemetry before application code
2. **Environment Variables**: All configuration via OTEL\_\* environment variables
3. **Global Providers**: Services use global OpenTelemetry providers
4. **No Configuration Objects**: Zero-config `ObservabilityModule.forRoot()`
5. **Enhanced Features**: Context isolation, custom metrics, tracing decorators

## 🎯 Production Checklist

Before deploying to production:

- [ ] Set `OTEL_SERVICE_NAME` and `OTEL_SERVICE_VERSION`
- [ ] Configure `OTEL_EXPORTER_OTLP_ENDPOINT` and headers
- [ ] Set appropriate sampling: `OTEL_TRACES_SAMPLER=traceidratio`
- [ ] Enable attribute sanitization: `OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED=true`
- [ ] Set production resource attributes in `OTEL_RESOURCE_ATTRIBUTES`
- [ ] Configure performance settings for your load
- [ ] Test with your observability platform
- [ ] Validate metrics are being collected
- [ ] Verify traces contain expected data
- [ ] Check logs include trace correlation

## 📖 Further Reading

- [Environment Variables Reference](../../docs/environment-variables.md)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Package Documentation](../../README.md)

---

This example application serves as a comprehensive reference for implementing observability in NestJS applications using modern OpenTelemetry patterns.
