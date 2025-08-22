/**
 * OpenTelemetry Register Module
 *
 * This module initializes the OpenTelemetry SDK with environment variable configuration
 * and safe defaults. It should be loaded using the Node.js -r flag:
 *
 * node -r @paystackhq/nestjs-observability/register dist/main.js
 */

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { ConsoleMetricExporter, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// OTLP Exporters (lazy loaded to avoid import errors if not available)
let OTLPTraceExporter: typeof import('@opentelemetry/exporter-trace-otlp-http').OTLPTraceExporter | undefined;
let OTLPMetricExporter: typeof import('@opentelemetry/exporter-metrics-otlp-http').OTLPMetricExporter | undefined;
let OTLPLogExporter: typeof import('@opentelemetry/exporter-logs-otlp-http').OTLPLogExporter | undefined;

// SDK instance for global access and cleanup
let sdk: NodeSDK | null = null;

/**
 * Create log processor based on environment variables
 */
async function createLogProcessor(): Promise<BatchLogRecordProcessor | undefined> {
  const exporterType = process.env['OTEL_LOGS_EXPORTER'] ?? 'console';

  switch (exporterType) {
    case 'otlp':
      try {
        if (!OTLPLogExporter) {
          const { OTLPLogExporter: OTLPLogExporterClass } = await import('@opentelemetry/exporter-logs-otlp-http');
          OTLPLogExporter = OTLPLogExporterClass;
        }

        const endpoint =
          process.env['OTEL_EXPORTER_OTLP_LOGS_ENDPOINT'] ??
          process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ??
          'http://localhost:4318/v1/logs';

        const headers = parseOtlpHeaders(
          process.env['OTEL_EXPORTER_OTLP_LOGS_HEADERS'] ?? process.env['OTEL_EXPORTER_OTLP_HEADERS']
        );

        const { BatchLogRecordProcessor } = await import('@opentelemetry/sdk-logs');

        return new BatchLogRecordProcessor(
          new OTLPLogExporter({
            headers,
            url: endpoint,
          })
        );
      } catch (error) {
        console.warn('Failed to create OTLP log processor, logs will not be exported:', error);
        return undefined;
      }
    case 'console':
      try {
        const { BatchLogRecordProcessor, ConsoleLogRecordExporter } = await import('@opentelemetry/sdk-logs');
        return new BatchLogRecordProcessor(new ConsoleLogRecordExporter());
      } catch (error) {
        console.warn('Failed to create console log processor, logs will not be exported:', error);
        return undefined;
      }
    default:
      return undefined;
  }
}

/**
 * Create metric reader based on environment variables
 */
async function createMetricReader(): Promise<import('@opentelemetry/sdk-metrics').MetricReader> {
  const exporterType = process.env['OTEL_METRICS_EXPORTER'] ?? 'console';

  switch (exporterType) {
    case 'otlp':
      try {
        if (!OTLPMetricExporter) {
          const { OTLPMetricExporter: OTLPMetricExporterClass } = await import(
            '@opentelemetry/exporter-metrics-otlp-http'
          );
          OTLPMetricExporter = OTLPMetricExporterClass;
        }

        const endpoint =
          process.env['OTEL_EXPORTER_OTLP_METRICS_ENDPOINT'] ??
          process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ??
          'http://localhost:4318/v1/metrics';

        const headers = parseOtlpHeaders(
          process.env['OTEL_EXPORTER_OTLP_METRICS_HEADERS'] ?? process.env['OTEL_EXPORTER_OTLP_HEADERS']
        );

        const exportIntervalMillis = parseInt(process.env['OTEL_METRIC_EXPORT_INTERVAL'] ?? '10000', 10);
        const defaultTimeoutMillis = Math.min(exportIntervalMillis - 1000, 5000); // Ensure timeout < interval, max 5s
        const exportTimeoutMillis = parseInt(
          process.env['OTEL_METRIC_EXPORT_TIMEOUT'] ?? defaultTimeoutMillis.toString(),
          10
        );

        return new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            headers,
            url: endpoint,
          }),
          exportIntervalMillis,
          exportTimeoutMillis: Math.min(exportTimeoutMillis, exportIntervalMillis - 100), // Ensure timeout < interval
        });
      } catch (error) {
        console.warn('Failed to create OTLP metric exporter, falling back to console:', error);
        return new PeriodicExportingMetricReader({
          exporter: new ConsoleMetricExporter(),
          exportIntervalMillis: 10000,
          exportTimeoutMillis: 5000, // 5 second timeout, less than 10 second interval
        });
      }
    case 'console':
    default:
      return new PeriodicExportingMetricReader({
        exporter: new ConsoleMetricExporter(),
        exportIntervalMillis: 10000, // Export metrics every 10 seconds
        exportTimeoutMillis: 5000, // 5 second timeout, less than 10 second interval
      });
  }
}

