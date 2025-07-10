import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
      envFilePath: '.env',
    }),
    // Use factory pattern for proper dependency injection
    ObservabilityModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        serviceName: configService.get('SERVICE_NAME', 'basic-example'),
        serviceVersion: configService.get('SERVICE_VERSION', '1.0.0'),
        environment: configService.get('NODE_ENV', 'development'),
        // All environment variables like OTLP_TRACES_ENDPOINT, OTLP_HEADERS,
        // TRACING_ENABLED, METRICS_ENABLED, etc. are automatically loaded
      }),
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
