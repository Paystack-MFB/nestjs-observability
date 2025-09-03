import { Injectable } from '@nestjs/common';
import { Trace, LoggerService } from '@paystackhq/nestjs-observability';

@Injectable()
export class AppService {
  constructor(private readonly logger: LoggerService) {}

  @Trace()
  async getHello(): Promise<string> {
    this.logger.info('Getting hello message');

    // Simulate some async work
    await this.delay(10);

    return 'Hello World!';
  }

  @Trace()
  async getStatus(): Promise<any> {
    this.logger.info('Getting application status');

    // Simulate status check
    await this.delay(20);

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Trace()
  async performComplexOperation(): Promise<any> {
    this.logger.info('Performing complex operation');

    // Simulate complex processing
    await this.delay(100);

    return {
      result: 'Complex operation completed',
      processedAt: new Date().toISOString(),
      duration: '100ms',
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
