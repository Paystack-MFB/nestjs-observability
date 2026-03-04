import { Inject, Injectable } from '@nestjs/common';
import {
  LoggerService,
  MetricsService,
  NoTrace,
  Trace,
  TraceClass,
  TracingService,
} from '@paystackhq/nestjs-observability';

/**
 * Comprehensive example service demonstrating all observability features:
 * - Structured logging with context isolation
 * - Custom metrics creation (counter, gauge, histogram)
 * - Tracing decorators (@TraceClass, @Trace, @NoTrace)
 * - Service integration patterns
 */
@TraceClass({ spanNamePrefix: 'ExampleService' })
@Injectable()
export class ExampleService {
  private requestCounter: any;
  private processingGauge: any;
  private responseTimeHistogram: any;

  constructor(
    @Inject(LoggerService) private readonly logger: LoggerService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
    @Inject(TracingService) private readonly tracing: TracingService
  ) {
    // Set service context for all logging - ensure logger is available
    if (this.logger && typeof this.logger.setContext === 'function') {
      this.logger.setContext({ service: 'ExampleService' });
    }

    // Initialize custom metrics
    this.initializeMetrics();

    this.logger?.info('ExampleService initialized', {
      metricsInitialized: true,
      tracingEnabled: true,
    });
  }

  /**
   * Initialize custom business metrics
   */
  private initializeMetrics() {
    // Ensure metrics service is available before creating metrics
    if (!this.metrics || typeof this.metrics.createCounter !== 'function') {
      this.logger?.debug('Metrics service not available, skipping metrics initialization');
      return;
    }

    try {
      // Counter for tracking requests
      this.requestCounter = this.metrics.createCounter('example_requests_total', 'Total number of example requests');

      // Gauge for active processing
      this.processingGauge = this.metrics.createGauge(
        'example_active_operations',
        'Number of currently active operations'
      );

      // Histogram for response times
      this.responseTimeHistogram = this.metrics.createHistogram(
        'example_operation_duration_seconds',
        'Duration of example operations'
      );

      this.logger?.debug('Custom metrics initialized', {
        counter: 'example_requests_total',
        gauge: 'example_active_operations',
        histogram: 'example_operation_duration_seconds',
      });
    } catch (error) {
      this.logger?.debug('Failed to initialize metrics', { error: error.message });
    }
  }

  /**
   * Simple operation demonstrating basic tracing and logging
   */
  @Trace('simpleOperation')
  async simpleOperation(data: any): Promise<any> {
    const operationId = Math.random().toString(36).substring(7);

    // Create child logger with operation context
    const operationLogger = this.logger.createChildLogger();
    operationLogger.addContext('operationId', operationId);
    operationLogger.addContext('operation', 'simpleOperation');

    operationLogger.info('Starting simple operation', {
      inputData: this.sanitizeData(data),
      timestamp: new Date().toISOString(),
    });

    // Increment request counter
    this.requestCounter?.add(1, { operation: 'simple', status: 'started' });

    try {
      // Simulate processing
      await this.delay(100 + Math.random() * 200);

      const result = {
        operationId,
        status: 'completed',
        data: `Processed: ${JSON.stringify(data)}`,
        processedAt: new Date().toISOString(),
      };

      operationLogger.info('Simple operation completed', {
        result: this.sanitizeData(result),
        duration: '~200ms',
      });

      this.requestCounter?.add(1, { operation: 'simple', status: 'success' });

      return result;
    } catch (error) {
      operationLogger.error('Simple operation failed', {
        error: error.message,
        operationId,
      });

      this.requestCounter?.add(1, { operation: 'simple', status: 'error' });
      throw error;
    }
  }

