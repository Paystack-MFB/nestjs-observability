import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ObservabilityModule } from 'nestjs-observability';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Enable configuration from environment variables
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Configure observability with environment-based configuration
    ObservabilityModule.forRoot({
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
    }),

    // Feature modules
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
