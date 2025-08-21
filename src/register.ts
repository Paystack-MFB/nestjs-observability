/**
 * OpenTelemetry Register Module
 *
 * This module initializes the OpenTelemetry SDK with environment variable configuration
 * and safe defaults. It should be loaded using the Node.js -r flag:
 *
 * node -r @paystackhq/nestjs-observability/register dist/main.js
 */

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ConsoleMetricExporter, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// SDK instance for global access and cleanup
let sdk: NodeSDK | null = null;

/**
 * Create console metric reader
 */
function createMetricReader() {
  return new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
    exportIntervalMillis: 10000, // Export metrics every 10 seconds
  });
}


/**
 * Create console trace exporter
 */
function createTraceExporter(): ConsoleSpanExporter {
  return new ConsoleSpanExporter();
}

/**
 * Get service name from environment variables with fallback
 */
function getServiceName(): string {
  return process.env['OTEL_SERVICE_NAME'] ?? process.env['SERVICE_NAME'] ?? 'unknown-service';
}

/**
 * Get service version from environment variables with fallback
 */
function getServiceVersion(): string {
  return process.env['OTEL_SERVICE_VERSION'] ?? process.env['SERVICE_VERSION'] ?? '1.0.0';
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down OpenTelemetry SDK gracefully...`);

  if (sdk) {
    try {
      await sdk.shutdown();
      console.log('OpenTelemetry SDK shutdown completed');
    } catch (error: unknown) {
      console.error('Error during OpenTelemetry SDK shutdown:', error);
    }
  }

  process.exit(0);
}

/**
 * Initialize OpenTelemetry SDK
 */
function initializeSDK(): NodeSDK {
  // Create trace exporter (NodeSDK will automatically use BatchSpanProcessor)
  const traceExporter = createTraceExporter();

  // Create metric reader
  const metricReader = createMetricReader();

  // Create resource with service information
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: getServiceName(),
    [ATTR_SERVICE_VERSION]: getServiceVersion(),
    'service.environment': process.env['NODE_ENV'] ?? 'development',
  });

  // Get auto-instrumentations
  const instrumentations = getNodeAutoInstrumentations({
    // Disable some instrumentations that might be noisy in development
    '@opentelemetry/instrumentation-dns': {
      enabled: false,
    },
    '@opentelemetry/instrumentation-net': {
      enabled: false,
    },
  });

  // Create and configure SDK with latest v0.203.0 patterns
  const sdkInstance = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations,
  });

  return sdkInstance;
}

/**
 * Initialize and start the OpenTelemetry SDK
 */
function start(): void {
  try {
    // Initialize SDK
    sdk = initializeSDK();

    // Start the SDK
    sdk.start();

    console.log('OpenTelemetry SDK initialized successfully');
    console.log(`Service: ${getServiceName()}`);
    console.log(`Version: ${getServiceVersion()}`);
    console.log(`Environment: ${process.env['NODE_ENV'] ?? 'development'}`);

    // Register graceful shutdown handlers
    process.on('SIGTERM', () => {
      void gracefulShutdown('SIGTERM');
    });
    process.on('SIGINT', () => {
      void gracefulShutdown('SIGINT');
    });
  } catch (error: unknown) {
    console.error('Failed to initialize OpenTelemetry SDK:', error);
    process.exit(1);
  }
}

// Auto-start when this module is required
start();

// Export SDK instance for testing and advanced usage
export { sdk };
