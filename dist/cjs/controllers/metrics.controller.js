"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsController = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const metrics_service_1 = require("../metrics/metrics.service");
const sdk_core_1 = require("../sdk-core");
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
            throw new common_1.HttpException(`Error getting metric names: ${metricsError.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getMetrics() {
        if (!this.isMetricsEnabled) {
            this.logger?.warn('Metrics endpoint accessed but metrics are disabled', { context: 'MetricsController' });
            throw new common_1.HttpException('Metrics endpoint is disabled', common_1.HttpStatus.NOT_FOUND);
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
            throw new common_1.HttpException(`Error collecting metrics: ${metricsError.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    getMetricsConfig() {
        return {
            enabled: this.isMetricsEnabled,
            endpoint: this.metricsEndpoint,
            serviceName: (0, sdk_core_1.getServiceName)(),
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
exports.MetricsController = MetricsController;
tslib_1.__decorate([
    (0, common_1.Get)('names'),
    (0, common_1.Header)('Content-Type', 'application/json'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Object)
], MetricsController.prototype, "getMetricNames", null);
tslib_1.__decorate([
    (0, common_1.Get)(),
    (0, common_1.Header)('Content-Type', 'text/plain; charset=utf-8'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], MetricsController.prototype, "getMetrics", null);
tslib_1.__decorate([
    (0, common_1.Get)('health'),
    (0, common_1.Header)('Content-Type', 'application/json'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Object)
], MetricsController.prototype, "getMetricsHealth", null);
exports.MetricsController = MetricsController = tslib_1.__decorate([
    (0, common_1.Controller)('metrics'),
    tslib_1.__param(1, (0, common_1.Optional)()),
    tslib_1.__metadata("design:paramtypes", [metrics_service_1.MetricsService, Object])
], MetricsController);
//# sourceMappingURL=metrics.controller.js.map