# Ecosystem

This package provides observability capabilities for Paystack's NestJS backend services.

**Target Audience:**

- Built specifically for NestJS applications at Paystack
- Designed to work with the `nestjs-cookiecutter-template` repository
- Used across multiple backend services in production

**Observability Stack:**

- **Primary Platform:** DataDog for metrics, traces, and logs
- **Log Shipping:** FileBeat collects logs from containers
- **Standards:** OpenTelemetry Protocol (OTLP) for telemetry data
- **Integration:** DataDog agent runs as sidecar in Kubernetes pods

# Architecture Overview

## Core Design Principles

1. **Zero Configuration by Default**
    - All configuration is environment-driven via OpenTelemetry standard variables
    - No configuration objects needed in application code
    - Sensible defaults for all settings

2. **Register Pattern**
    - OpenTelemetry SDK initializes before application code via Node.js `-r` flag
    - Enables automatic instrumentation of HTTP, database, and external calls
    - Usage: `node -r @paystackhq/nestjs-observability/register dist/main.js`

3. **Environment Variable Configuration**
    - Follows OpenTelemetry specification for variable names (`OTEL_*`)
    - No custom configuration objects or modules
    - All behavior controlled via environment variables

## Key Components

### 1. ObservabilityModule

- Import with `ObservabilityModule.forRoot()` - no arguments needed
- Provides LoggerService, MetricsService, and TraceService globally
- Reads configuration from environment variables at runtime

### 2. LoggerService

- Structured logging with automatic trace correlation
- Context management (service-level, request-level)
- Child logger support for scoped operations
- JSON output in production, pretty-printed in development

### 3. MetricsService

- Prometheus-compatible metrics collection
- Counter, Gauge, Histogram support
- Automatic HTTP metrics via auto-instrumentation
- Exposed on `/metrics` endpoint

### 4. Tracing Decorators

- `@TraceClass()` - Auto-trace all methods in a class
- `@Trace('span-name')` - Trace specific method with custom name
- `@NoTrace()` - Exclude sensitive methods from tracing

## DataDog Integration at Paystack

Paystack uses **FileBeat** to collect logs and send them to DataDog. This is separate from traces/metrics.

### Log Collection (via FileBeat)

1. **Configure JSON Logging:**

   ```yaml
   loggingJsonEnabled: true # Helm values
   ```

2. **Use Console Exporter (default):**

   ```yaml
   # Don't set OTEL_LOGS_EXPORTER - it defaults to 'console'
   # OR explicitly set it:
   OTEL_LOGS_EXPORTER: console
   ```

3. **How it works:**
    - Application logs to stdout/stderr in JSON format
    - FileBeat reads logs from container stdout/stderr
    - FileBeat forwards structured JSON logs to DataDog
    - Logs appear in DataDog with proper structure and trace correlation

**Important:** Do NOT use `OTEL_LOGS_EXPORTER: otlp` for DataDog with FileBeat. Use `console` exporter so logs go to stdout where FileBeat can collect them.

### Traces and Metrics (Optional)

For traces and metrics, you can optionally enable the DataDog agent sidecar:

```yaml
datadogAgentEnabled: true # Optional, for traces/metrics only

# DataDog-specific variables
DD_TRACE_ENABLED: 'true'
DD_ENV: staging
DD_SERVICE: my-service
```

Note: `datadogAgentEnabled` is NOT required for logs - FileBeat handles logs independently.

# Documentation Structure

The package documentation is organized as follows:

- `README.md` - Quick start and feature overview
- `docs/first-steps.md` - Detailed setup guide with examples
- `docs/environment-variables.md` - Complete reference for all OTEL\_\* variables
- `docs/best-practices.md` - Production-ready patterns and anti-patterns
- `docs/troubleshooting.md` - Common issues and debugging steps
- `examples/basic-app/` - Working example application

**When helping users:** Always reference the appropriate documentation file rather than inventing new patterns.

# Common Tasks

## Helping with Configuration Issues

1. **Check Environment Variables First**
    - All behavior is controlled by `OTEL_*` environment variables
    - For logs with FileBeat: DO NOT set `OTEL_LOGS_EXPORTER` (defaults to `console`) or explicitly set it to `console`
    - For logs with FileBeat: MUST have `loggingJsonEnabled: true` in Helm values

2. **Verify Register Pattern**
    - Application must start with `-r @paystackhq/nestjs-observability/register`
    - Without this, auto-instrumentation won't work

