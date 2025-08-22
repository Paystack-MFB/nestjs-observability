# OpenTelemetry Compatibility Guide

This guide covers OpenTelemetry version compatibility, environment variable support, exporter configurations, and integration guides for popular observability platforms.

## 📋 Compatibility Matrix

### OpenTelemetry Versions

| Component | Version | Status | Notes |
|-----------|---------|--------|-------|
| `@opentelemetry/api` | `^1.7.0` | ✅ Supported | Core API for manual instrumentation |
| `@opentelemetry/sdk-node` | `^0.203.0` | ✅ Supported | Main SDK with auto-instrumentation |
| `@opentelemetry/auto-instrumentations-node` | `^0.203.0` | ✅ Supported | Auto-instrumentation packages |
| `@opentelemetry/exporter-otlp-http` | `^0.203.0` | ✅ Supported | OTLP HTTP exporter |
| `@opentelemetry/exporter-console` | `^0.203.0` | ✅ Supported | Console exporter |
| `@opentelemetry/exporter-jaeger` | `^1.17.0` | ✅ Supported | Jaeger exporter |
| `@opentelemetry/exporter-zipkin` | `^1.17.0` | ✅ Supported | Zipkin exporter |

### Node.js Versions

| Node.js Version | Status | Notes |
|----------------|--------|-------|
| Node.js 18.x | ✅ Fully Supported | Recommended LTS |
| Node.js 20.x | ✅ Fully Supported | Latest LTS |
| Node.js 22.x | ✅ Fully Supported | Current |
| Node.js 16.x | ⚠️ Limited Support | End of life - upgrade recommended |
| Node.js 14.x | ❌ Not Supported | End of life |

### NestJS Versions

| NestJS Version | Status | Notes |
|---------------|--------|-------|
| NestJS 10.x | ✅ Fully Supported | Latest version |
| NestJS 9.x | ✅ Fully Supported | Previous LTS |
| NestJS 8.x | ⚠️ Limited Support | Consider upgrading |
| NestJS 7.x | ❌ Not Supported | Too old |

## 🌍 Environment Variables Compatibility

### OpenTelemetry Standard Variables

All standard OpenTelemetry environment variables are supported:

| Variable | Spec Version | Status | Default Value |
|----------|-------------|--------|---------------|
| `OTEL_SERVICE_NAME` | 1.24.0+ | ✅ Full Support | `"nestjs-app"` |
| `OTEL_SERVICE_VERSION` | 1.24.0+ | ✅ Full Support | `"1.0.0"` |
| `OTEL_RESOURCE_ATTRIBUTES` | 1.24.0+ | ✅ Full Support | Service detection |
| `OTEL_TRACES_EXPORTER` | 1.24.0+ | ✅ Full Support | `"console"` |
| `OTEL_METRICS_EXPORTER` | 1.24.0+ | ✅ Full Support | `"console"` |
| `OTEL_LOGS_EXPORTER` | 1.24.0+ | ✅ Full Support | `"console"` |
| `OTEL_TRACES_SAMPLER` | 1.24.0+ | ✅ Full Support | `"always_on"` |
| `OTEL_TRACES_SAMPLER_ARG` | 1.24.0+ | ✅ Full Support | N/A |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | 1.24.0+ | ✅ Full Support | N/A |
| `OTEL_EXPORTER_OTLP_HEADERS` | 1.24.0+ | ✅ Full Support | N/A |
| `OTEL_EXPORTER_OTLP_TIMEOUT` | 1.24.0+ | ✅ Full Support | `"10000"` |
| `OTEL_LOG_LEVEL` | 1.24.0+ | ✅ Full Support | `"info"` |

### Library-Specific Variables

Additional variables provided by this package:

| Variable | Purpose | Default | Example |
|----------|---------|---------|---------|
| `OTEL_METRICS_ENABLED` | Enable/disable metrics collection | `"true"` | `"false"` |
| `OTEL_METRICS_ENDPOINT` | Custom metrics endpoint path | `"/metrics"` | `"/api/metrics"` |
| `OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED` | PII sanitization | `"true"` | `"false"` |

## 🔧 Exporter Configurations

### Console Exporters

**Use Case:** Development, debugging, local testing

```bash
# Console configuration
export OTEL_TRACES_EXPORTER="console"
export OTEL_METRICS_EXPORTER="console"
export OTEL_LOGS_EXPORTER="console"
```

**Compatibility:**
- ✅ All platforms
- ✅ All environments
- ✅ Human-readable output

### OTLP Exporters

**Use Case:** Production, cloud platforms, observability vendors

```bash
# OTLP configuration
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_LOGS_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.platform.com"
export OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer token"
```

