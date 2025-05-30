var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Controller, Get, Header, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';
/**
 * Controller to expose Prometheus metrics endpoint
 */
let MetricsController = class MetricsController {
    metricsService;
    logger;
    constructor(metricsService, logger) {
        this.metricsService = metricsService;
        this.logger = logger;
    }
    /**
     * Endpoint that returns Prometheus metrics
     */
    async getMetrics() {
        try {
            // Get metrics from Prometheus registry
            const metrics = await this.metricsService.getMetrics();
            return metrics;
        }
        catch (error) {
            const metricsError = error;
            this.logger.error(`Error collecting metrics: ${metricsError.message}`, metricsError.stack ?? '', 'MetricsController');
            throw new HttpException(`Error collecting metrics: ${metricsError.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
__decorate([
    ApiOperation({ summary: 'Get Prometheus metrics' }),
    ApiResponse({
        description: 'Returns all metrics in Prometheus exposition format',
        status: 200,
    }),
    ApiResponse({
        description: 'Error collecting metrics',
        status: 500,
    }),
    Get(),
    Header('Content-Type', 'text/plain; charset=utf-8'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MetricsController.prototype, "getMetrics", null);
MetricsController = __decorate([
    ApiTags('observability'),
    Controller('metrics'),
    __metadata("design:paramtypes", [MetricsService,
        LoggerService])
], MetricsController);
export { MetricsController };
//# sourceMappingURL=metrics.controller.js.map