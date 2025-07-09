import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);

  async logInfo(message: string): Promise<void> {
    this.logger.log(`INFO: ${message}`);

    // Simulate logging delay
    await this.delay(5);
  }

  async logError(error: string, context?: string): Promise<void> {
    this.logger.error(`ERROR: ${error}`, context);

    // Simulate error logging processing
    await this.delay(10);
  }

  async logDebug(message: string): Promise<void> {
    this.logger.debug(`DEBUG: ${message}`);

    // Simulate debug logging
    await this.delay(2);
  }

  async logWarning(message: string): Promise<void> {
    this.logger.warn(`WARNING: ${message}`);

    // Simulate warning logging
    await this.delay(3);
  }

  async logActivity(activity: string, userId?: string): Promise<void> {
    const logMessage = userId ? `ACTIVITY: ${activity} (User: ${userId})` : `ACTIVITY: ${activity}`;

    this.logger.log(logMessage);

    // Simulate activity logging
    await this.delay(8);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