**Compatibility:**
- ✅ OTLP 1.0.0 specification
- ✅ HTTP/protobuf format
- ✅ All major observability platforms

### Jaeger Exporter

**Use Case:** Jaeger deployments, distributed tracing

```bash
# Jaeger configuration
export OTEL_TRACES_EXPORTER="jaeger"
export OTEL_EXPORTER_JAEGER_ENDPOINT="http://jaeger:14268/api/traces"
```

**Compatibility:**
- ✅ Jaeger 1.35+
- ✅ HTTP/JSON format
- ⚠️ Traces only (no metrics/logs)

### Zipkin Exporter

**Use Case:** Zipkin deployments, existing Zipkin infrastructure

```bash
# Zipkin configuration
export OTEL_TRACES_EXPORTER="zipkin"
export OTEL_EXPORTER_ZIPKIN_ENDPOINT="http://zipkin:9411/api/v2/spans"
```

**Compatibility:**
- ✅ Zipkin 2.0+
- ✅ JSON format
- ⚠️ Traces only (no metrics/logs)

## 🏢 Platform Integration Guides

### Honeycomb

**Configuration:**
```bash
export OTEL_SERVICE_NAME="my-app"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.honeycomb.io"
export OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=YOUR_API_KEY,x-honeycomb-dataset=YOUR_DATASET"
```

**Features Supported:**
- ✅ Distributed tracing
- ✅ Custom metrics
- ✅ Logs (via OTLP)
- ✅ Service maps
- ✅ Query interface

**Best Practices:**
- Use dataset names for environment separation
- Enable sampling for cost control: `OTEL_TRACES_SAMPLER_ARG="0.1"`
- Add environment attributes: `OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production"`

### Datadog

**Configuration:**
```bash
export OTEL_SERVICE_NAME="my-app"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.datadoghq.com"
export OTEL_EXPORTER_OTLP_HEADERS="dd-api-key=YOUR_API_KEY"
```

**Features Supported:**
- ✅ APM tracing
- ✅ Custom metrics
- ✅ Logs correlation
- ✅ Service topology
- ✅ Real User Monitoring

**Best Practices:**
- Set `service.env` tag: `OTEL_RESOURCE_ATTRIBUTES="service.env=production"`
- Use unified service tagging
- Configure retention settings in Datadog UI

### New Relic

**Configuration:**
```bash
export OTEL_SERVICE_NAME="my-app"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp.nr-data.net:4317"
export OTEL_EXPORTER_OTLP_HEADERS="api-key=YOUR_LICENSE_KEY"
```

**Features Supported:**
- ✅ Distributed tracing
- ✅ Custom metrics
- ✅ Infrastructure monitoring
- ✅ Error tracking
- ✅ Alerting

**Best Practices:**
- Use descriptive service names
- Configure alerts for error rates and latency
- Set up dashboards for business metrics

### Grafana Cloud (Tempo + Prometheus)

**Configuration:**
```bash
export OTEL_SERVICE_NAME="my-app"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"

# Tempo for traces
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="https://tempo-api.grafana.net/otlp"
export OTEL_EXPORTER_OTLP_TRACES_HEADERS="authorization=Basic YOUR_BASE64_CREDENTIALS"

# Prometheus for metrics
export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT="https://prometheus-api.grafana.net/otlp"
export OTEL_EXPORTER_OTLP_METRICS_HEADERS="authorization=Basic YOUR_BASE64_CREDENTIALS"
```

**Features Supported:**
- ✅ Distributed tracing (Tempo)
- ✅ Metrics collection (Prometheus)
- ✅ Grafana dashboards
- ✅ Alerting (Grafana)

### AWS X-Ray and CloudWatch

**Configuration:**
```bash
export OTEL_SERVICE_NAME="my-app"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://cloudwatch-agent.amazonaws.com"

# AWS credentials through IAM role or environment
export AWS_REGION="us-east-1"
```

**Features Supported:**
- ✅ X-Ray tracing
- ✅ CloudWatch metrics
- ✅ CloudWatch logs
- ✅ Service maps
- ✅ AWS integrations

### Self-Hosted Solutions

#### Jaeger + Prometheus

```bash
# Jaeger for tracing
export OTEL_TRACES_EXPORTER="jaeger"
export OTEL_EXPORTER_JAEGER_ENDPOINT="http://jaeger:14268/api/traces"

# Prometheus metrics via /metrics endpoint
export OTEL_METRICS_EXPORTER="prometheus"
export OTEL_METRICS_ENDPOINT="/metrics"
```

#### OpenTelemetry Collector

```bash
# Send everything to OTel Collector
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_LOGS_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
```