/**
 * Create trace exporter based on environment variables
 */
async function createTraceExporter(): Promise<
  ConsoleSpanExporter | import('@opentelemetry/exporter-trace-otlp-http').OTLPTraceExporter
> {
  const exporterType = process.env['OTEL_TRACES_EXPORTER'] ?? 'console';

  switch (exporterType) {
    case 'otlp':
      try {
        if (!OTLPTraceExporter) {
          const { OTLPTraceExporter: OTLPTraceExporterClass } = await import('@opentelemetry/exporter-trace-otlp-http');
          OTLPTraceExporter = OTLPTraceExporterClass;
        }

        const endpoint =
          process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'] ??
          process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ??
          'http://localhost:4318/v1/traces';

        const headers = parseOtlpHeaders(
          process.env['OTEL_EXPORTER_OTLP_TRACES_HEADERS'] ?? process.env['OTEL_EXPORTER_OTLP_HEADERS']
        );

        return new OTLPTraceExporter({
          headers,
          url: endpoint,
        });
      } catch (error) {
        console.warn('Failed to create OTLP trace exporter, falling back to console:', error);
        return new ConsoleSpanExporter();
      }
    case 'console':
    default:
      return new ConsoleSpanExporter();
  }
}

/**
 * Get service name from environment variables
 */
function getServiceName(): string {
  return process.env['OTEL_SERVICE_NAME'] ?? 'unknown-service';
}

/**
 * Get service version from environment variables
 */
function getServiceVersion(): string {
  return process.env['OTEL_SERVICE_VERSION'] ?? '1.0.0';
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
async function initializeSDK(): Promise<NodeSDK> {
  // Create trace exporter (NodeSDK will automatically use BatchSpanProcessor)
  const traceExporter = await createTraceExporter();

  // Create metric reader
  const metricReader = await createMetricReader();

  // Create log processor (optional)
  const logRecordProcessor = await createLogProcessor();

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

  // Create SDK configuration
  const sdkConfig: Partial<import('@opentelemetry/sdk-node').NodeSDKConfiguration> = {
    instrumentations,
    resource,
    traceExporter,
  };

  // Only add custom metric reader if not using NodeSDK's automatic OTLP configuration
  const metricsExporter = process.env['OTEL_METRICS_EXPORTER'];
  if (metricsExporter !== 'otlp') {
    sdkConfig.metricReader = metricReader;
  }

  // Add log processor if available
  if (logRecordProcessor) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    sdkConfig.logRecordProcessors = [logRecordProcessor as any];
  }

  // Create and configure SDK with latest v0.203.0 patterns
  const sdkInstance = new NodeSDK(sdkConfig);

  return sdkInstance;
}

/**
 * Parse OTLP headers from environment variable string
 */
function parseOtlpHeaders(headersString?: string): Record<string, string> {
  if (!headersString) return {};

  const headers: Record<string, string> = {};
  const pairs = headersString.split(',');

  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      headers[key.trim()] = value.trim();
    }
  }

  return headers;
}

/**
 * Initialize and start the OpenTelemetry SDK
 */
async function start(): Promise<void> {
  try {
    // Initialize SDK
    sdk = await initializeSDK();

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
void start();

// Export SDK instance for testing and advanced usage
export { sdk };
