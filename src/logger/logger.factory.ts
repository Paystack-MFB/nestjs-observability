import { Logger } from '@nestjs/common';

import { ObservabilityConfig } from '../config/observability.config';
import { LoggerService } from './logger.service';

/**
 * Factory for creating logger instances with observability features
 * Provides a bridge between NestJS's native logger and our enhanced logger
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class LoggerFactory {
  /**
   * Configure the global NestJS logger to use our enhanced logger
   * This should be called in main.ts or in your app module
   */
  static configureGlobalLogger(config: ObservabilityConfig): LoggerService {
    const logger = new LoggerService(config);

    // Set the global logger for NestJS
    Logger.overrideLogger(logger);

    return logger;
  }

  /**
   * Create a logger service instance
   */
  static create(config: ObservabilityConfig): LoggerService {
    return new LoggerService(config);
  }

  /**
   * Create a child logger with specific context
   */
  static createChild(
    config: ObservabilityConfig,
    context: string,
    additionalContext?: Record<string, unknown>
  ): LoggerService {
    const logger = new LoggerService(config);
    return logger.createChildLogger(context, additionalContext);
  }

  /**
   * Create a logger with the service name as context
   */
  static createForService(config: ObservabilityConfig, serviceName: string): LoggerService {
    const logger = new LoggerService(config);
    logger.setContext(serviceName);
    return logger;
  }
}
