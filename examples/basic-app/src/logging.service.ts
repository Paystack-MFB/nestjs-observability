import { Injectable } from '@nestjs/common';
import { LoggerService } from '@paystackhq/nestjs-observability';

@Injectable()
export class LoggingService {
  private readonly logger: LoggerService;

  constructor(private readonly loggerService: LoggerService) {
    // Create child logger and set context for this service - ensure logger is available
    if (this.loggerService && typeof this.loggerService.createChildLogger === 'function') {
      this.logger = this.loggerService.createChildLogger();
      this.logger.setContext({ service: 'LoggingService' });
    } else {
      // Fallback if logger service is not available
      this.logger = this.loggerService;
    }
  }

  // ==== BASIC LOGGING EXAMPLES ====

  async logInfo(message: string): Promise<void> {
    this.logger.info(`Processing info: ${message}`);

    // Simulate some processing
    await this.delay(5);
  }

  async logError(error: string, context?: string): Promise<void> {
    // Log error with optional context
    this.logger.error(`Error occurred: ${error}`, { context: context || 'LoggingService' });

    // Log an actual Error object (shows stack trace)
    const errorObj = new Error(error);
    this.logger.error(errorObj, { context: 'ErrorHandler' });

    // Simulate error processing
    await this.delay(10);
  }

  async logDebug(message: string): Promise<void> {
    this.logger.debug(`Debug information: ${message}`);
    await this.delay(2);
  }

  async logWarning(message: string): Promise<void> {
    this.logger.warn(`Warning: ${message}`);
    await this.delay(3);
  }

  // ==== STRUCTURED LOGGING EXAMPLES ====

  async logActivity(activity: string, userId?: string): Promise<void> {
    // Log with structured data
    this.logger.info('User activity tracked', {
      activity,
      userId,
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'activity_tracker',
        version: '1.0.0',
      },
    });

    await this.delay(8);
  }

  async logUserAction(action: string, userId: string, metadata?: Record<string, any>): Promise<void> {
    // Example of rich structured logging
    this.logger.info(`User performed action: ${action}`, {
      action,
      userId,
      timestamp: new Date().toISOString(),
      sessionId: `session-${Date.now()}`,
      context: 'UserActions',
      ...metadata,
    });

    await this.delay(5);
  }

  // ==== CONTEXT MANAGEMENT EXAMPLES ====

  async demonstrateContextPersistence(): Promise<void> {
    // Create a child logger with persistent context
    const requestLogger = this.logger.createChildLogger();
    requestLogger.setContext({
      context: 'RequestHandler',
      requestId: `req-${Date.now()}`,
      userId: 'user-123',
      operation: 'request-processing',
    });

    // All subsequent logs from this logger will include the context
    requestLogger.info('Processing user request');
    requestLogger.info('Validating input parameters');
    requestLogger.info('Request processing completed');

    await this.delay(15);
  }

  async demonstrateContextUpdates(): Promise<void> {
    // Demonstrate context management using child loggers
    const operationLogger = this.logger.createChildLogger();
    operationLogger.setContext({
      context: 'OperationManager',
      sessionId: `session-${Date.now()}`,
      operationId: 'op-456',
    });

    // These logs will include the session context
    operationLogger.info('Starting operation');
    operationLogger.info('Operation in progress');

    // Create a new child logger with additional context
    const validationLogger = operationLogger.createChildLogger();
    validationLogger.addContext('phase', 'validation');
    validationLogger.addContext('attempts', 1);
    validationLogger.addContext('context', 'ValidationPhase');

    validationLogger.info('Validation phase started');

    // Use the original logger for logs without additional context
    this.logger.info('Operation completed, no additional context');

    await this.delay(20);
  }

  // ==== PERFORMANCE MONITORING EXAMPLES ====

  async logPerformanceMetrics(operation: string, duration: number): Promise<void> {
    this.logger.info(`Performance metric recorded`, {
      operation,
      duration,
      unit: 'ms',
      threshold: 1000,
      status: duration > 1000 ? 'slow' : 'normal',
      timestamp: new Date().toISOString(),
      context: 'PerformanceMonitor',
    });

    await this.delay(3);
  }

  // ==== ERROR HANDLING EXAMPLES ====

  async logExceptionWithContext(error: Error, context: Record<string, any>): Promise<void> {
    // Create a child logger with error context
    const errorLogger = this.logger.createChildLogger();
    errorLogger.setContext({
      context: 'ErrorHandler',
      errorId: `error-${Date.now()}`,
      severity: 'high',
      ...context,
    });

    // Log the error with full context
    errorLogger.error(error);

    // Log additional debug information
    errorLogger.debug('Additional error context', {
      stack: error.stack,
      cause: error.cause,
      timestamp: new Date().toISOString(),
    });

    await this.delay(12);
  }

  // ==== BUSINESS LOGIC EXAMPLES ====

  async logBusinessEvent(eventType: string, eventData: Record<string, any>): Promise<void> {
    this.logger.info(`Business event: ${eventType}`, {
      eventType,
      eventData,
      timestamp: new Date().toISOString(),
      businessUnit: 'payments',
      version: '2.0.0',
      context: 'BusinessEvents',
    });

    await this.delay(6);
  }

  async logSecurityEvent(event: string, userId: string, ipAddress: string): Promise<void> {
    // Security events should be logged with high priority
    const securityLogger = this.logger.createChildLogger();
    securityLogger.setContext({
      context: 'SecurityMonitor',
      securityLevel: 'high',
      eventCategory: 'authentication',
    });

    securityLogger.warn(`Security event: ${event}`, {
      event,
      userId,
      ipAddress,
      timestamp: new Date().toISOString(),
      requiresReview: true,
    });

    await this.delay(8);
  }

  // ==== COMPREHENSIVE LOGGING EXAMPLE ====

  async demonstrateComprehensiveLogging(): Promise<void> {
    // Create a transaction logger with full context
    const transactionLogger = this.logger.createChildLogger();
    transactionLogger.setContext({
      context: 'TransactionProcessor',
      transactionId: `txn-${Date.now()}`,
      userId: 'user-789',
      merchantId: 'merchant-456',
      amount: 99.99,
      currency: 'USD',
    });

    // Log transaction start
    transactionLogger.info('Transaction processing started');

    // Log validation steps
    transactionLogger.debug('Validating transaction parameters', {
      validationSteps: ['amount', 'currency', 'merchant', 'user'],
    });

    // Log business logic
    transactionLogger.info('Processing payment', {
      paymentMethod: 'credit_card',
      processor: 'stripe',
      processingTime: 250,
    });

    // Log success
    transactionLogger.info('Transaction completed successfully', {
      result: 'success',
      confirmationCode: 'conf-123456',
      processingTime: 500,
    });

    await this.delay(25);
  }

  // Utility method for simulating processing delays
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
