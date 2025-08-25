import type { Counter, Histogram, Meter, ObservableGauge } from '@opentelemetry/api';

import { Injectable, OnModuleInit } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';
import * as promClient from 'prom-client';

import { LoggerService } from '../logger/logger.service';

/**
 * Enhanced metrics service that integrates with OpenTelemetry global meter provider
 * Provides both OpenTelemetry metrics and Prometheus-compatible metrics for backward compatibility
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private appInfoGauge!: promClient.Gauge;
  private httpRequestCounter!: promClient.Counter;
  private httpRequestDurationHistogram!: promClient.Histogram;
  // OpenTelemetry metrics
  private otelCounters = new Map<string, Counter>();
  private otelGauges = new Map<string, ObservableGauge>();

  private otelHistograms = new Map<string, Histogram>();
  private readonly otelMeter: Meter;
  private readonly registry: promClient.Registry;

  constructor(private readonly logger: LoggerService) {
    // Get OpenTelemetry meter from global provider
    const meterProvider = metrics.getMeterProvider();
    this.otelMeter = meterProvider.getMeter('nestjs-app', '1.0.0');

    // Create Prometheus registry for backward compatibility
    this.registry = new promClient.Registry();

    // Set default labels from environment/resource attributes
    this.setDefaultLabels();

    // Initialize common metrics
    this.initializeMetrics();
  }

  /**
   * Create and register a new Counter metric using OpenTelemetry
   * @param name Metric name
   * @param description Description of the metric
   * @param labels Default labels to apply
   * @returns OpenTelemetry Counter instance
   */
  createCounter(name: string, description: string, labels?: Record<string, string>): Counter {
    const counter = this.otelMeter.createCounter(name, {
      description,
    });

    this.otelCounters.set(name, counter);

    // Also create Prometheus counter for backward compatibility
    try {
      new promClient.Counter({
        help: description,
        labelNames: Object.keys(labels || {}),
        name: name.replace(/[.-]/g, '_'), // Prometheus naming convention
        registers: [this.registry], // Use our specific registry
      });
    } catch (error) {
      // Ignore registry conflicts in test environments
      this.logger?.debug('Counter already exists in registry', { context: 'MetricsService', name });
    }

    return counter;
  }

  /**
   * Create and register a new Observable Gauge metric using OpenTelemetry
   * @param name Metric name
   * @param description Description of the metric
   * @param callback Callback function to provide gauge value
   * @returns OpenTelemetry ObservableGauge instance
   */
  createGauge(name: string, description: string, callback?: () => number): ObservableGauge {
    const gauge = this.otelMeter.createObservableGauge(name, {
      description,
    });

    if (callback) {
      this.otelMeter.addBatchObservableCallback(
        (observableResult) => {
          observableResult.observe(gauge, callback());
        },
        [gauge]
      );
    }

    this.otelGauges.set(name, gauge);

    // Also create Prometheus gauge for backward compatibility
    try {
      new promClient.Gauge({
        help: description,
        name: name.replace(/[.-]/g, '_'), // Prometheus naming convention
        registers: [this.registry], // Use our specific registry
      });
    } catch (error) {
      // Ignore registry conflicts in test environments
      this.logger?.debug('Gauge already exists in registry', { context: 'MetricsService', name });
    }

    return gauge;
  }

  /**
   * Create and register a new Histogram metric using OpenTelemetry
   * @param name Metric name
   * @param description Description of the metric
   * @param buckets Array of bucket boundaries
   * @returns OpenTelemetry Histogram instance
   */
  createHistogram(name: string, description: string, buckets?: number[]): Histogram {
    const histogram = this.otelMeter.createHistogram(name, {
      description,
    });

    this.otelHistograms.set(name, histogram);

    // Also create Prometheus histogram for backward compatibility
    try {
      new promClient.Histogram({
        buckets: buckets || [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
        help: description,
        name: name.replace(/[.-]/g, '_'), // Prometheus naming convention
        registers: [this.registry], // Use our specific registry
      });
    } catch (error) {
      // Ignore registry conflicts in test environments
      this.logger?.debug('Histogram already exists in registry', { context: 'MetricsService', name });
    }

    return histogram;
  }

  /**
   * Create a Summary metric using OpenTelemetry Histogram with percentiles
   * @param name Metric name
   * @param description Description of the metric
   * @param percentiles Array of percentiles (not directly supported in OpenTelemetry, creates histogram instead)
   * @returns OpenTelemetry Histogram instance configured for summary-like behavior
   */
  createSummary(name: string, description: string, percentiles: number[] = [0.5, 0.9, 0.95, 0.99]): Histogram {
    // OpenTelemetry doesn't have native summaries, use histogram with appropriate buckets
    const histogram = this.otelMeter.createHistogram(name, {
      description,
    });

    this.otelHistograms.set(name, histogram);

    // Create Prometheus summary for backward compatibility
    try {
      new promClient.Summary({
        help: description,
        name: name.replace(/[.-]/g, '_'), // Prometheus naming convention
        percentiles,
        registers: [this.registry], // Use our specific registry
      });
    } catch (error) {
      // Ignore registry conflicts in test environments
      this.logger?.debug('Summary already exists in registry', { context: 'MetricsService', name });
    }

    return histogram;
  }

  /**
   * Get OpenTelemetry meter instance for advanced usage
   * @returns OpenTelemetry Meter instance
   */
  getMeter(): Meter {
    return this.otelMeter;
  }

  /**
   * Get Prometheus metrics in string format (for backward compatibility)
   * @returns Metrics in Prometheus exposition format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get the Prometheus registry (for backward compatibility)
   * @returns Prometheus registry
   */
  getRegistry(): promClient.Registry {
    return this.registry;
  }

  onModuleInit(): void {
    // Register default Prometheus metrics for backward compatibility
    // OpenTelemetry auto-instrumentation will handle native metrics
    try {
      promClient.collectDefaultMetrics({
        labels: this.getServiceLabels(),
        prefix: 'node_',
        register: this.registry,
      });
      this.logger?.log('Default metrics collection enabled', { context: 'MetricsService' });
    } catch (error) {
      this.logger?.warn('Failed to initialize default metrics collection', {
        context: 'MetricsService',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Record HTTP request duration and increment request counter
   * @param method HTTP method
   * @param route Request route
   * @param statusCode HTTP status code
   * @param durationSec Request duration in seconds
   */
  recordHttpRequest(method: string, route: string, statusCode: number, durationSec: number): void {
    const labels = { method, route, status_code: statusCode.toString() };

    // Record in both systems for compatibility
    this.httpRequestDurationHistogram.observe(labels, durationSec);
    this.httpRequestCounter.inc(labels);

    // Also record in OpenTelemetry if available
    const otelHistogram = this.otelHistograms.get('http_request_duration_seconds');
    const otelCounter = this.otelCounters.get('http_requests_total');

    if (otelHistogram) {
      otelHistogram.record(durationSec, labels);
    }
    if (otelCounter) {
      otelCounter.add(1, labels);
    }
  }

  /**
   * Extract service labels from environment variables
   * @returns Service labels object
   */
  private getServiceLabels(): Record<string, string> {
    return {
      environment: process.env['NODE_ENV'] || 'development',
      service: process.env['OTEL_SERVICE_NAME'] || 'nestjs-app',
      version: process.env['OTEL_SERVICE_VERSION'] || '1.0.0',
    };
  }

  /**
   * Initialize common Prometheus metrics for backward compatibility
   */
  private initializeMetrics(): void {
    const serviceLabels = this.getServiceLabels();

    try {
      // HTTP request duration histogram
      this.httpRequestDurationHistogram = new promClient.Histogram({
        buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        name: 'http_request_duration_seconds',
        registers: [this.registry],
      });

      // HTTP request counter
      this.httpRequestCounter = new promClient.Counter({
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code'],
        name: 'http_requests_total',
        registers: [this.registry],
      });

      // Application info gauge
      this.appInfoGauge = new promClient.Gauge({
        help: 'Application information',
        labelNames: ['version', 'environment'],
        name: 'app_info',
        registers: [this.registry],
      });

      // Set application info
      this.appInfoGauge.labels(serviceLabels['version'], serviceLabels['environment']).set(1);
    } catch (error) {
      // Create fallback metrics if the registry approach fails
      this.logger?.warn('Failed to initialize common Prometheus metrics', {
        context: 'MetricsService',
        error: error instanceof Error ? error.message : String(error),
      });

      // Create minimal fallback metrics
      this.httpRequestDurationHistogram = new promClient.Histogram({
        buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        name: 'http_request_duration_seconds_fallback',
      });

      this.httpRequestCounter = new promClient.Counter({
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code'],
        name: 'http_requests_total_fallback',
      });

      this.appInfoGauge = new promClient.Gauge({
        help: 'Application information',
        labelNames: ['version', 'environment'],
        name: 'app_info_fallback',
      });
    }

    // Create corresponding OpenTelemetry metrics
    this.createCounter('http_requests_total', 'Total number of HTTP requests');
    this.createHistogram('http_request_duration_seconds', 'Duration of HTTP requests in seconds');
  }

  /**
   * Set default labels from environment variables and resource attributes
   */
  private setDefaultLabels(): void {
    const defaultLabels = this.getServiceLabels();
    this.registry.setDefaultLabels(defaultLabels);
  }
}
