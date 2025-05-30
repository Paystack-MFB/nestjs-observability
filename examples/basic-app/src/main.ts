import { NestFactory } from '@nestjs/core';
import { LoggerFactory } from 'nestjs-observability';
import { AppModule } from './app.module';

async function bootstrap() {
  // Configure the enhanced logger before creating the app
  const config = {
    serviceName: process.env.SERVICE_NAME || 'basic-example',
    serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    logging: {
      level: (process.env.LOG_LEVEL || 'info') as any,
      structuredLogging: process.env.NODE_ENV === 'production',
      consoleOutput: true,
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED !== 'false',
      endpoint: process.env.METRICS_ENDPOINT || '/metrics',
      defaultLabels: {
        service: process.env.SERVICE_NAME || 'basic-example',
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      defaultMetrics: true,
    },
    tracing: {
      enabled: process.env.TRACING_ENABLED !== 'false',
      sampler: {
        type: 'always_on' as const,
        ratio: 0.1,
      },
      exporter: {
        type: 'otlp' as const,
        endpoint: process.env.OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
        headers: process.env.OTLP_HEADERS ? JSON.parse(process.env.OTLP_HEADERS) : undefined,
      },
      instrumentations: {
        http: true,
        nestJs: true,
        winston: false,
      },
    },
  };

  // Configure global logger
  const logger = LoggerFactory.configureGlobalLogger(config);

  // Create the application with our enhanced logger
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  // Enable shutdown hooks for graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;

  logger.log(`Starting application in ${config.environment} mode`, 'Bootstrap');
  logger.log(`Service: ${config.serviceName} v${config.serviceVersion}`, 'Bootstrap');
  logger.log(`Metrics enabled: ${config.metrics.enabled}`, 'Bootstrap');
  logger.log(`Tracing enabled: ${config.tracing.enabled}`, 'Bootstrap');

  await app.listen(port);

  logger.log(`Application successfully started on port ${port}`, 'Bootstrap');
  logger.log(`Metrics available at: http://localhost:${port}${config.metrics.endpoint}`, 'Bootstrap');
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
