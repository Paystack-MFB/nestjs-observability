import { OnModuleInit } from '@nestjs/common';
import * as promClient from 'prom-client';
import type { ObservabilityConfig } from '../config/observability.config';
import { LoggerService } from '../logger/logger.service';
/**
 * Service for Prometheus metrics collection and exposure
 */
export declare class MetricsService implements OnModuleInit {
    private readonly config;
    private readonly logger;
    private appInfoGauge;
    private httpRequestCounter;
    private httpRequestDurationHistogram;
    private registry;
    constructor(config: ObservabilityConfig, logger: LoggerService);
    /**
     * Create and register a new Counter metric
     * @param name Metric name
     * @param help Help text
     * @param labelNames Array of label names
     * @returns Prometheus Counter instance
     */
    createCounter(name: string, help: string, labelNames?: string[]): promClient.Counter;
    /**
     * Create and register a new Gauge metric
     * @param name Metric name
     * @param help Help text
     * @param labelNames Array of label names
     * @returns Prometheus Gauge instance
     */
    createGauge(name: string, help: string, labelNames?: string[]): promClient.Gauge;
    /**
     * Create and register a new Histogram metric
     * @param name Metric name
     * @param help Help text
     * @param labelNames Array of label names
     * @param buckets Array of bucket boundaries
     * @returns Prometheus Histogram instance
     */
    createHistogram(name: string, help: string, labelNames?: string[], buckets?: number[]): promClient.Histogram;
    /**
     * Create and register a new Summary metric
     * @param name Metric name
     * @param help Help text
     * @param labelNames Array of label names
     * @param percentiles Array of percentiles
     * @returns Prometheus Summary instance
     */
    createSummary(name: string, help: string, labelNames?: string[], percentiles?: number[]): promClient.Summary;
    /**
     * Get Prometheus metrics in string format
     * @returns Metrics in Prometheus exposition format
     */
    getMetrics(): Promise<string>;
    /**
     * Get the Prometheus registry
     * @returns Prometheus registry
     */
    getRegistry(): promClient.Registry;
    onModuleInit(): void;
    /**
     * Record HTTP request duration and increment request counter
     * @param method HTTP method
     * @param route Request route
     * @param statusCode HTTP status code
     * @param durationSec Request duration in seconds
     */
    recordHttpRequest(method: string, route: string, statusCode: number, durationSec: number): void;
    /**
     * Initialize Prometheus metrics
     */
    private initializeMetrics;
}
//# sourceMappingURL=metrics.service.d.ts.map