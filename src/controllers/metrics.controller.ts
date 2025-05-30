import { Controller, Get, Header, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';

interface MetricsError extends Error {
  message: string;
  stack?: string;
}

/**
 * Controller to expose Prometheus metrics endpoint
 */
@ApiTags('observability')
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly logger: LoggerService
  ) {}

  /**
   * Endpoint that returns Prometheus metrics
   */
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  @ApiResponse({
    description: 'Returns all metrics in Prometheus exposition format',
    status: 200,
  })
  @ApiResponse({
    description: 'Error collecting metrics',
    status: 500,
  })
  @Get()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async getMetrics(): Promise<string> {
    try {
      // Get metrics from Prometheus registry
      const metrics = await this.metricsService.getMetrics();
      return metrics;
    } catch (error: unknown) {
      const metricsError = error as MetricsError;
      this.logger.error(
        `Error collecting metrics: ${metricsError.message}`,
        metricsError.stack ?? '',
        'MetricsController'
      );
      throw new HttpException(`Error collecting metrics: ${metricsError.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
