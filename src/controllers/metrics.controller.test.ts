import { HttpException, HttpStatus } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';
import { MetricsController } from './metrics.controller';

describe('MetricsController', () => {
  let controller: MetricsController;
  let mockMetricsService: any;
  let mockLoggerService: any;

  beforeEach(() => {
    // Clear environment variables
    delete process.env['OTEL_METRICS_ENABLED'];
    delete process.env['OTEL_METRICS_ENDPOINT'];
    
    // Mock MetricsService
    mockMetricsService = {
      getMetrics: vi.fn(),
      getRegistry: vi.fn(),
    };

    // Mock LoggerService
    mockLoggerService = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    // Directly instantiate controller with mocks
    controller = new MetricsController(mockMetricsService, mockLoggerService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env['OTEL_METRICS_ENABLED'];
    delete process.env['OTEL_METRICS_ENDPOINT'];
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should initialize with metrics enabled by default', () => {
      // MetricsController should be enabled by default
      const config = controller.getMetricsConfig();
      expect(config.enabled).toBe(true);
      expect(config.endpoint).toBe('/metrics');
    });

    it('should respect OTEL_METRICS_ENABLED environment variable', () => {
      process.env['OTEL_METRICS_ENABLED'] = 'false';

      // Create new controller instance to test environment variable
      const testController = new MetricsController(mockMetricsService, mockLoggerService);
      const config = testController.getMetricsConfig();
      
      expect(config.enabled).toBe(false);
    });

    it('should respect OTEL_METRICS_ENDPOINT environment variable', () => {
      process.env['OTEL_METRICS_ENDPOINT'] = '/custom-metrics';

      // Create new controller instance to test environment variable
      const testController = new MetricsController(mockMetricsService, mockLoggerService);
      const config = testController.getMetricsConfig();
      
      expect(config.endpoint).toBe('/custom-metrics');
    });
  });

  describe('getMetrics()', () => {
    it('should return metrics when enabled', async () => {
      const mockMetrics = '# HELP test_metric Test metric\ntest_metric 1';
      mockMetricsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(result).toBe(mockMetrics);
      expect(mockMetricsService.getMetrics).toHaveBeenCalledOnce();
    });

    it('should throw HttpException when metrics are disabled', async () => {
      process.env['OTEL_METRICS_ENABLED'] = 'false';

      // Create new controller with metrics disabled
      const testController = new MetricsController(mockMetricsService, mockLoggerService);

      await expect(testController.getMetrics()).rejects.toThrow(HttpException);
      await expect(testController.getMetrics()).rejects.toThrow('Metrics endpoint is disabled');
    });

    it('should handle metrics collection errors', async () => {
      const error = new Error('Metrics collection failed');
      mockMetricsService.getMetrics.mockRejectedValue(error);

      await expect(controller.getMetrics()).rejects.toThrow(HttpException);
      await expect(controller.getMetrics()).rejects.toThrow('Error collecting metrics: Metrics collection failed');

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Error collecting metrics: Metrics collection failed',
        { context: 'MetricsController', stack: error.stack }
      );
    });

    it('should handle errors without stack trace', async () => {
      const error = { message: 'Simple error', stack: undefined };
      mockMetricsService.getMetrics.mockRejectedValue(error);

      await expect(controller.getMetrics()).rejects.toThrow(HttpException);

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Error collecting metrics: Simple error',
        { context: 'MetricsController', stack: undefined }
      );
    });
  });

  describe('getMetricsHealth()', () => {
    it('should return health status with metrics enabled', async () => {
      const result = await controller.getMetricsHealth();

      expect(result).toEqual({
        status: 'ok',
        enabled: true,
        endpoint: '/metrics',
      });
    });

    it('should return health status with metrics disabled', async () => {
      process.env['OTEL_METRICS_ENABLED'] = 'false';

      // Create new controller with metrics disabled
      const testController = new MetricsController(mockMetricsService, mockLoggerService);
      const result = await testController.getMetricsHealth();

      expect(result).toEqual({
        status: 'ok',
        enabled: false,
        endpoint: '/metrics',
      });
    });
  });

  describe('getMetricNames()', () => {
    it('should return metric names when enabled', async () => {
      const mockRegistry = {
        getMetricsAsArray: vi.fn().mockReturnValue([
          { name: 'http_requests_total' },
          { name: 'http_request_duration_seconds' },
          { name: 'app_info' },
        ]),
      };
      mockMetricsService.getRegistry.mockReturnValue(mockRegistry);

      const result = await controller.getMetricNames();

      expect(result).toEqual({
        enabled: true,
        metrics: ['http_requests_total', 'http_request_duration_seconds', 'app_info'],
      });
      expect(mockMetricsService.getRegistry).toHaveBeenCalledOnce();
    });

    it('should return disabled status when metrics are disabled', async () => {
      process.env['OTEL_METRICS_ENABLED'] = 'false';

      // Create new controller with metrics disabled
      const testController = new MetricsController(mockMetricsService, mockLoggerService);
      const result = await testController.getMetricNames();

      expect(result).toEqual({ enabled: false });
      expect(mockMetricsService.getRegistry).not.toHaveBeenCalled();
    });

    it('should handle errors when getting metric names', async () => {
      const error = new Error('Registry error');
      mockMetricsService.getRegistry.mockImplementation(() => {
        throw error;
      });

      await expect(controller.getMetricNames()).rejects.toThrow(HttpException);
      await expect(controller.getMetricNames()).rejects.toThrow('Error getting metric names: Registry error');

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Error getting metric names: Registry error',
        { context: 'MetricsController', stack: error.stack }
      );
    });
  });

  describe('isMetricsWorking()', () => {
    it('should return true when metrics are working', async () => {
      mockMetricsService.getMetrics.mockResolvedValue('metrics data');

      const result = await controller.isMetricsWorking();

      expect(result).toBe(true);
      expect(mockMetricsService.getMetrics).toHaveBeenCalledOnce();
    });

    it('should return false when metrics are disabled', async () => {
      process.env['OTEL_METRICS_ENABLED'] = 'false';

      // Create new controller with metrics disabled
      const testController = new MetricsController(mockMetricsService, mockLoggerService);
      const result = await testController.isMetricsWorking();

      expect(result).toBe(false);
      expect(mockMetricsService.getMetrics).not.toHaveBeenCalled();
    });

    it('should return false when metrics collection fails', async () => {
      mockMetricsService.getMetrics.mockRejectedValue(new Error('Collection failed'));

      const result = await controller.isMetricsWorking();

      expect(result).toBe(false);
      expect(mockMetricsService.getMetrics).toHaveBeenCalledOnce();
    });
  });

  describe('getMetricsConfig()', () => {
    it('should return current configuration', () => {
      const config = controller.getMetricsConfig();

      expect(config).toEqual({
        enabled: true,
        endpoint: '/metrics',
        serviceName: 'nestjs-app',
      });
    });

    it('should include custom service name from environment', () => {
      process.env['OTEL_SERVICE_NAME'] = 'test-service';

      const config = controller.getMetricsConfig();

      expect(config.serviceName).toBe('test-service');

      // Clean up
      delete process.env['OTEL_SERVICE_NAME'];
    });
  });

  describe('Environment Variable Parsing', () => {
    it('should parse OTEL_METRICS_ENABLED=true', () => {
      process.env['OTEL_METRICS_ENABLED'] = 'true';

      const testController = new MetricsController(mockMetricsService, mockLoggerService);
      const config = testController.getMetricsConfig();
      
      expect(config.enabled).toBe(true);
    });

    it('should parse OTEL_METRICS_ENABLED=1', () => {
      process.env['OTEL_METRICS_ENABLED'] = '1';

      const testController = new MetricsController(mockMetricsService, mockLoggerService);
      const config = testController.getMetricsConfig();
      
      expect(config.enabled).toBe(true);
    });

    it('should parse OTEL_METRICS_ENABLED=false', () => {
      process.env['OTEL_METRICS_ENABLED'] = 'FALSE';

      const testController = new MetricsController(mockMetricsService, mockLoggerService);
      const config = testController.getMetricsConfig();
      
      expect(config.enabled).toBe(false);
    });
  });

  describe('Global OpenTelemetry Integration', () => {
    it('should work without configuration dependencies', () => {
      // Controller should work without any complex configuration
      expect(controller).toBeDefined();
      expect(controller.getMetricsConfig()).toBeDefined();
    });

    it('should use MetricsService with global meter provider', async () => {
      mockMetricsService.getMetrics.mockResolvedValue('# metrics data');

      await controller.getMetrics();

      // Should call MetricsService which uses global meter provider
      expect(mockMetricsService.getMetrics).toHaveBeenCalledOnce();
    });

    it('should handle logging without errors', () => {
      // Should be able to log without issues
      expect(() => {
        controller.getMetricsConfig();
      }).not.toThrow();
    });
  });
});