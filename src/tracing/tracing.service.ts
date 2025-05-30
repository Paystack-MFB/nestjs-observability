import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { RouterInstrumentation } from '@opentelemetry/instrumentation-router';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  AlwaysOffSampler,
  AlwaysOnSampler,
  BatchSpanProcessor,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-node';

import type { ObservabilityConfig } from '../config/observability.config';

import { LoggerService } from '../logger/logger.service';

interface TracingError extends Error {
  message: string;
  stack?: string;
}

// Static variable to track SDK initialization across instances
let isTracingSdkInitialized = false;
// Store a reference to the global SDK instance
let globalSdkInstance: NodeSDK | null = null;

/**
 * Service for OpenTelemetry distributed tracing setup
 */
@Injectable()
export class TracingService implements OnApplicationShutdown, OnModuleInit {
  private sdk!: NodeSDK;

  constructor(
    private readonly config: ObservabilityConfig,
    private readonly logger: LoggerService
  ) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.config.tracing.enabled && isTracingSdkInitialized) {
      try {
        // Only shutdown the SDK if we're the original instance that created it
        if (this.sdk === globalSdkInstance) {
          await this.sdk.shutdown();
          // Reset the global state after shutdown
          isTracingSdkInitialized = false;
          globalSdkInstance = null;

          this.logger.log('OpenTelemetry tracing shut down successfully', 'TracingService');
        }
      } catch (error: unknown) {
        const shutdownError = error as TracingError;
        this.logger.error(
          `Error shutting down tracing: ${shutdownError.message}`,
          shutdownError.stack ?? '',
          'TracingService'
        );
      }
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.config.tracing.enabled) {
      this.logger.log('Tracing is disabled', 'TracingService');
      return;
    }

    try {
      // Initialize the OpenTelemetry SDK
      await this.initializeTracingSdk();
      this.logger.log('OpenTelemetry tracing initialized successfully', 'TracingService');
    } catch (error: unknown) {
      const tracingError = error as TracingError;
      this.logger.error(
        `Failed to initialize tracing: ${tracingError.message}`,
        tracingError.stack ?? '',
        'TracingService'
      );
    }
  }

  /**
   * Configure the appropriate sampler based on configuration
   * @returns Configured OpenTelemetry sampler
   */
  private configureSampler(): AlwaysOffSampler | AlwaysOnSampler | TraceIdRatioBasedSampler {
    const { ratio, type } = this.config.tracing.sampler;

    switch (type) {
      case 'always_off':
        return new AlwaysOffSampler();
      case 'always_on':
        return new AlwaysOnSampler();
      case 'trace_id_ratio':
        return new TraceIdRatioBasedSampler(ratio ?? 0.1);
      default:
        this.logger.warn(`Unknown sampler type: ${String(type)}, using AlwaysOnSampler`, 'TracingService');
        return new AlwaysOnSampler();
    }
  }

  /**
   * Initialize OpenTelemetry SDK with configured options
   */
  private async initializeTracingSdk(): Promise<void> {
    // If already initialized, use the existing SDK instance
    if (isTracingSdkInitialized) {
      if (globalSdkInstance) {
        this.sdk = globalSdkInstance;
        return;
      }
      // If globalSdkInstance is null but isTracingSdkInitialized is true,
      // something went wrong, but we'll proceed to re-initialize
      this.logger.warn(
        'Tracing SDK was marked as initialized but no instance found. Reinitializing.',
        'TracingService'
      );
    }

    const { serviceName, tracing } = this.config;

    // Configure the trace exporter with proper headers handling
    const exporterConfig: { headers?: Record<string, string>; url: string } = {
      url: tracing.exporter.endpoint,
    };

    if (tracing.exporter.headers) {
      exporterConfig.headers = tracing.exporter.headers;
    }

    const traceExporter = new OTLPTraceExporter(exporterConfig);

    // Configure the sampler based on configuration
    const sampler = this.configureSampler();

    // Configure instrumentations
    const instrumentations = [];

    // Add explicit instrumentations to fix warnings
    if (tracing.instrumentations.nestJs) {
      instrumentations.push(new NestInstrumentation());
    }

    if (tracing.instrumentations.winston) {
      instrumentations.push(new WinstonInstrumentation());
    }

    // Add Express and Router instrumentations
    instrumentations.push(new ExpressInstrumentation());
    instrumentations.push(new RouterInstrumentation());

    // Add remaining auto-instrumentations if HTTP instrumentation is enabled
    if (tracing.instrumentations.http) {
      const autoInstrumentations = getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-express': { enabled: false },
        '@opentelemetry/instrumentation-nestjs-core': { enabled: false },
        '@opentelemetry/instrumentation-router': { enabled: false },
        // Disable instrumentation for modules we're explicitly configuring
        '@opentelemetry/instrumentation-winston': { enabled: false },
      });
      instrumentations.push(...autoInstrumentations);
    }

    // Create span processor from exporter
    const spanProcessor = new BatchSpanProcessor(traceExporter);

    // Important: Add a delay before starting the SDK to allow resource attributes to settle
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create the SDK with proper resource attributes
    this.sdk = new NodeSDK({
      instrumentations,
      sampler,
      serviceName: serviceName || 'unknown-service',
      spanProcessors: [spanProcessor] as never[], // Using type assertion to avoid compatibility issues
    });

    // Store reference to the SDK instance globally
    globalSdkInstance = this.sdk;

    // Mark as initialized before starting to prevent race conditions
    isTracingSdkInitialized = true;

    try {
      // Start the SDK after all async operations are complete
      this.sdk.start();
    } catch (error) {
      // If there's an error starting the SDK, it's likely because it's already been started
      // Just log the error but don't rethrow since the tracing should still work
      this.logger.warn(
        `Error starting tracing SDK (may be already started): ${(error as Error).message}`,
        'TracingService'
      );
    }
  }
}
