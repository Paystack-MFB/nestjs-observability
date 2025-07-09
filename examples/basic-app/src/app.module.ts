import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ObservabilityModule } from 'nestjs-observability';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
        structuredLogging: process.env.STRUCTURED_LOGGING === 'true',
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
        enabled: process.env.TRACING_ENABLED !== 'false',
        autoInstrumentation: {
          enabled: process.env.AUTO_INSTRUMENTATION_ENABLED !== 'false',
          captureArguments: process.env.CAPTURE_ARGUMENTS !== 'false',
        },
        sampler: {
          type: 'always_on' as const,
          ratio: 1.0,
        },
        exporter: {
          type: 'otlp' as const,
          endpoint: process.env.OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
          headers: process.env.OTLP_HEADERS ? JSON.parse(process.env.OTLP_HEADERS) : undefined,
        },
        instrumentations: {
          autoInstrumentations: process.env.TRACING_AUTO_INSTRUMENTATIONS !== 'false',
          disabled: process.env.TRACING_DISABLED_INSTRUMENTATIONS
            ? process.env.TRACING_DISABLED_INSTRUMENTATIONS.split(',').map((s) => s.trim())
            : [],
          overrides: process.env.TRACING_INSTRUMENTATION_OVERRIDES
            ? JSON.parse(process.env.TRACING_INSTRUMENTATION_OVERRIDES)
            : {},
        },
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, UserService, PaymentService, LoggingService],
})
export class AppModule {}
