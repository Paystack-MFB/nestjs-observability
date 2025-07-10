import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerService, ObservabilityModule } from '@paystackhq/nestjs-observability';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { LoggingService } from './logging.service';
import { PaymentService } from './payment.service';
import { UserService } from './user.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ObservabilityModule.forRoot({
      serviceName: process.env.SERVICE_NAME || 'basic-example',
      serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        consoleOutput: true,
        otlpExport: {
          enabled: process.env.OTLP_LOGS_ENABLED === 'true',
          endpoint: process.env.OTLP_LOGS_ENDPOINT || 'http://localhost:4318/v1/logs',
        },
      },
      metrics: {
        enabled: process.env.METRICS_ENABLED !== 'false',
        endpoint: process.env.METRICS_ENDPOINT || '/metrics',
        defaultMetrics: true,
        defaultLabels: {
          service: process.env.SERVICE_NAME || 'basic-example',
          version: process.env.SERVICE_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
        },
      },
      tracing: {
        attributeSanitization: {
          additionalSensitivePatterns: [/custom-secret/i],
          enabled: true,
          redactedPlaceholder: '[REDACTED]',
        },
        enabled: true,
        exporter: {
          endpoint: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] || 'http://localhost:4317',
          type: 'otlp',
        },
        instrumentations: {
          autoInstrumentations: true,
          disabled: [],
          overrides: {},
        },
        sampler: {
          type: 'always_on',
        },
      },
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    UserService,
    PaymentService,
    {
      provide: LoggingService,
      useFactory: (loggerService: LoggerService) => {
        return new LoggingService(loggerService);
      },
      inject: [LoggerService],
    },
  ],
})
export class AppModule {}
