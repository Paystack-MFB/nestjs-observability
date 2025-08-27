import { NestFactory } from '@nestjs/core';
import { LoggerService } from '@paystackhq/nestjs-observability';
import 'reflect-metadata';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get the enhanced LoggerService from the app
  const logger = app.get(LoggerService);

  // Set global context for the logger
  logger.setContext({ component: 'Bootstrap', service: 'basic-example' });

  // Enable shutdown hooks for graceful shutdown
  app.enableShutdownHooks();

  // Use OpenTelemetry standard environment variables
  const port = process.env.PORT || 3000;
  const serviceName = process.env.OTEL_SERVICE_NAME || 'nestjs-observability-example';
  const serviceVersion = process.env.OTEL_SERVICE_VERSION || '1.0.0';
  const environment = process.env.NODE_ENV || 'development';

  // Log startup information using enhanced logger
  logger.log('Starting NestJS application', {
    environment,
    serviceName,
    serviceVersion,
    port,
  });

  await app.listen(port);

  logger.log('Application started successfully', {
    port,
    metricsUrl: `http://localhost:${port}${process.env.OTEL_METRICS_ENDPOINT || '/metrics'}`,
    healthUrl: `http://localhost:${port}/health`,
    startupTime: new Date().toISOString(),
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
