import { Injectable } from '@nestjs/common';
import { LoggerService } from 'nestjs-observability';

@Injectable()
export class AppService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('AppService');
  }

  getHello(): string {
    this.logger.log('Generating hello message');

    // Simulate some business logic
    const messages = ['Hello World!', 'Welcome to NestJS Observability!', 'Monitoring is working!'];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    this.logger.log({
      message: 'Generated hello response',
      selectedMessage: randomMessage,
      totalOptions: messages.length,
    });

    return randomMessage;
  }

  async doAsyncWork(): Promise<void> {
    this.logger.log('Starting async work');

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.logger.log('Async work completed');
  }
}
