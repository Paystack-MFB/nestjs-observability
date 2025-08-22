# Environment Variables Reference

This document provides a comprehensive guide to all supported OpenTelemetry environment variables and library-specific variables for enhanced features.

## Table of Contents

- [Overview](#overview)
- [Core OpenTelemetry Variables](#core-opentelemetry-variables)
- [Service Configuration](#service-configuration)
- [Exporter Configuration](#exporter-configuration)
- [Sampling Configuration](#sampling-configuration)
- [Resource Attributes](#resource-attributes)
- [Library-Specific Variables](#library-specific-variables)
- [Examples by Environment](#examples-by-environment)
- [Precedence Rules](#precedence-rules)
- [Troubleshooting](#troubleshooting)

## Overview

The OpenTelemetry NestJS Observability Package uses environment variables for configuration following OpenTelemetry standards. This approach eliminates complex configuration objects and provides a standard way to configure observability across different environments.

### Configuration Hierarchy

1. **OpenTelemetry Standard Variables** - Core OTEL_* variables defined by the OpenTelemetry specification
2. **Library-Specific Variables** - Enhanced features specific to this NestJS package
3. **Default Values** - Safe defaults when no environment variables are provided

## Core OpenTelemetry Variables

### Service Identification

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `OTEL_SERVICE_NAME` | Name of the service | `unknown-service` | `user-api` |
| `OTEL_SERVICE_VERSION` | Version of the service | `1.0.0` | `2.1.5` |
| `NODE_ENV` | Application environment | `development` | `production` |

**Example:**
```bash
export OTEL_SERVICE_NAME="payment-service"
export OTEL_SERVICE_VERSION="1.2.3"
export NODE_ENV="production"
```

### SDK Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `OTEL_SDK_DISABLED` | Disable the entire SDK | `false` | `true` |
| `OTEL_RESOURCE_ATTRIBUTES` | Key-value pairs for resource attributes | - | `service.namespace=backend,deployment.environment=staging` |

## Service Configuration

### Application Settings

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | Application port | `3000` | `8080` |
| `HOST` | Application host | `0.0.0.0` | `localhost` |

## Exporter Configuration

### Traces Exporters

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `OTEL_TRACES_EXPORTER` | Trace exporter type | `console` | `console`, `otlp`, `jaeger`, `zipkin`, `none` |

#### OTLP Trace Exporter

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint for all signals | - | `http://localhost:4317` |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | OTLP endpoint for traces only | - | `http://jaeger:14268/api/traces` |
| `OTEL_EXPORTER_OTLP_HEADERS` | Headers for all OTLP requests | - | `api-key=secret123` |
| `OTEL_EXPORTER_OTLP_TRACES_HEADERS` | Headers for trace requests only | - | `authorization=Bearer token123` |
| `OTEL_EXPORTER_OTLP_TIMEOUT` | Request timeout in milliseconds | `10000` | `30000` |

#### Jaeger Exporter

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `OTEL_EXPORTER_JAEGER_ENDPOINT` | Jaeger collector endpoint | - | `http://jaeger:14268/api/traces` |
| `OTEL_EXPORTER_JAEGER_USER` | Username for authentication | - | `admin` |
| `OTEL_EXPORTER_JAEGER_PASSWORD` | Password for authentication | - | `password123` |

### Metrics Exporters

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `OTEL_METRICS_EXPORTER` | Metrics exporter type | `console` | `console`, `otlp`, `prometheus`, `none` |

#### OTLP Metrics Exporter

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | OTLP endpoint for metrics only | - | `http://localhost:4317/v1/metrics` |
| `OTEL_EXPORTER_OTLP_METRICS_HEADERS` | Headers for metrics requests only | - | `x-api-key=metrics123` |
| `OTEL_METRICS_EXPORT_INTERVAL` | Metrics export interval in milliseconds | `60000` | `30000` |
| `OTEL_METRICS_EXPORT_TIMEOUT` | Metrics export timeout in milliseconds | `30000` | `10000` |

#### Prometheus Metrics

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `OTEL_EXPORTER_PROMETHEUS_HOST` | Prometheus server host | `localhost` | `0.0.0.0` |
| `OTEL_EXPORTER_PROMETHEUS_PORT` | Prometheus server port | `9464` | `9090` |

### Logs Exporters

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `OTEL_LOGS_EXPORTER` | Logs exporter type | `console` | `console`, `otlp`, `none` |

#### OTLP Logs Exporter

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | OTLP endpoint for logs only | - | `http://localhost:4317/v1/logs` |
| `OTEL_EXPORTER_OTLP_LOGS_HEADERS` | Headers for logs requests only | - | `x-log-key=logs123` |

## Sampling Configuration

### Trace Sampling

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `OTEL_TRACES_SAMPLER` | Trace sampling strategy | `always_on` | `always_off`, `always_on`, `traceidratio`, `parentbased_always_off`, `parentbased_always_on`, `parentbased_traceidratio` |
| `OTEL_TRACES_SAMPLER_ARG` | Argument for the sampler | - | `0.1` (for ratio-based sampling) |

**Examples:**
```bash
# Sample 10% of traces
export OTEL_TRACES_SAMPLER="traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.1"

# Always sample (development)
export OTEL_TRACES_SAMPLER="always_on"

# Never sample (disable tracing)
export OTEL_TRACES_SAMPLER="always_off"
```

## Resource Attributes

Resource attributes provide metadata about your service and environment. They can be set using the `OTEL_RESOURCE_ATTRIBUTES` environment variable as comma-separated key-value pairs.

### Standard Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| `service.name` | Service name (overrides OTEL_SERVICE_NAME) | `user-service` |
| `service.version` | Service version (overrides OTEL_SERVICE_VERSION) | `1.2.3` |
| `service.namespace` | Service namespace | `backend` |
| `service.instance.id` | Unique service instance identifier | `instance-123` |
| `deployment.environment` | Deployment environment | `production` |
| `cloud.provider` | Cloud provider | `aws` |
| `cloud.region` | Cloud region | `us-east-1` |
| `k8s.namespace.name` | Kubernetes namespace | `default` |
| `k8s.pod.name` | Kubernetes pod name | `user-service-abc123` |

**Example:**
```bash
export OTEL_RESOURCE_ATTRIBUTES="service.namespace=backend,deployment.environment=staging,cloud.provider=aws,cloud.region=us-west-2"
```

## Library-Specific Variables

These variables control enhanced features specific to this NestJS observability package.

### Enhanced Features

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `OTEL_METRICS_ENABLED` | Enable/disable metrics endpoints | `true` | `true`, `false` |
| `OTEL_METRICS_ENDPOINT` | Custom metrics endpoint path | `/metrics` | `/custom-metrics` |
| `OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED` | Enable span attribute sanitization | `true` | `true`, `false` |
| `OTEL_SPAN_ATTRIBUTE_REDACTED_PLACEHOLDER` | Placeholder for redacted values | `[REDACTED]` | `[HIDDEN]` |

### Performance Tuning

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `OTEL_BSP_MAX_QUEUE_SIZE` | Batch span processor queue size | `2048` | `4096` |
| `OTEL_BSP_MAX_EXPORT_BATCH_SIZE` | Maximum batch export size | `512` | `1024` |
| `OTEL_BSP_EXPORT_TIMEOUT` | Export timeout in milliseconds | `30000` | `60000` |
| `OTEL_BSP_SCHEDULE_DELAY` | Batch schedule delay in milliseconds | `5000` | `10000` |

## Examples by Environment

### Development Environment

**File: `.env.development`**
```bash
# Service identification
OTEL_SERVICE_NAME=nestjs-app-dev
OTEL_SERVICE_VERSION=1.0.0-dev
NODE_ENV=development

# Use console exporters for local development
OTEL_TRACES_EXPORTER=console
OTEL_METRICS_EXPORTER=console
OTEL_LOGS_EXPORTER=console

# Always sample for development
OTEL_TRACES_SAMPLER=always_on

# Enable all features
OTEL_METRICS_ENABLED=true
OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED=false

# Development resource attributes
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=development,service.namespace=local
```

### Production Environment

**File: `.env.production`**
```bash
# Service identification
OTEL_SERVICE_NAME=nestjs-app
OTEL_SERVICE_VERSION=1.2.3
NODE_ENV=production

# Use OTLP exporters for production
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp

# Production OTLP configuration
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=your-api-key

# Sample 10% of traces for cost efficiency
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1

# Production security
OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED=true
OTEL_METRICS_ENABLED=true

# Production resource attributes
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production,service.namespace=backend,cloud.provider=aws,cloud.region=us-east-1
```

### Staging Environment

**File: `.env.staging`**
```bash
# Service identification
OTEL_SERVICE_NAME=nestjs-app-staging
OTEL_SERVICE_VERSION=1.2.3-rc1
NODE_ENV=staging

# Use OTLP exporters
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp

# Staging OTLP configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://jaeger:4317/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://prometheus:4317/v1/metrics

# Sample 50% of traces for testing
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.5

# Staging resource attributes
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=staging,service.namespace=backend,k8s.namespace.name=staging
```

### Docker Environment

**File: `docker.env`**
```bash
# Service identification
OTEL_SERVICE_NAME=nestjs-app
OTEL_SERVICE_VERSION=latest
NODE_ENV=production

# Docker-specific OTLP configuration
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317

# Performance tuning for containers
OTEL_BSP_MAX_QUEUE_SIZE=1024
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=256
OTEL_BSP_EXPORT_TIMEOUT=15000

# Container resource attributes
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=docker,container.runtime=docker
```

## Kubernetes Configuration Examples

### ConfigMap Example

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-config
  namespace: default
data:
  OTEL_SERVICE_NAME: "nestjs-app"
  OTEL_SERVICE_VERSION: "1.2.3"
  NODE_ENV: "production"
  OTEL_TRACES_EXPORTER: "otlp"
  OTEL_METRICS_EXPORTER: "otlp"
  OTEL_LOGS_EXPORTER: "otlp"
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector.observability:4317"
  OTEL_TRACES_SAMPLER: "traceidratio"
  OTEL_TRACES_SAMPLER_ARG: "0.1"
  OTEL_RESOURCE_ATTRIBUTES: "deployment.environment=production,service.namespace=backend,k8s.cluster.name=prod-cluster"
```

### Secret Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: otel-secrets
  namespace: default
type: Opaque
data:
  OTEL_EXPORTER_OTLP_HEADERS: base64-encoded-headers
stringData:
  OTEL_EXPORTER_OTLP_HEADERS: "authorization=Bearer your-api-token"
```

### Deployment Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nestjs-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: nestjs-app:latest
        envFrom:
        - configMapRef:
            name: otel-config
        - secretRef:
            name: otel-secrets
        env:
        - name: OTEL_RESOURCE_ATTRIBUTES
          value: "k8s.pod.name=$(HOSTNAME),k8s.namespace.name=$(NAMESPACE)"
        - name: NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
```

## Docker Compose Examples

### Development Stack

```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      - OTEL_SERVICE_NAME=nestjs-app-dev
      - OTEL_SERVICE_VERSION=dev
      - NODE_ENV=development
      - OTEL_TRACES_EXPORTER=otlp
      - OTEL_METRICS_EXPORTER=otlp
      - OTEL_LOGS_EXPORTER=otlp
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
      - OTEL_TRACES_SAMPLER=always_on
    depends_on:
      - jaeger

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "4317:4317"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

### Production Stack

```yaml
version: '3.8'
services:
  app:
    image: nestjs-app:latest
    env_file:
      - .env.production
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
    depends_on:
      - otel-collector

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
```

## Observability Platform Examples

### Datadog

```bash
# Datadog configuration
export OTEL_SERVICE_NAME="nestjs-app"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.datadoghq.com"
export OTEL_EXPORTER_OTLP_HEADERS="DD-API-KEY=your-datadog-api-key"
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production,service.version=1.2.3"
```

### New Relic

```bash
# New Relic configuration
export OTEL_SERVICE_NAME="nestjs-app"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp.nr-data.net:4317"
export OTEL_EXPORTER_OTLP_HEADERS="api-key=your-new-relic-license-key"
export OTEL_RESOURCE_ATTRIBUTES="service.instance.id=$(hostname)"
```

### Honeycomb

```bash
# Honeycomb configuration
export OTEL_SERVICE_NAME="nestjs-app"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.honeycomb.io"
export OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=your-api-key"
export OTEL_TRACES_SAMPLER="traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.1"
```

### Jaeger

```bash
# Jaeger configuration
export OTEL_SERVICE_NAME="nestjs-app"
export OTEL_TRACES_EXPORTER="jaeger"
export OTEL_EXPORTER_JAEGER_ENDPOINT="http://jaeger-collector:14268/api/traces"
export OTEL_METRICS_EXPORTER="prometheus"
export OTEL_EXPORTER_PROMETHEUS_PORT="9090"
```

## Precedence Rules

Understanding how environment variables are prioritized:

1. **Specific Signal Variables** take precedence over general ones
   - `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` overrides `OTEL_EXPORTER_OTLP_ENDPOINT`
   - `OTEL_EXPORTER_OTLP_TRACES_HEADERS` overrides `OTEL_EXPORTER_OTLP_HEADERS`

2. **Environment Variables** override default values

3. **OTEL_RESOURCE_ATTRIBUTES** can override individual service settings
   - `service.name` in resource attributes overrides `OTEL_SERVICE_NAME`
   - `service.version` in resource attributes overrides `OTEL_SERVICE_VERSION`

### Example Precedence

```bash
# These settings...
export OTEL_SERVICE_NAME="api-service"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://collector:4317"
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://jaeger:4317"
export OTEL_RESOURCE_ATTRIBUTES="service.name=override-service"

# Result in:
# - Service name: "override-service" (from resource attributes)
# - Traces endpoint: "http://jaeger:4317" (specific override)
# - Metrics endpoint: "http://collector:4317" (general fallback)
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Service Not Appearing in Observability Platform

**Problem:** Traces/metrics not appearing in your observability platform.

**Solutions:**
```bash
# Check service name is set
export OTEL_SERVICE_NAME="my-service"

# Verify exporter configuration
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://your-platform-endpoint"

# Check authentication
export OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer your-token"

# Enable debugging
export OTEL_LOG_LEVEL="debug"
```

#### 2. Too Many/Too Few Traces

**Problem:** Performance issues from too many traces or missing important traces.

**Solutions:**
```bash
# Reduce trace volume (sample 10%)
export OTEL_TRACES_SAMPLER="traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.1"

# Increase trace volume (sample 50%)
export OTEL_TRACES_SAMPLER_ARG="0.5"

# Always trace (development)
export OTEL_TRACES_SAMPLER="always_on"

# Never trace (disable)
export OTEL_TRACES_SAMPLER="always_off"
```

#### 3. Metrics Endpoint Not Working

**Problem:** `/metrics` endpoint returns 404 or 500 errors.

**Solutions:**
```bash
# Enable metrics endpoint
export OTEL_METRICS_ENABLED="true"

# Check custom endpoint path
export OTEL_METRICS_ENDPOINT="/metrics"

# Verify metrics exporter
export OTEL_METRICS_EXPORTER="prometheus"
```

#### 4. Sensitive Data in Traces

**Problem:** Passwords, tokens, or sensitive data appearing in trace attributes.

**Solutions:**
```bash
# Enable attribute sanitization
export OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED="true"

# Customize redacted placeholder
export OTEL_SPAN_ATTRIBUTE_REDACTED_PLACEHOLDER="[HIDDEN]"
```

#### 5. Performance Issues

**Problem:** High memory usage or export delays.

**Solutions:**
```bash
# Increase batch size for efficiency
export OTEL_BSP_MAX_EXPORT_BATCH_SIZE="1024"

# Reduce queue size for memory
export OTEL_BSP_MAX_QUEUE_SIZE="1024"

# Faster export schedule
export OTEL_BSP_SCHEDULE_DELAY="2000"

# Shorter export timeout
export OTEL_BSP_EXPORT_TIMEOUT="15000"
```

### Debug Mode

Enable debug logging to troubleshoot configuration issues:

```bash
export OTEL_LOG_LEVEL="debug"
export DEBUG="*"
```

### Validation Commands

Use these commands to validate your configuration:

```bash
# Check environment variables
env | grep OTEL

# Test with console exporter
export OTEL_TRACES_EXPORTER="console"
export OTEL_METRICS_EXPORTER="console"
export OTEL_LOGS_EXPORTER="console"

# Validate service startup
node -r @paystackhq/nestjs-observability/register dist/main.js
```

## Additional Resources

- [OpenTelemetry Environment Variable Specification](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/)
- [OpenTelemetry Resource Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/resource/)
- [OTLP Exporter Configuration](https://opentelemetry.io/docs/specs/otel/protocol/exporter/)
- [Sampling Configuration Guide](https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampling)

---

For more information about this package and advanced configuration options, see the main documentation and examples in the repository.
