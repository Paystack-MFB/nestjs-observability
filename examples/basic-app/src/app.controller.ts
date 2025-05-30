import { Controller, Get } from '@nestjs/common';
import { LoggerService } from 'nestjs-observability';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: LoggerService
  ) {
    this.logger.setContext('AppController');
  }

  @Get()
  getHello(): string {
    this.logger.log('Hello endpoint called');
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    this.logger.log('Health check requested');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
