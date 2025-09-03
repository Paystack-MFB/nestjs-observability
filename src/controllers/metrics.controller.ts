import { Controller, Get, Header, HttpException, HttpStatus, Optional } from '@nestjs/common';

import { LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';
import { getServiceName } from '../register';

interface MetricsError extends Error {
  message: string;
  stack?: string;
}

/**
 * Controller to expose Prometheus metrics endpoint
 * Works with global OpenTelemetry meter provider and environment variable configuration
 */
@Controller('metrics')
export class MetricsController {
  private readonly isMetricsEnabled: boolean;
  private readonly metricsEndpoint: string;

  constructor(
    private readonly metricsService: MetricsService,
    @Optional() private readonly logger: LoggerService | undefined
  ) {
    // Check if metrics are enabled via environment variable
    this.isMetricsEnabled = this.getMetricsEnabledFromEnv();

    // Get custom metrics endpoint path from environment or use default
    this.metricsEndpoint = this.getMetricsEndpointFromEnv();

    if (this.isMetricsEnabled) {
      this.logger?.info(`Metrics endpoint enabled at: ${this.metricsEndpoint}`, { context: 'MetricsController' });
    } else {
      this.logger?.info('Metrics endpoint disabled via OTEL_METRICS_ENABLED environment variable', {
        context: 'MetricsController',
      });
    }
  }

  /**
   * Get available metric names (useful for debugging)
   */
  @Get('names')
  @Header('Content-Type', 'application/json')
  getMetricNames(): { enabled: boolean; metrics?: string[] } {
    if (!this.isMetricsEnabled) {
      return { enabled: false };
    }

    try {
      // Get the registry from MetricsService
      const registry = this.metricsService.getRegistry();
      const metrics = registry.getMetricsAsArray();
      const metricNames = metrics.map((metric) => metric.name);

      return {
        enabled: true,
        metrics: metricNames,
      };
    } catch (error: unknown) {
      const metricsError = error as MetricsError;
      this.logger?.error(`Error getting metric names: ${metricsError.message}`, {
        context: 'MetricsController',
        stack: metricsError.stack,
      });
      throw new HttpException(`Error getting metric names: ${metricsError.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Endpoint that returns Prometheus metrics
   * Only available if metrics are enabled via environment variables
   */
  @Get()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async getMetrics(): Promise<string> {
    // Check if metrics are disabled
    if (!this.isMetricsEnabled) {
      this.logger?.warn('Metrics endpoint accessed but metrics are disabled', { context: 'MetricsController' });
      throw new HttpException('Metrics endpoint is disabled', HttpStatus.NOT_FOUND);
    }

    try {
      // Get metrics from MetricsService (uses global meter provider)
      const metrics = await this.metricsService.getMetrics();

      this.logger?.debug('Metrics collected successfully', {
        context: 'MetricsController',
        metricsLength: metrics.length,
      });

      return metrics;
    } catch (error: unknown) {
      const metricsError = error as MetricsError;
      this.logger?.error(`Error collecting metrics: ${metricsError.message}`, {
        context: 'MetricsController',
        stack: metricsError.stack,
      });
      throw new HttpException(`Error collecting metrics: ${metricsError.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get metrics configuration info
   * @returns Configuration details
   */
  getMetricsConfig(): {
    enabled: boolean;
    endpoint: string;
    serviceName: string;
  } {
    return {
      enabled: this.isMetricsEnabled,
      endpoint: this.metricsEndpoint,
      serviceName: getServiceName(),
    };
  }

  /**
   * Health check endpoint for the metrics controller
   */
  @Get('health')
  @Header('Content-Type', 'application/json')
  getMetricsHealth(): { enabled: boolean; endpoint: string; status: string } {
    return {
      enabled: this.isMetricsEnabled,
      endpoint: this.metricsEndpoint,
      status: 'ok',
    };
  }

  /**
   * Check if metrics collection is working
   * @returns True if metrics can be collected
   */
  async isMetricsWorking(): Promise<boolean> {
    if (!this.isMetricsEnabled) {
      return false;
    }

    try {
      await this.metricsService.getMetrics();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if metrics are enabled via environment variable
   * @returns True if metrics are enabled
   */
  private getMetricsEnabledFromEnv(): boolean {
    const metricsEnabled = process.env['OTEL_METRICS_ENABLED'];

    // Default to enabled if not specified
    if (metricsEnabled === undefined) {
      return true;
    }

    // Parse boolean value
    return metricsEnabled.toLowerCase() === 'true' || metricsEnabled === '1';
  }

  /**
   * Get custom metrics endpoint path from environment variables
   * @returns Metrics endpoint path
   */
  private getMetricsEndpointFromEnv(): string {
    return process.env['OTEL_METRICS_ENDPOINT'] ?? '/metrics';
  }
}