3. **Check DataDog + FileBeat Integration (Logs)**
    - Logs go to stdout/stderr in JSON format (`loggingJsonEnabled: true`)
    - FileBeat collects from stdout/stderr and forwards to DataDog
    - DO NOT use `OTEL_LOGS_EXPORTER: otlp` - this bypasses FileBeat
    - `datadogAgentEnabled` is NOT required for logs

## Debugging Missing Logs in DataDog

If logs are not appearing in DataDog:

1. **Verify JSON logging is enabled:** Check `loggingJsonEnabled: true` in Helm values
2. **Verify console exporter:** Logs must go to stdout (default behavior, or `OTEL_LOGS_EXPORTER: console`)
3. **Check FileBeat is running:** FileBeat should be collecting logs from the pod
4. **Verify log format:** Logs should be JSON in stdout (not OTLP, not file)
5. **Test locally:** Run the app and verify JSON logs appear in console output
6. **Check LoggerService usage:** Ensure services are using `LoggerService` from the package

**Common mistake:** Setting `OTEL_LOGS_EXPORTER: otlp` - this bypasses FileBeat. Use `console` instead.

## Adding New Features

When extending this package:

1. **Follow OpenTelemetry Standards**
    - Use standard OTEL semantic conventions
    - Support standard OTEL environment variables
    - Don't create custom configuration patterns

2. **Maintain Zero-Config Design**
    - New features should work with sensible defaults
    - Configuration via environment variables only
    - Document new variables in `docs/environment-variables.md`

3. **Test with Real Services**
    - Test with actual NestJS applications
    - Verify DataDog integration in Kubernetes
    - Check impact on existing applications

# Testing Guidelines

## Unit Tests

- Mock OpenTelemetry SDK components
- Test environment variable parsing
- Verify decorator behavior

## Integration Tests

- Test with real NestJS application
- Verify auto-instrumentation works
- Check that metrics/traces are generated

## E2E Tests

- Deploy to Kubernetes with DataDog agent
- Verify telemetry reaches DataDog platform
- Test all exporter types (console, otlp)

# Common Patterns at Paystack

## Standard Service Setup

```typescript
import { Module } from '@nestjs/common';
import { ObservabilityModule } from '@paystackhq/nestjs-observability';

@Module({
  imports: [
    ObservabilityModule.forRoot(), // No configuration needed!
  ],
})
export class AppModule {}
```

## Standard Environment Variables (Staging with FileBeat)

```yaml
# Service identification
OTEL_SERVICE_NAME: my-service
OTEL_SERVICE_VERSION: staging
NODE_ENV: staging
# Logs: Use default 'console' exporter for FileBeat
# Don't set OTEL_LOGS_EXPORTER - it defaults to console
# FileBeat will collect JSON logs from stdout

# Optional: Traces/Metrics (if using DataDog agent)
# OTEL_TRACES_EXPORTER: otlp
# OTEL_METRICS_EXPORTER: otlp
# OTEL_EXPORTER_OTLP_ENDPOINT: http://localhost:4318
```

## Standard Kubernetes Configuration (with FileBeat)

```yaml
global:
  # Enable JSON logging for FileBeat
  loggingJsonEnabled: true

  # Optional: Only if you want DataDog agent for traces/metrics
  # datadogAgentEnabled: false  # Not needed for logs

  env:
    # Service identification
    OTEL_SERVICE_NAME: my-service
    OTEL_SERVICE_VERSION: staging
    NODE_ENV: staging

    # Logs: Default to console, FileBeat collects from stdout
    # Do NOT set OTEL_LOGS_EXPORTER: otlp

    # Optional DataDog variables (if agent enabled)
    # DD_TRACE_ENABLED: "true"
    # DD_ENV: staging
    # DD_SERVICE: my-service
```

# Important Reminders

1. **Never Invent Custom Patterns** - This package follows OpenTelemetry standards. Always reference the docs.

2. **Environment Variables Are the API** - Configuration happens via `OTEL_*` variables, not code.

3. **Check Documentation First** - Before suggesting solutions, review the relevant doc file.

4. **FileBeat Requires Console Output** - For DataDog logs via FileBeat, DO NOT set `OTEL_LOGS_EXPORTER: otlp`. Logs must go to stdout as JSON.

5. **Register Pattern is Required** - Without `-r @paystackhq/nestjs-observability/register`, auto-instrumentation won't work.

6. **Logs vs Traces/Metrics** - At Paystack, logs use FileBeat (console → stdout → FileBeat → DataDog). Traces/metrics can optionally use DataDog agent sidecar.

7. **JSON Logging is Critical** - Must have `loggingJsonEnabled: true` for FileBeat to properly parse logs.