  /**
   * Complex operation demonstrating metrics and manual tracing
   */
  async complexOperation(userId: string, data: any): Promise<any> {
    const startTime = Date.now();
    const operationId = Math.random().toString(36).substring(7);

    // Create operation-specific logger
    const operationLogger = this.logger.createChildLogger();
    operationLogger.setContext({
      operationId,
      userId,
      operation: 'complexOperation',
      correlationId: `complex-${operationId}`,
    });

    operationLogger.info('Starting complex operation', {
      userId,
      inputSize: JSON.stringify(data).length,
      startTime: new Date().toISOString(),
    });

    // Update metrics - increment processing gauge
    // Note: For observableGauge, we would set up a callback, but for simplicity using counter pattern
    this.requestCounter?.add(1, { operation: 'complex', status: 'started' });

    // Create manual span with custom attributes
    const span = this.tracing.startSpan('complex-operation');

    try {
      // Step 1: Validation
      operationLogger.info('Validating input data', { step: 'validation' });
      await this.validateComplexData(data, operationLogger);
      span.setAttributes({ 'validation.status': 'passed' });

      // Step 2: Processing
      operationLogger.info('Processing data', { step: 'processing' });
      const processedData = await this.processComplexData(data, operationLogger);
      span.setAttributes({ 'processing.status': 'completed' });

      // Step 3: Business logic
      operationLogger.info('Applying business logic', { step: 'business-logic' });
      const result = await this.applyBusinessLogic(processedData, operationLogger);
      span.setAttributes({ 'business-logic.status': 'applied' });

      const duration = Date.now() - startTime;

      operationLogger.info('Complex operation completed successfully', {
        operationId,
        userId,
        duration: `${duration}ms`,
        resultSize: JSON.stringify(result).length,
        completedAt: new Date().toISOString(),
      });

      // Update metrics
      this.requestCounter?.add(1, { operation: 'complex', status: 'success' });
      this.responseTimeHistogram?.record(duration / 1000, { operation: 'complex' });

      span.setAttributes({
        'operation.status': 'success',
        'operation.duration': duration,
        'result.size': JSON.stringify(result).length,
      });

      return {
        operationId,
        userId,
        result,
        duration,
        status: 'success',
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      operationLogger.error('Complex operation failed', {
        operationId,
        userId,
        error: error.message,
        duration: `${duration}ms`,
        failedAt: new Date().toISOString(),
      });

      // Update error metrics
      this.requestCounter?.add(1, { operation: 'complex', status: 'error' });
      this.responseTimeHistogram?.record(duration / 1000, { operation: 'complex' });

      // Record error in span
      span.recordException(error);
      span.setAttributes({
        'operation.status': 'error',
        'operation.duration': duration,
        'error.message': error.message,
      });

      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Concurrent operation demonstrating context isolation
   */
  async concurrentOperations(requests: any[]): Promise<any[]> {
    // Validate that requests is actually an array to prevent type confusion attacks
    if (!Array.isArray(requests)) {
      throw new Error('Invalid input: requests must be an array');
    }

    const batchId = Math.random().toString(36).substring(7);

    this.logger.info('Starting concurrent operations', {
      batchId,
      requestCount: requests.length,
      startTime: new Date().toISOString(),
    });

    // Process all requests concurrently
    const promises = requests.map(async (request, index) => {
      // Each concurrent operation gets its own logger context
      const operationLogger = this.logger.createChildLogger();
      operationLogger.setContext({
        batchId,
        requestIndex: index,
        operationId: `${batchId}-${index}`,
      });

      operationLogger.info('Processing concurrent request', {
        requestIndex: index,
        requestData: this.sanitizeData(request),
      });

      try {
        // Simulate variable processing time
        await this.delay(50 + Math.random() * 150);

        const result = {
          index,
          batchId,
          data: `Processed: ${JSON.stringify(request)}`,
          processedAt: new Date().toISOString(),
        };

        operationLogger.info('Concurrent request completed', {
          requestIndex: index,
          result: this.sanitizeData(result),
        });

        return result;
      } catch (error) {
        operationLogger.error('Concurrent request failed', {
          requestIndex: index,
          error: error.message,
        });
        throw error;
      }
    });

    const results = await Promise.all(promises);

    this.logger.info('All concurrent operations completed', {
      batchId,
      completedCount: results.length,
      completedAt: new Date().toISOString(),
    });

    return results;
  }

  /**
   * Sensitive operation demonstrating @NoTrace decorator
   */
  @NoTrace()
  async sensitiveOperation(sensitiveData: any): Promise<any> {
    // This operation won't be traced due to @NoTrace decorator
    this.logger.info('Processing sensitive operation', {
      note: 'This operation is not traced for security reasons',
      dataType: typeof sensitiveData,
    });

    // Simulate processing
    await this.delay(100);

    return {
      status: 'processed',
      message: 'Sensitive data processed securely',
      processedAt: new Date().toISOString(),
    };
  }

  /**
   * Health check operation
   */
  @Trace('healthCheck')
  async healthCheck(): Promise<any> {
    this.logger.debug('Performing health check');

    const metrics = {
      totalRequests: await this.getTotalRequestCount(),
      activeOperations: await this.getActiveOperationCount(),
      avgResponseTime: await this.getAverageResponseTime(),
    };

    this.logger.debug('Health check completed', { metrics });

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ExampleService',
      metrics,
    };
  }

  // Private helper methods

  private async validateComplexData(data: any, logger: LoggerService): Promise<void> {
    logger.debug('Validating complex data structure');

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data structure');
    }

    // Simulate validation time
    await this.delay(50);

    logger.debug('Data validation passed');
  }

  private async processComplexData(data: any, logger: LoggerService): Promise<any> {
    logger.debug('Processing complex data');

    // Simulate complex processing
    await this.delay(100 + Math.random() * 200);

    const processed = {
      ...data,
      processed: true,
      processedAt: new Date().toISOString(),
      processingId: Math.random().toString(36).substring(7),
    };

    logger.debug('Data processing completed', {
      processingId: processed.processingId,
    });

    return processed;
  }

  private async applyBusinessLogic(data: any, logger: LoggerService): Promise<any> {
    logger.debug('Applying business logic');

    // Simulate business logic application
    await this.delay(75);

    const result = {
      ...data,
      businessRulesApplied: true,
      score: Math.floor(Math.random() * 100),
      category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
      appliedAt: new Date().toISOString(),
    };

    logger.debug('Business logic applied', {
      score: result.score,
      category: result.category,
    });

    return result;
  }

  private async getTotalRequestCount(): Promise<number> {
    // In a real app, this would query metrics storage
    return Math.floor(Math.random() * 1000);
  }

  private async getActiveOperationCount(): Promise<number> {
    // In a real app, this would check current gauge value
    return Math.floor(Math.random() * 10);
  }

  private async getAverageResponseTime(): Promise<number> {
    // In a real app, this would calculate from histogram
    return Math.random() * 500;
  }

  private sanitizeData(data: any): any {
    // Simple data sanitization for logging
    const sanitized = JSON.parse(JSON.stringify(data));

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key'];

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      for (const key in obj) {
        if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          obj[key] = sanitizeObject(obj[key]);
        }
      }

      return obj;
    };

    return sanitizeObject(sanitized);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
