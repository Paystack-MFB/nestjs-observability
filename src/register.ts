/**
 * OpenTelemetry Register Module
 *
 * This module initializes the OpenTelemetry SDK with environment variable configuration
 * and safe defaults. It should be loaded using the Node.js -r flag:
 *
 * node -r @paystackhq/nestjs-observability/register dist/main.js
 *
 * NOTE: This module auto-starts the SDK on import. If you need to customize the SDK
 * (e.g., add custom span processors), use '@paystackhq/nestjs-observability/sdk' instead.
 */

// Re-export everything from sdk-core for backwards compatibility
export {
  // Types
  type SDKBuilderOptions,
  type SpanProcessor,
  type MetricReader,
  type LogRecordProcessor,
  // Service helpers
  getServiceAttributes,
  getServiceEnvironment,
  getServiceName,
  getServiceVersion,
  getHttpRequestLoggingEnabled,
  // Building blocks
  createLogProcessor,
  createMetricReader,
  createTraceExporter,
  createInstrumentations,
  createResource,
  createTextMapPropagator,
  // SDK creation (for advanced usage)
  createSDK,
  startSDK,
  initializeSDK,
  gracefulShutdown,
  getSDK,
  setSDK,
  // NodeSDK class
  NodeSDK,
} from './sdk-core';

import { initializeSDK, setSDK, gracefulShutdown, getSDK } from './sdk-core';

/**
 * Initialize and start the OpenTelemetry SDK
 */
function start(): void {
  try {
    // Initialize SDK
    const sdkInstance = initializeSDK();
    setSDK(sdkInstance);

    // Start the SDK (guarded for test mocks)
    const candidate = sdkInstance as unknown as { start?: () => void };
    if (typeof candidate.start === 'function') {
      candidate.start();
    }

    // Register graceful shutdown handlers
    process.on('SIGTERM', () => {
      void gracefulShutdown('SIGTERM');
    });
    process.on('SIGINT', () => {
      void gracefulShutdown('SIGINT');
    });
  } catch (error: unknown) {
    console.error('Failed to initialize OpenTelemetry SDK:', error);
    // In tests, allow the test to assert process.exit was called via spy
    process.exit(1);
  }
}

// Auto-start when this module is required (including tests to satisfy test expectations)
start();

// Export SDK instance getter and start function for testing and advanced usage
export { start };

// Export sdk getter for backward compatibility
export const sdk = getSDK();
