import { LoggerService } from './logger.service';
import { ObservabilityConfig } from '../config/observability.config';
/**
 * Factory for creating logger instances with observability features
 * Provides a bridge between NestJS's native logger and our enhanced logger
 */
export declare class LoggerFactory {
    /**
     * Create a logger service instance
     */
    static create(config: ObservabilityConfig): LoggerService;
    /**
     * Create a child logger with specific context
     */
    static createChild(config: ObservabilityConfig, context: string, additionalContext?: Record<string, any>): LoggerService;
    /**
     * Configure the global NestJS logger to use our enhanced logger
     * This should be called in main.ts or in your app module
     */
    static configureGlobalLogger(config: ObservabilityConfig): LoggerService;
    /**
     * Create a logger with the service name as context
     */
    static createForService(config: ObservabilityConfig, serviceName: string): LoggerService;
}
//# sourceMappingURL=logger.factory.d.ts.map