import { __decorate, __metadata, __param } from "tslib";
import { Controller, Get, Header, HttpException, HttpStatus, Optional } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service.js';
import { getServiceName } from '../sdk-core.js';
let MetricsController = class MetricsController {
    metricsService;
    logger;
    isMetricsEnabled;
    metricsEndpoint;
    constructor(metricsService, logger) {
        this.metricsService = metricsService;
        this.logger = logger;
        this.isMetricsEnabled = this.getMetricsEnabledFromEnv();
        this.metricsEndpoint = this.getMetricsEndpointFromEnv();
        if (this.isMetricsEnabled) {
            this.logger?.info(`Metrics endpoint enabled at: ${this.metricsEndpoint}`, { context: 'MetricsController' });
        }
        else {
            this.logger?.info('Metrics endpoint disabled via OTEL_METRICS_ENABLED environment variable', {
                context: 'MetricsController',
            });
        }
    }
    getMetricNames() {
        if (!this.isMetricsEnabled) {
            return { enabled: false };
        }
        try {
            const registry = this.metricsService.getRegistry();
            const metrics = registry.getMetricsAsArray();
            const metricNames = metrics.map((metric) => metric.name);
            return {
                enabled: true,
                metrics: metricNames,
            };
        }
        catch (error) {
            const metricsError = error;
            this.logger?.error(`Error getting metric names: ${metricsError.message}`, {
                context: 'MetricsController',
                stack: metricsError.stack,
            });
            throw new HttpException(`Error getting metric names: ${metricsError.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getMetrics() {
        if (!this.isMetricsEnabled) {
            this.logger?.warn('Metrics endpoint accessed but metrics are disabled', { context: 'MetricsController' });
            throw new HttpException('Metrics endpoint is disabled', HttpStatus.NOT_FOUND);
        }
        try {
            const metrics = await this.metricsService.getMetrics();
            this.logger?.debug('Metrics collected successfully', {
                context: 'MetricsController',
                metricsLength: metrics.length,
            });
            return metrics;
        }
        catch (error) {
            const metricsError = error;
            this.logger?.error(`Error collecting metrics: ${metricsError.message}`, {
                context: 'MetricsController',
                stack: metricsError.stack,
            });
            throw new HttpException(`Error collecting metrics: ${metricsError.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    getMetricsConfig() {
        return {
            enabled: this.isMetricsEnabled,
            endpoint: this.metricsEndpoint,
            serviceName: getServiceName(),
        };
    }
    getMetricsHealth() {
        return {
            enabled: this.isMetricsEnabled,
            endpoint: this.metricsEndpoint,
            status: 'ok',
        };
    }
    async isMetricsWorking() {
        if (!this.isMetricsEnabled) {
            return false;
        }
        try {
            await this.metricsService.getMetrics();
            return true;
        }
        catch {
            return false;
        }
    }
    getMetricsEnabledFromEnv() {
        const metricsEnabled = process.env['OTEL_METRICS_ENABLED'];
        if (metricsEnabled === undefined) {
            return true;
        }
        return metricsEnabled.toLowerCase() === 'true' || metricsEnabled === '1';
    }
    getMetricsEndpointFromEnv() {
        return process.env['OTEL_METRICS_ENDPOINT'] ?? '/metrics';
    }
};
__decorate([
    Get('names'),
    Header('Content-Type', 'application/json'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], MetricsController.prototype, "getMetricNames", null);
__decorate([
    Get(),
    Header('Content-Type', 'text/plain; charset=utf-8'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MetricsController.prototype, "getMetrics", null);
__decorate([
    Get('health'),
    Header('Content-Type', 'application/json'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], MetricsController.prototype, "getMetricsHealth", null);
MetricsController = __decorate([
    Controller('metrics'),
    __param(1, Optional()),
    __metadata("design:paramtypes", [MetricsService, Object])
], MetricsController);
export { MetricsController };
//# sourceMappingURL=metrics.controller.js.map