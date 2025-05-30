import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  getHello(): string {
    this.logger.log('Generating hello message');

    // Simulate some business logic
    const messages = ['Hello World!', 'Welcome to NestJS Observability!', 'Monitoring is working!'];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    this.logger.log(`Generated hello response: ${randomMessage} (${messages.length} options)`);

    return randomMessage;
  }

  async doAsyncWork(): Promise<void> {
    this.logger.log('Starting async work');

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.logger.log('Async work completed');
  }
}
