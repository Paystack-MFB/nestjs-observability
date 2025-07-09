import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import * as promClient from 'prom-client';

import type { ObservabilityConfig } from '../config/observability.config';

import { LoggerService } from '../logger/logger.service';

/**
 * Service for Prometheus metrics collection and exposure
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private appInfoGauge!: promClient.Gauge;

  private httpRequestCounter!: promClient.Counter;
  // Common metrics
  private httpRequestDurationHistogram!: promClient.Histogram;
  private registry: promClient.Registry;

  constructor(
    @Inject('OBSERVABILITY_CONFIG') private readonly config: ObservabilityConfig,
    private readonly logger: LoggerService
  ) {
    // Create a new registry
    this.registry = new promClient.Registry();

    // Set default labels from config
    this.registry.setDefaultLabels(this.config.metrics.defaultLabels);

    // Initialize common metrics
    this.initializeMetrics();
  }

  /**
   * Create and register a new Counter metric
   * @param name Metric name
   * @param help Help text
   * @param labelNames Array of label names
   * @returns Prometheus Counter instance
   */
  createCounter(name: string, help: string, labelNames: string[] = []): promClient.Counter {
    const counter = new promClient.Counter({
      help,
      labelNames,
      name,
    });
    this.registry.registerMetric(counter);
    return counter;
  }

  /**
   * Create and register a new Gauge metric
   * @param name Metric name
   * @param help Help text
   * @param labelNames Array of label names
   * @returns Prometheus Gauge instance
   */
  createGauge(name: string, help: string, labelNames: string[] = []): promClient.Gauge {
    const gauge = new promClient.Gauge({
      help,
      labelNames,
      name,
    });
    this.registry.registerMetric(gauge);
    return gauge;
  }

  /**
   * Create and register a new Histogram metric
   * @param name Metric name
   * @param help Help text
   * @param labelNames Array of label names
   * @param buckets Array of bucket boundaries
   * @returns Prometheus Histogram instance
   */
  createHistogram(
    name: string,
    help: string,
    labelNames: string[] = [],
    buckets: number[] = promClient.linearBuckets(0.1, 0.1, 10)
  ): promClient.Histogram {
    const histogram = new promClient.Histogram({
      buckets,
      help,
      labelNames,
      name,
    });
    this.registry.registerMetric(histogram);
    return histogram;
  }

  /**
   * Create and register a new Summary metric
   * @param name Metric name
   * @param help Help text
   * @param labelNames Array of label names
   * @param percentiles Array of percentiles
   * @returns Prometheus Summary instance
   */
  createSummary(
    name: string,
    help: string,
    labelNames: string[] = [],
    percentiles: number[] = [0.5, 0.9, 0.95, 0.99]
  ): promClient.Summary {
    const summary = new promClient.Summary({
      help,
      labelNames,
      name,
      percentiles,
    });
    this.registry.registerMetric(summary);
    return summary;
  }

  /**
   * Get Prometheus metrics in string format
   * @returns Metrics in Prometheus exposition format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get the Prometheus registry
   * @returns Prometheus registry
   */
  getRegistry(): promClient.Registry {
    return this.registry;
  }

  onModuleInit(): void {
    // Register default metrics if enabled
    if (this.config.metrics.defaultMetrics) {
      promClient.collectDefaultMetrics({
        labels: this.config.metrics.defaultLabels,
        prefix: 'node_',
        register: this.registry,
      });
      this.logger.log('Default metrics collection enabled', 'MetricsService');
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
    this.httpRequestDurationHistogram.observe(labels, durationSec);
    this.httpRequestCounter.inc(labels);
  }

  /**
   * Initialize Prometheus metrics
   */
  private initializeMetrics(): void {
    // HTTP request duration histogram
    this.httpRequestDurationHistogram = new promClient.Histogram({
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      name: 'http_request_duration_seconds',
    });

    // HTTP request counter
    this.httpRequestCounter = new promClient.Counter({
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      name: 'http_requests_total',
    });

    // Application info gauge
    this.appInfoGauge = new promClient.Gauge({
      help: 'Application information',
      labelNames: ['version', 'environment'],
      name: 'app_info',
    });

    // Register metrics with the registry
    this.registry.registerMetric(this.httpRequestDurationHistogram);
    this.registry.registerMetric(this.httpRequestCounter);
    this.registry.registerMetric(this.appInfoGauge);

    // Set application info
    this.appInfoGauge.labels(this.config.serviceVersion, this.config.environment).set(1);
  }
}
