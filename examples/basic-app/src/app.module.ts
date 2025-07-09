import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerService, ObservabilityModule } from 'nestjs-observability';
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
        enabled: process.env.TRACING_ENABLED !== 'false',
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
        // New argument sanitization configuration
        argumentSanitization: {
          enabled: process.env.ARGUMENT_SANITIZATION_ENABLED !== 'false',
          maxStringLength: process.env.ARGUMENT_SANITIZATION_MAX_LENGTH
            ? parseInt(process.env.ARGUMENT_SANITIZATION_MAX_LENGTH, 10)
            : 100,
          redactedPlaceholder: process.env.ARGUMENT_SANITIZATION_PLACEHOLDER || '[REDACTED]',
          identifierFields: process.env.ARGUMENT_SANITIZATION_IDENTIFIER_FIELDS
            ? process.env.ARGUMENT_SANITIZATION_IDENTIFIER_FIELDS.split(',').map((s) => s.trim())
            : ['id', 'userId', 'name', 'email', 'type', 'status'],
          additionalSensitivePatterns: process.env.ARGUMENT_SANITIZATION_ADDITIONAL_PATTERNS
            ? process.env.ARGUMENT_SANITIZATION_ADDITIONAL_PATTERNS.split(',').map(
                (pattern) => new RegExp(pattern.trim(), 'i')
              )
            : [/api[_-]?key/i, /secret/i, /token/i, /password/i],
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
