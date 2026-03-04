/**
 * SDK Building Blocks Module
 *
 * This module exports building blocks for creating custom OpenTelemetry SDK configurations.
 * Unlike the register module, this does NOT auto-start the SDK.
 *
 * Use this module when you need to:
 * - Add custom span processors (e.g., Langfuse, custom exporters)
 * - Customize the SDK configuration before starting
 * - Have full control over when the SDK starts
 *
 * @example
 * ```typescript
 * // src/observability/register.ts
 * import { startSDK } from '@paystackhq/nestjs-observability/sdk';
 * import { LangfuseSpanProcessor } from '@langfuse/otel';
 *
 * const langfuseProcessor = new LangfuseSpanProcessor({
 *   publicKey: process.env.LANGFUSE_PUBLIC_KEY,
 *   secretKey: process.env.LANGFUSE_SECRET_KEY,
 * });
 *
 * startSDK({
 *   spanProcessors: [langfuseProcessor],
 *   includeDefaultTraceExporter: true,
 *   registerShutdownHandlers: true,
 * });
 * ```
 *
 * Then use in your start script:
 * ```bash
 * node -r ./dist/observability/register.js dist/main.js
 * ```
 */

// Re-export SDK building blocks (without auto-start)
export {
  // SDK creation functions
  createSDK,
  startSDK,
  initializeSDK,
  getSDK,
  setSDK,
  gracefulShutdown,
  // Configuration helpers
  getServiceAttributes,
  getServiceEnvironment,
  getServiceName,
  getServiceVersion,
  getHttpRequestLoggingEnabled,
  // Ignored routes registry
  addIgnoredRoute,
  getIgnoredRoutes,
  isRouteIgnored,
  resetIgnoredRoutes,
  // Building block functions
  createLogProcessor,
  createMetricReader,
  createTraceExporter,
  createInstrumentations,
  createResource,
  createTextMapPropagator,
  // Types
  type SDKBuilderOptions,
  type SpanProcessor,
  type MetricReader,
  type LogRecordProcessor,
  // NodeSDK class re-export
  NodeSDK,
} from './sdk-core';
