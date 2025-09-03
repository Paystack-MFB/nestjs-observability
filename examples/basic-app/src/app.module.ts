import { Module } from '@nestjs/common';
import { LoggerService, ObservabilityModule } from '@paystackhq/nestjs-observability';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExampleService } from './example.service';
import { HealthController } from './health.controller';
import { LoggingService } from './logging.service';
import { PaymentService } from './payment.service';
import { UserService } from './user.service';

@Module({
  imports: [
    // Lightweight observability module - no configuration required
    // All configuration comes from environment variables (OTEL_*)
    // Provides: LoggerService, MetricsService, TracingService, MetricsController
    // Auto-configures: Global OpenTelemetry providers, AutoTraceInterceptor
    ObservabilityModule.forRoot(),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    UserService,
    PaymentService,
    ExampleService,
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
