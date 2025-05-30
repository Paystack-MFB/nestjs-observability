# Examples

This directory contains comprehensive examples showing how to use the `nestjs-observability` library in various scenarios.

## Quick Start

### 1. Basic Setup

- [basic-app/](./basic-app/) - Minimal NestJS application with observability
- [configuration/](./configuration/) - Different configuration patterns

### 2. Real-World Usage

- [e-commerce-api/](./e-commerce-api/) - Complete REST API with observability
- [microservice/](./microservice/) - Microservice with distributed tracing
- [grpc-service/](./grpc-service/) - gRPC service with observability

### 3. Advanced Features

- [custom-metrics/](./custom-metrics/) - Creating custom Prometheus metrics
- [structured-logging/](./structured-logging/) - Advanced logging patterns
- [tracing-correlation/](./tracing-correlation/) - Request correlation across services

### 4. Production Setups

- [docker-compose/](./docker-compose/) - Local development with monitoring stack
- [kubernetes/](./kubernetes/) - Kubernetes deployment with observability
- [production-config/](./production-config/) - Production-ready configurations

## Environment Variables

All examples support these environment variables:

```bash
# Service Configuration
SERVICE_NAME=example-service
SERVICE_VERSION=1.0.0
NODE_ENV=development

# Logging
LOG_LEVEL=info
STRUCTURED_LOGGING=false

# Metrics
METRICS_ENABLED=true
METRICS_ENDPOINT=/metrics

# Tracing
TRACING_ENABLED=true
OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTLP_HEADERS={}

# Example with external providers
# OTLP_TRACES_ENDPOINT=https://api.honeycomb.io/v1/traces
# OTLP_HEADERS={"x-honeycomb-team":"your-api-key"}
```

## Running Examples

Each example includes:

- `README.md` - Specific setup instructions
- `package.json` - Dependencies and scripts
- `docker-compose.yml` - Local monitoring stack (where applicable)
- `.env.example` - Environment variable template

### General Steps

1. **Navigate to example directory**:

   ```bash
   cd examples/basic-app
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Copy environment file**:

   ```bash
   cp .env.example .env
   ```

4. **Start monitoring stack** (if included):

   ```bash
   docker-compose up -d
   ```

5. **Run the application**:

   ```bash
   pnpm start:dev
   ```

6. **Test observability endpoints**:

   ```bash
   # Application health
   curl http://localhost:3000/health

   # Metrics endpoint
   curl http://localhost:3000/metrics

   # Generate some traffic
   curl http://localhost:3000/api/users
   ```

## Monitoring Stack

Some examples include a complete monitoring stack:

- **Prometheus** - Metrics collection and alerting
- **Grafana** - Metrics visualization and dashboards
- **Jaeger** - Distributed tracing visualization
- **OpenTelemetry Collector** - Telemetry data processing

Access the monitoring tools:

- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Jaeger**: http://localhost:16686

## Best Practices Demonstrated

### Logging

- Structured vs. pretty logging for different environments
- Adding context to log messages
- Creating child loggers for request scoping
- Error logging with proper stack traces

### Metrics

- Creating custom business metrics
- Using labels effectively
- Instrumenting critical code paths
- Avoiding high cardinality labels

### Tracing

- Setting up distributed tracing
- Adding custom spans for business operations
- Correlating logs with traces
- Propagating trace context across services

### Configuration

- Environment-specific configurations
- Secure handling of credentials
- Dynamic configuration with ConfigService
- Validation of configuration at startup

## Troubleshooting

### Common Issues

1. **OpenTelemetry not connecting**:

   - Check OTLP endpoint URL
   - Verify network connectivity
   - Check authentication headers

2. **Metrics not appearing**:

   - Verify `/metrics` endpoint is accessible
   - Check Prometheus configuration
   - Ensure metrics are being created

3. **Logs missing trace context**:
   - Ensure tracing is enabled
   - Verify OpenTelemetry initialization
   - Check for async context loss

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug
```

### Health Checks

Most examples include health check endpoints:

```bash
curl http://localhost:3000/health
```

## Contributing Examples

When adding new examples:

1. **Follow the structure**:

   - Include comprehensive README
   - Provide working docker-compose setup
   - Add .env.example with all variables

2. **Document the use case**:

   - Explain what the example demonstrates
   - Include setup and running instructions
   - Add troubleshooting section

3. **Test thoroughly**:

   - Verify all observability features work
   - Test in different environments
   - Ensure examples are self-contained

4. **Keep examples updated**:
   - Use latest library version
   - Update dependencies regularly
   - Maintain compatibility with monitoring tools
