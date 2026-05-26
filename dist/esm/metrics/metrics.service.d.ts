import type { Counter, Histogram, Meter, ObservableGauge } from '@opentelemetry/api';
import { OnModuleInit } from '@nestjs/common';
import * as promClient from 'prom-client';
import { LoggerService } from '../logger/logger.service.js';
export declare class MetricsService implements OnModuleInit {
    private readonly logger;
    private appInfoGauge;
    private httpRequestCounter;
    private httpRequestDurationHistogram;
    private otelCounters;
    private otelGauges;
    private otelHistograms;
    private readonly otelMeter;
    private readonly registry;
    constructor(logger: LoggerService | undefined);
    createCounter(name: string, description: string, labels?: Record<string, string>): Counter;
    createGauge(name: string, description: string, callback?: () => number): ObservableGauge;
    createHistogram(name: string, description: string, buckets?: number[]): Histogram;
    createSummary(name: string, description: string, percentiles?: number[]): Histogram;
    getMeter(): Meter;
    getMetrics(): Promise<string>;
    getRegistry(): promClient.Registry;
    onModuleInit(): void;
    recordHttpRequest(method: string, route: string, statusCode: number, durationSec: number): void;
    private getServiceLabels;
    private initializeMetrics;
    private setDefaultLabels;
}
//# sourceMappingURL=metrics.service.d.ts.map