import { Logger } from '@nestjs/common';
import { LoggerService } from './logger.service';
/**
 * Factory for creating logger instances with observability features
 * Provides a bridge between NestJS's native logger and our enhanced logger
 */
export class LoggerFactory {
    /**
     * Create a logger service instance
     */
    static create(config) {
        return new LoggerService(config);
    }
    /**
     * Create a child logger with specific context
     */
    static createChild(config, context, additionalContext) {
        const logger = new LoggerService(config);
        return logger.createChildLogger(context, additionalContext);
    }
    /**
     * Configure the global NestJS logger to use our enhanced logger
     * This should be called in main.ts or in your app module
     */
    static configureGlobalLogger(config) {
        const logger = new LoggerService(config);
        // Set the global logger for NestJS
        Logger.overrideLogger(logger);
        return logger;
    }
    /**
     * Create a logger with the service name as context
     */
    static createForService(config, serviceName) {
        const logger = new LoggerService(config);
        logger.setContext(serviceName);
        return logger;
    }
}
//# sourceMappingURL=logger.factory.js.map