## 🔄 Sampling Strategies

### Always On (Development)

```bash
export OTEL_TRACES_SAMPLER="always_on"
```

**Use Case:** Development, debugging, testing
**Impact:** 100% of traces collected

### Trace ID Ratio (Production)

```bash
export OTEL_TRACES_SAMPLER="traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.1"  # 10% sampling
```

**Use Case:** Production with moderate traffic
**Impact:** Consistent percentage sampling

### Parent-Based (Microservices)

```bash
export OTEL_TRACES_SAMPLER="parentbased_traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.05"  # 5% sampling
```

**Use Case:** Microservice architectures
**Impact:** Maintains sampling decisions across services

## 🐳 Container and Orchestration Support

### Docker

```dockerfile
FROM node:18
ENV OTEL_SERVICE_NAME="my-app"
ENV OTEL_SERVICE_VERSION="1.0.0"
# ... other environment variables
CMD ["node", "-r", "@paystackhq/nestjs-observability/register", "dist/main.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: OTEL_SERVICE_NAME
          value: "my-app"
        - name: OTEL_RESOURCE_ATTRIBUTES
          value: "k8s.namespace.name=$(NAMESPACE),k8s.pod.name=$(POD_NAME)"
        - name: NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      - OTEL_SERVICE_NAME=my-app
      - OTEL_TRACES_EXPORTER=otlp
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "4318:4318"
```

## 🔐 Security Considerations

### Authentication Methods

**Bearer Token:**
```bash
export OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer YOUR_TOKEN"
```

**API Key:**
```bash
export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=YOUR_API_KEY"
```

**Basic Auth:**
```bash
# Base64 encode username:password
export OTEL_EXPORTER_OTLP_HEADERS="authorization=Basic $(echo -n 'user:pass' | base64)"
```

### TLS Configuration

**Custom CA Certificate:**
```bash
export OTEL_EXPORTER_OTLP_CERTIFICATE=/path/to/ca.crt
```

**Insecure (Development Only):**
```bash
export OTEL_EXPORTER_OTLP_INSECURE="true"
```

### Data Sanitization

```bash
# Enable PII sanitization
export OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED="true"

# Use @NoTrace decorator for sensitive operations
```

## 📊 Performance Guidelines

### Memory Management

| Configuration | Memory Impact | Recommendation |
|--------------|---------------|----------------|
| `always_on` sampling | High | Development only |
| `traceidratio` 1% | Low | Production recommended |
| Console exporters | Medium | Development only |
| OTLP exporters | Low | Production recommended |

### Network Optimization

```bash
# Batch size optimization
export OTEL_BSP_MAX_EXPORT_BATCH_SIZE="512"
export OTEL_BSP_EXPORT_TIMEOUT="30000"

# Connection pooling
export OTEL_EXPORTER_OTLP_TIMEOUT="30000"
```

### Resource Limits

```yaml
# Kubernetes resource limits
resources:
  limits:
    memory: "512Mi"
    cpu: "500m"
  requests:
    memory: "256Mi"
    cpu: "250m"
```

## 🧪 Testing Configurations

### Unit Tests

```typescript
// Mock OpenTelemetry in tests
jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: () => ({
      startSpan: jest.fn(),
    }),
  },
}));
```

### Integration Tests

```bash
# Test with console exporters
export OTEL_TRACES_EXPORTER="console"
export OTEL_METRICS_EXPORTER="console"
npm test
```

### Load Testing

```bash
# Minimal observability for load tests
export OTEL_TRACES_SAMPLER="traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.001"  # 0.1% sampling
```

## 🔄 Migration Compatibility

### From v0.x

- ✅ Service injection patterns remain the same
- ✅ Decorator usage unchanged (`@Trace`, `@TraceClass`, `@NoTrace`)
- ❌ Configuration objects no longer supported
- ❌ Custom environment variables deprecated

### From Other Libraries

| Library | Migration Path | Compatibility |
|---------|---------------|---------------|
| `nestjs-opentelemetry` | Replace imports, update config | ⚠️ Manual |
| `@nestjs/terminus` | Compatible for health checks | ✅ Compatible |
| `winston` | LoggerService replaces winston | ⚠️ Manual |

## 📅 Version Support Policy

### Release Schedule

- **Major versions:** Annual (breaking changes)
- **Minor versions:** Quarterly (new features)
- **Patch versions:** Monthly (bug fixes)

### Support Timeline

- **Current major:** Full support
- **Previous major:** Security fixes for 12 months
- **Older versions:** Community support only

### Deprecation Policy

- **6 months notice** for breaking changes
- **Migration guides** provided for major updates
- **Automated migration tools** when possible
