import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable shutdown hooks for graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  const serviceName = process.env.SERVICE_NAME || 'basic-example';
  const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
  const environment = process.env.NODE_ENV || 'development';

  console.log(`Starting application in ${environment} mode`);
  console.log(`Service: ${serviceName} v${serviceVersion}`);
  console.log(`Metrics enabled: ${process.env.METRICS_ENABLED !== 'false'}`);
  console.log(`Tracing enabled: ${process.env.TRACING_ENABLED !== 'false'}`);

  await app.listen(port);

  console.log(`Application successfully started on port ${port}`);
  console.log(`Metrics available at: http://localhost:${port}${process.env.METRICS_ENDPOINT || '/metrics'}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
