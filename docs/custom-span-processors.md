# Custom Span Processors Guide

This guide explains how to extend the `@paystackhq/nestjs-observability` package with custom span processors for specialized observability needs like LLM monitoring, custom exporters, or third-party integrations.

## Overview

The package provides two entry points:

| Entry Point                                 | Behavior                          | Use Case                                     |
| ------------------------------------------- | --------------------------------- | -------------------------------------------- |
| `@paystackhq/nestjs-observability/register` | Auto-starts on import (unchanged) | Apps that don't need custom span processors  |
| `@paystackhq/nestjs-observability/sdk`      | No auto-start, exports SDK tools  | Apps that need to add custom span processors |

Both entry points are fully compatible - the `/sdk` import simply gives you more control over SDK initialization.

## Why Custom Span Processors?

OpenTelemetry only allows one SDK instance per process. If you try to create a second `NodeSDK`, you'll get a "duplicate registration" error:

```
@opentelemetry/api: Attempted duplicate registration of API: trace
@opentelemetry/api: Attempted duplicate registration of API: propagation
```

Custom span processors solve this by letting you inject additional processors into the single SDK instance managed by this package.

## Common Use Cases

- **LLM Observability**: Langfuse, Helicone, or custom LLM monitoring
- **Custom Exporters**: Sending spans to proprietary systems
- **Span Filtering**: Filtering out sensitive or noisy spans
- **Span Enrichment**: Adding custom attributes to all spans
- **Multi-Destination**: Sending spans to multiple backends

## Quick Start

### 1. Create a Custom Register File

```typescript
// src/observability/register.ts
import { startSDK } from '@paystackhq/nestjs-observability/sdk';

// Import your custom span processors
import { getMyCustomSpanProcessors } from './my-processors';

// Get your custom span processors
const customProcessors = getMyCustomSpanProcessors();

// Start SDK with custom processors
startSDK({
  spanProcessors: customProcessors,
  includeDefaultTraceExporter: true,
  registerShutdownHandlers: true,
});

console.log(`[register] OpenTelemetry SDK started with ${customProcessors.length} custom span processor(s)`);
```

### 2. Update Package.json Scripts

Replace the default register with your custom one:

```json
{
  "scripts": {
    "start": "node -r ./dist/observability/register.js dist/main.js",
    "start:dev": "NODE_OPTIONS=\"-r dotenv/config -r ./dist/observability/register.js\" nest start --watch",
    "start:prod": "node -r ./dist/observability/register.js dist/main.js"
  }
}
```

### 3. Build and Run

```bash
# Build your project (compiles register.ts to register.js)
npm run build

# Start the application
npm run start
```

## Example: Langfuse Integration

