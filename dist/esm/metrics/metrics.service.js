import { __decorate, __metadata, __param } from "tslib";
import { Injectable, Optional } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';
import * as promClient from 'prom-client';
import { getServiceEnvironment, getServiceName, getServiceVersion } from '../sdk-core.js';
let MetricsService = class MetricsService {
    logger;
    appInfoGauge;
    httpRequestCounter;
    httpRequestDurationHistogram;
    otelCounters = new Map();
    otelGauges = new Map();
    otelHistograms = new Map();
    otelMeter;
    registry;
    constructor(logger) {
        this.logger = logger;
        const meterProvider = typeof metrics.getMeterProvider === 'function' ? metrics.getMeterProvider() : undefined;
        const resolvedMeter = meterProvider && typeof meterProvider.getMeter === 'function'
            ? meterProvider.getMeter(getServiceName(), getServiceVersion())
            : {
                createCounter: () => ({ add: (_v, _attrs) => undefined }),
                createHistogram: () => ({ record: (_v, _attrs) => undefined }),
                createObservableGauge: () => ({ addCallback: (_cb) => undefined }),
            };
        this.otelMeter = resolvedMeter;
        this.registry = new promClient.Registry();
        this.setDefaultLabels();
        this.initializeMetrics();
    }
    createCounter(name, description, labels) {
        const counter = this.otelMeter.createCounter(name, {
            description,
        });
        this.otelCounters.set(name, counter);
        try {
            new promClient.Counter({
                help: description,
                labelNames: Object.keys(labels ?? {}),
                name: name.replace(/[.-]/g, '_'),
                registers: [this.registry],
            });
        }
        catch (_error) {
            this.logger?.debug('Counter already exists in registry', { context: 'MetricsService', name });
        }
        return counter;
    }
    createGauge(name, description, callback) {
        const gauge = this.otelMeter.createObservableGauge(name, {
            description,
        });
        if (callback) {
            this.otelMeter.addBatchObservableCallback((observableResult) => {
                observableResult.observe(gauge, callback());
            }, [gauge]);
        }
        this.otelGauges.set(name, gauge);
        try {
            new promClient.Gauge({
                help: description,
                name: name.replace(/[.-]/g, '_'),
                registers: [this.registry],
            });
        }
        catch (_error) {
            this.logger?.debug('Gauge already exists in registry', { context: 'MetricsService', name });
        }
        return gauge;
    }
    createHistogram(name, description, buckets) {
        const histogram = this.otelMeter.createHistogram(name, {
            description,
        });
        this.otelHistograms.set(name, histogram);
        try {
            new promClient.Histogram({
                buckets: buckets ?? [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
                help: description,
                name: name.replace(/[.-]/g, '_'),
                registers: [this.registry],
            });
        }
        catch (_error) {
            this.logger?.debug('Histogram already exists in registry', { context: 'MetricsService', name });
        }
        return histogram;
    }
    createSummary(name, description, percentiles = [0.5, 0.9, 0.95, 0.99]) {
        const histogram = this.otelMeter.createHistogram(name, {
            description,
        });
        this.otelHistograms.set(name, histogram);
        try {
            new promClient.Summary({
                help: description,
                name: name.replace(/[.-]/g, '_'),
                percentiles,
                registers: [this.registry],
            });
        }
        catch (_error) {
            this.logger?.debug('Summary already exists in registry', { context: 'MetricsService', name });
        }
        return histogram;
    }
    getMeter() {
        return this.otelMeter;
    }
    async getMetrics() {
        return this.registry.metrics();
    }
    getRegistry() {
        return this.registry;
    }
    onModuleInit() {
        try {
            promClient.collectDefaultMetrics({
                labels: this.getServiceLabels(),
                prefix: 'node_',
                register: this.registry,
            });
            this.logger?.info('Default metrics collection enabled', { context: 'MetricsService' });
        }
        catch (error) {
            this.logger?.warn('Failed to initialize default metrics collection', {
                context: 'MetricsService',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    recordHttpRequest(method, route, statusCode, durationSec) {
        const labels = { method, route, status_code: statusCode.toString() };
        this.httpRequestDurationHistogram.observe(labels, durationSec);
        this.httpRequestCounter.inc(labels);
        const otelHistogram = this.otelHistograms.get('http_request_duration_seconds');
        const otelCounter = this.otelCounters.get('http_requests_total');
        if (otelHistogram) {
            otelHistogram.record(durationSec, labels);
        }
        if (otelCounter) {
            otelCounter.add(1, labels);
        }
    }
    getServiceLabels() {
        return {
            environment: getServiceEnvironment(),
            service: getServiceName(),
            version: getServiceVersion(),
        };
    }
    initializeMetrics() {
        const serviceLabels = this.getServiceLabels();
        try {
            this.httpRequestDurationHistogram = new promClient.Histogram({
                buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
                help: 'Duration of HTTP requests in seconds',
                labelNames: ['method', 'route', 'status_code'],
                name: 'http_request_duration_seconds',
                registers: [this.registry],
            });
            this.httpRequestCounter = new promClient.Counter({
                help: 'Total number of HTTP requests',
                labelNames: ['method', 'route', 'status_code'],
                name: 'http_requests_total',
                registers: [this.registry],
            });
            this.appInfoGauge = new promClient.Gauge({
                help: 'Application information',
                labelNames: ['version', 'environment'],
                name: 'app_info',
                registers: [this.registry],
            });
            this.appInfoGauge.labels(serviceLabels['version'], serviceLabels['environment']).set(1);
        }
        catch (error) {
            this.logger?.warn('Failed to initialize common Prometheus metrics', {
                context: 'MetricsService',
                error: error instanceof Error ? error.message : String(error),
            });
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
        this.createCounter('http_requests_total', 'Total number of HTTP requests');
        this.createHistogram('http_request_duration_seconds', 'Duration of HTTP requests in seconds');
    }
    setDefaultLabels() {
        const defaultLabels = this.getServiceLabels();
        this.registry.setDefaultLabels(defaultLabels);
    }
};
MetricsService = __decorate([
    Injectable(),
    __param(0, Optional()),
    __metadata("design:paramtypes", [Object])
], MetricsService);
export { MetricsService };
//# sourceMappingURL=metrics.service.js.map