[Langfuse](https://langfuse.com) is an open-source LLM observability platform. Here's how to integrate it:

### Install Dependencies

```bash
npm install @langfuse/otel langfuse
```

### Create Langfuse Configuration

```typescript
// src/observability/langfuse.config.ts
import { LangfuseExporter } from '@langfuse/otel';
import type { SpanProcessor } from '@opentelemetry/sdk-trace-base';

export function getSpanProcessors(): SpanProcessor[] {
  const isEnabled = process.env.LANGFUSE_ENABLED === 'true';

  if (!isEnabled) {
    console.log('[langfuse] Disabled via LANGFUSE_ENABLED env var');
    return [];
  }

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';

  if (!publicKey || !secretKey) {
    console.warn('[langfuse] Missing LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY');
    return [];
  }

  const exporter = new LangfuseExporter({
    publicKey,
    secretKey,
    baseUrl,
  });

  console.log(`[langfuse] Exporter initialized for ${baseUrl}`);
  return [exporter];
}
```

### Create Custom Register

```typescript
// src/observability/register.ts
import { startSDK } from '@paystackhq/nestjs-observability/sdk';
import { getSpanProcessors } from './langfuse.config';

const langfuseProcessors = getSpanProcessors();

startSDK({
  spanProcessors: langfuseProcessors,
  includeDefaultTraceExporter: true,
  registerShutdownHandlers: true,
});

console.log(`[register] SDK started with ${langfuseProcessors.length} custom processor(s)`);
```

### Environment Variables

```bash
# Enable Langfuse
LANGFUSE_ENABLED=true
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # Optional, defaults to cloud

# Standard OTEL config still works
OTEL_SERVICE_NAME=my-app
OTEL_TRACES_EXPORTER=otlp
```

## Example: Custom Filtering Span Processor

Create a span processor that filters out certain spans:

```typescript
// src/observability/filtering-processor.ts
import type { SpanProcessor, ReadableSpan, Span } from '@opentelemetry/sdk-trace-base';
import type { Context } from '@opentelemetry/api';

export class FilteringSpanProcessor implements SpanProcessor {
  constructor(
    private readonly delegate: SpanProcessor,
    private readonly filterFn: (span: ReadableSpan) => boolean
  ) {}

  forceFlush(): Promise<void> {
    return this.delegate.forceFlush();
  }

  shutdown(): Promise<void> {
    return this.delegate.shutdown();
  }

  onStart(span: Span, parentContext: Context): void {
    this.delegate.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    // Only forward spans that pass the filter
    if (this.filterFn(span)) {
      this.delegate.onEnd(span);
    }
  }
}

// Usage: Filter out health check spans
export function createFilteredExporter(baseProcessor: SpanProcessor): SpanProcessor {
  return new FilteringSpanProcessor(baseProcessor, (span) => {
    const spanName = span.name;
    // Filter out health checks and internal spans
    return !spanName.includes('/health') && !spanName.startsWith('internal.');
  });
}
```

## API Reference

### `startSDK(options)`

Creates and starts the OpenTelemetry SDK with custom configuration.

```typescript
import { startSDK } from '@paystackhq/nestjs-observability/sdk';

const sdk = startSDK({
  spanProcessors: myProcessors,
  includeDefaultTraceExporter: true,
  registerShutdownHandlers: true,
});
```

**Returns:** `NodeSDK` instance (already started)

### `createSDK(options)`

Creates the SDK without starting it. Use this if you need manual control over the SDK lifecycle.

```typescript
import { createSDK } from '@paystackhq/nestjs-observability/sdk';

const sdk = createSDK({
  spanProcessors: myProcessors,
});

// Start manually when ready
sdk.start();

// Shutdown manually when needed
process.on('SIGTERM', () => sdk.shutdown());
```

**Returns:** `NodeSDK` instance (not started)

### `SDKBuilderOptions`

```typescript
interface SDKBuilderOptions {
  /**
   * Custom span processors to add to the SDK.
   * These are added before the default trace exporter (if enabled).
   */
  spanProcessors?: SpanProcessor[];

  /**
   * Whether to include the default trace exporter based on OTEL_TRACES_EXPORTER.
   * Default: true
   */
  includeDefaultTraceExporter?: boolean;

  /**
   * Custom metric reader. If not provided, uses OTEL_METRICS_EXPORTER config.
   */
  metricReader?: MetricReader;

  /**
   * Custom log record processors.
   */
  logRecordProcessors?: LogRecordProcessor[];

  /**
   * Whether to register SIGTERM/SIGINT handlers for graceful shutdown.
   * Default: false (the package handles this internally)
   */
  registerShutdownHandlers?: boolean;
}
```

### Helper Functions

These functions are also exported and can be used to build custom configurations:

| Function                    | Description                                      |
| --------------------------- | ------------------------------------------------ |
| `createTraceExporter()`     | Creates exporter based on `OTEL_TRACES_EXPORTER` |
| `createMetricReader()`      | Creates reader based on `OTEL_METRICS_EXPORTER`  |
| `createLogProcessor()`      | Creates processor based on `OTEL_LOGS_EXPORTER`  |
| `createInstrumentations()`  | Returns auto-instrumentations for HTTP, etc.     |
| `createResource()`          | Creates resource with service name/version/env   |
| `createTextMapPropagator()` | Creates W3C TraceContext + Baggage propagator    |
| `getServiceName()`          | Returns the configured service name              |
| `getServiceVersion()`       | Returns the configured service version           |
| `getServiceEnvironment()`   | Returns the configured environment               |

## Backward Compatibility

This feature is fully backward compatible:

- **Existing apps**: Continue using `node -r @paystackhq/nestjs-observability/register` with no changes
- **New apps with custom processors**: Use `@paystackhq/nestjs-observability/sdk` and create a custom register file

The `/register` entry point still auto-starts the SDK on import. The `/sdk` entry point gives you control over when and how the SDK starts.

## Troubleshooting

### "Duplicate registration" Error

This error occurs when multiple SDK instances try to register. Ensure:

1. You're using `@paystackhq/nestjs-observability/sdk` (not creating your own `NodeSDK`)
2. You're not also using `-r @paystackhq/nestjs-observability/register` with your custom register
3. No other library is initializing OpenTelemetry

### Span Processors Not Called

1. Verify your custom register file is being loaded (check console output)
2. Ensure the compiled `.js` file exists in `dist/`
3. Check that `OTEL_TRACES_EXPORTER` is not set to `none`

### TypeScript Module Resolution

If TypeScript can't find `@paystackhq/nestjs-observability/sdk`, ensure you have:

```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node" // or "node16", "nodenext", "bundler"
  }
}
```

The package includes `typesVersions` for compatibility with all module resolution strategies.

## Best Practices

1. **Keep register files simple**: Only initialize OpenTelemetry, don't import application code
2. **Use environment variables**: Make processor configuration configurable
3. **Handle missing credentials gracefully**: Return empty arrays when credentials are missing
4. **Log initialization**: Add console logs to confirm processors are loaded
5. **Test in development**: Use `OTEL_TRACES_EXPORTER=console` to verify spans are generated
