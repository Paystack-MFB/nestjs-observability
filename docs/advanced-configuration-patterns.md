# Advanced Configuration Patterns

This guide covers advanced patterns for configuring the `ObservabilityModule` using environment variables and dynamic configuration for complex scenarios.

## Key Environment Variables

This library uses several key environment variables for configuration:

- **`OTEL_SERVICE_ENV`**: The environment your service is running in (production, staging, development, test). This is used instead of `NODE_ENV` for observability-specific configuration.
- **`APP_NAME`**: The name of your application/service
- **`OTEL_SERVICE_VERSION`**: The version of your service
- **Standard OpenTelemetry environment variables**: `OTEL_*` variables for configuring exporters, sampling, etc.

## Dynamic Environment Variable Configuration

For complex scenarios, you can programmatically set environment variables based on multiple services and async operations:

```typescript
@Injectable()
export class ObservabilityConfigService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService
  ) {}

  async onModuleInit() {
    // Wait for database connection and set resource attributes
    const dbConfig = await this.databaseService.getConfig();

    // Set OpenTelemetry environment variables dynamically
    process.env.OTEL_SERVICE_NAME = this.configService.get('APP_NAME', 'unknown');
    process.env.OTEL_SERVICE_VERSION = this.configService.get('SERVICE_VERSION', '1.0.0');

    // Build resource attributes from multiple sources
    const resourceAttributes = [
      `service.name=${process.env.OTEL_SERVICE_NAME}`,
      `service.version=${process.env.OTEL_SERVICE_VERSION}`,
      `environment=${this.configService.get('OTEL_SERVICE_ENV', 'development')}`,
      `database.name=${dbConfig.name}`,
      `database.host=${dbConfig.host}`,
      `service.instance.id=${dbConfig.host}-${process.pid}`,
    ];

    process.env.OTEL_RESOURCE_ATTRIBUTES = resourceAttributes.join(',');

    // Environment-specific configuration
    this.configureByEnvironment();
  }

  private configureByEnvironment() {
    const environment = this.configService.get('OTEL_SERVICE_ENV', 'development');

    switch (environment) {
      case 'production':
        process.env.OTEL_TRACES_SAMPLER = 'traceidratio';
        process.env.OTEL_TRACES_SAMPLER_ARG = '0.01'; // 1% in production
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT = this.configService.get('OTEL_ENDPOINT_PROD');
        break;

      case 'staging':
        process.env.OTEL_TRACES_SAMPLER = 'traceidratio';
        process.env.OTEL_TRACES_SAMPLER_ARG = '0.1'; // 10% in staging
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT = this.configService.get('OTEL_ENDPOINT_STAGING');
        break;

      default: // development
        process.env.OTEL_TRACES_SAMPLER = 'always_on'; // Trace everything
        process.env.OTEL_TRACES_EXPORTER = 'console';
        process.env.OTEL_METRICS_EXPORTER = 'console';
        process.env.OTEL_LOGS_EXPORTER = 'console';
        break;
    }
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ObservabilityModule.forRoot(), // Simple registration
  ],
  providers: [ObservabilityConfigService], // Sets env vars before OpenTelemetry initializes
})
export class AppModule {}
```

## Environment-Specific Configuration

Configure different environments using environment variables:

```bash
# Production Environment
OTEL_SERVICE_ENV=production
OTEL_SERVICE_NAME=my-service
OTEL_SERVICE_VERSION=1.0.0
OTEL_RESOURCE_ATTRIBUTES=environment=production,datacenter=us-east-1
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.01  # 1% sampling in production

# Staging Environment
OTEL_SERVICE_ENV=staging
OTEL_SERVICE_NAME=my-service-staging
OTEL_SERVICE_VERSION=1.0.0
OTEL_RESOURCE_ATTRIBUTES=environment=staging,datacenter=us-east-1
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # 10% sampling in staging
OTEL_EXPORTER_OTLP_ENDPOINT=https://staging-api.honeycomb.io

# Development Environment
OTEL_SERVICE_ENV=development
OTEL_SERVICE_NAME=my-service-dev
OTEL_SERVICE_VERSION=1.0.0
OTEL_RESOURCE_ATTRIBUTES=environment=development
OTEL_TRACES_EXPORTER=console
OTEL_METRICS_EXPORTER=console
OTEL_LOGS_EXPORTER=console
OTEL_TRACES_SAMPLER=always_on  # Trace everything in development
```

## Database Integration

Include database information in your observability configuration:

```typescript
@Injectable()
export class DatabaseAwareConfigService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    @InjectDataSource() private dataSource: DataSource
  ) {}

  async onModuleInit() {
    // Wait for database connection
    await this.dataSource.initialize();

    const dbOptions = this.dataSource.options;

    // Build resource attributes including database info
    const resourceAttributes = [
      `service.name=${this.configService.get('APP_NAME', 'unknown')}`,
      `service.version=${this.configService.get('SERVICE_VERSION', '1.0.0')}`,
      `environment=${this.configService.get('OTEL_SERVICE_ENV', 'development')}`,
      `database.name=${dbOptions.database}`,
      `database.system=${dbOptions.type}`,
      `database.connection.pool.name=${this.configService.get('DB_POOL_NAME', 'default')}`,
    ];

    process.env.OTEL_RESOURCE_ATTRIBUTES = resourceAttributes.join(',');

    // Configure endpoints based on database environment
    const dbHost = typeof dbOptions.host === 'string' ? dbOptions.host : 'localhost';
    if (dbHost.includes('prod')) {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = this.configService.get('OTEL_ENDPOINT_PROD');
    } else if (dbHost.includes('staging')) {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = this.configService.get('OTEL_ENDPOINT_STAGING');
    }
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        database: configService.get('DB_NAME'),
        // ... other database config
      }),
    }),
    ObservabilityModule.forRoot(),
  ],
  providers: [DatabaseAwareConfigService],
})
export class AppModule {}
```

## External Configuration Sources

Load configuration from external sources and set environment variables:

```typescript
@Injectable()
export class ExternalConfigService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService
  ) {}

  async onModuleInit() {
    try {
      const externalConfig = await this.loadExternalConfig();
      this.applyExternalConfig(externalConfig);
    } catch (error) {
      console.warn('Failed to load external config, using defaults:', error.message);
      this.applyDefaultConfig();
    }
  }

  private async loadExternalConfig(): Promise<any> {
    const configUrl = this.configService.get('CONFIG_SERVICE_URL');
    const response = await this.httpService.axiosRef.get(`${configUrl}/observability`, {
      timeout: 5000, // 5 second timeout
      headers: {
        Authorization: `Bearer ${this.configService.get('CONFIG_SERVICE_TOKEN')}`,
      },
    });
    return response.data;
  }

  private applyExternalConfig(config: any) {
    // Apply external configuration to environment variables
    if (config.serviceName) {
      process.env.OTEL_SERVICE_NAME = config.serviceName;
    }
    if (config.tracing?.endpoint) {
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = config.tracing.endpoint;
    }
    if (config.tracing?.samplingRatio) {
      process.env.OTEL_TRACES_SAMPLER = 'traceidratio';
      process.env.OTEL_TRACES_SAMPLER_ARG = config.tracing.samplingRatio.toString();
    }
    if (config.metrics?.endpoint) {
      process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = config.metrics.endpoint;
    }
    if (config.resourceAttributes) {
      const existingAttrs = process.env.OTEL_RESOURCE_ATTRIBUTES || '';
      const newAttrs = Object.entries(config.resourceAttributes)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
      process.env.OTEL_RESOURCE_ATTRIBUTES = [existingAttrs, newAttrs].filter(Boolean).join(',');
    }
  }

  private applyDefaultConfig() {
    // Safe fallback configuration
    process.env.OTEL_TRACES_EXPORTER = 'console';
    process.env.OTEL_METRICS_EXPORTER = 'console';
    process.env.OTEL_LOGS_EXPORTER = 'console';
  }
}

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HttpModule, ObservabilityModule.forRoot()],
  providers: [ExternalConfigService],
})
export class AppModule {}
```

## Feature Flag Integration

Use feature flags to control observability features:

```typescript
@Injectable()
export class FeatureFlagService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Configure based on feature flags
    if (this.isTracingEnabled()) {
      process.env.OTEL_TRACES_EXPORTER = 'otlp';
      process.env.OTEL_TRACES_SAMPLER = 'traceidratio';
      process.env.OTEL_TRACES_SAMPLER_ARG = this.getTracingSampleRate().toString();

      // Add feature flag resource attribute
      this.addResourceAttribute('feature.tracing', 'enabled');
    } else {
      process.env.OTEL_TRACES_EXPORTER = 'none'; // Disable tracing
      this.addResourceAttribute('feature.tracing', 'disabled');
    }

    if (this.isMetricsEnabled()) {
      process.env.OTEL_METRICS_EXPORTER = 'otlp';
      this.addResourceAttribute('feature.metrics', 'enabled');
    } else {
      process.env.OTEL_METRICS_EXPORTER = 'none'; // Disable metrics
      this.addResourceAttribute('feature.metrics', 'disabled');
    }

    if (this.isCustomMetricsEnabled()) {
      this.addResourceAttribute('feature.custom_metrics', 'enabled');
    }
  }

  private isTracingEnabled(): boolean {
    return this.configService.get('FEATURE_TRACING') === 'enabled';
  }

  private isMetricsEnabled(): boolean {
    return this.configService.get('FEATURE_METRICS') === 'enabled';
  }

  private isCustomMetricsEnabled(): boolean {
    return this.configService.get('FEATURE_CUSTOM_METRICS') === 'enabled';
  }

  private getTracingSampleRate(): number {
    const rate = this.configService.get('FEATURE_TRACING_SAMPLE_RATE');
    return rate ? parseFloat(rate) : 0.1;
  }

  private addResourceAttribute(key: string, value: string) {
    const existing = process.env.OTEL_RESOURCE_ATTRIBUTES || '';
    const newAttr = `${key}=${value}`;
    process.env.OTEL_RESOURCE_ATTRIBUTES = existing ? `${existing},${newAttr}` : newAttr;
  }
}

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ObservabilityModule.forRoot()],
  providers: [FeatureFlagService],
})
export class AppModule {}
```

## Conditional Module Loading

Conditionally load the observability module based on environment:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Only load observability in non-test environments
    ...(process.env.OTEL_SERVICE_ENV !== 'test' ? [ObservabilityModule.forRoot()] : []),
  ],
})
export class AppModule {}
```

Or with more complex conditions:

```typescript
function createObservabilityModule(): DynamicModule[] {
  const environment = process.env.OTEL_SERVICE_ENV;
  const enableObservability = process.env.ENABLE_OBSERVABILITY !== 'false';

  if (!enableObservability || environment === 'test') {
    return [];
  }

  // Set environment-specific defaults
  if (environment === 'production') {
    process.env.OTEL_TRACES_SAMPLER = process.env.OTEL_TRACES_SAMPLER || 'traceidratio';
    process.env.OTEL_TRACES_SAMPLER_ARG = process.env.OTEL_TRACES_SAMPLER_ARG || '0.01';
  } else {
    process.env.OTEL_TRACES_SAMPLER = process.env.OTEL_TRACES_SAMPLER || 'always_on';
  }

  return [ObservabilityModule.forRoot()];
}

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ...createObservabilityModule()],
})
export class AppModule {}
```

## Error Handling and Fallbacks

Implement robust error handling with graceful fallbacks:

```typescript
@Injectable()
export class RobustConfigService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      await this.configureObservability();
    } catch (error) {
      console.error('Failed to configure observability:', error);
      this.applyFallbackConfig();
    }
  }

  private async configureObservability() {
    // Attempt to load from multiple sources with timeout
    const configPromises = [this.loadFromConfigService(), this.loadFromExternalAPI(), this.loadFromEnvironment()];

    // Race the promises with a timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Configuration timeout')), 10000)
    );

    const configs = await Promise.allSettled([Promise.race([Promise.all(configPromises), timeoutPromise])]);

    const successfulConfig = configs.find(
      (result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled'
    );

    if (successfulConfig) {
      this.applyConfig(successfulConfig.value[0]); // Use first successful config
    } else {
      throw new Error('All configuration sources failed or timed out');
    }
  }

  private async loadFromConfigService(): Promise<any> {
    return {
      serviceName: this.configService.get('APP_NAME', 'unknown'),
      endpoint: this.configService.get('OTEL_ENDPOINT'),
      samplingRatio: parseFloat(this.configService.get('SAMPLING_RATIO', '0.1')),
    };
  }

  private async loadFromExternalAPI(): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch('https://config-api.example.com/observability', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`External API failed: ${response.statusText}`);
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private loadFromEnvironment(): Promise<any> {
    return Promise.resolve({
      serviceName: process.env.APP_NAME || 'unknown',
      endpoint: process.env.OTEL_ENDPOINT,
      samplingRatio: parseFloat(process.env.SAMPLING_RATIO || '0.1'),
    });
  }

  private applyConfig(config: any) {
    if (config.serviceName) {
      process.env.OTEL_SERVICE_NAME = config.serviceName;
    }
    if (config.endpoint) {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = config.endpoint;
    }
    if (config.samplingRatio) {
      process.env.OTEL_TRACES_SAMPLER = 'traceidratio';
      process.env.OTEL_TRACES_SAMPLER_ARG = config.samplingRatio.toString();
    }

    // Add config source to resource attributes
    this.addResourceAttribute('config.source', 'external');
  }

  private applyFallbackConfig() {
    // Safe fallback - use console exporters and basic configuration
    console.warn('Using fallback observability configuration');

    process.env.OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'unknown-service';
    process.env.OTEL_TRACES_EXPORTER = 'console';
    process.env.OTEL_METRICS_EXPORTER = 'console';
    process.env.OTEL_LOGS_EXPORTER = 'console';
    process.env.OTEL_TRACES_SAMPLER = 'always_off'; // Disable tracing in fallback

    // Add fallback indicator to resource attributes
    this.addResourceAttribute('config.source', 'fallback');
    this.addResourceAttribute('config.status', 'degraded');
  }

  private addResourceAttribute(key: string, value: string) {
    const existing = process.env.OTEL_RESOURCE_ATTRIBUTES || '';
    const newAttr = `${key}=${value}`;
    process.env.OTEL_RESOURCE_ATTRIBUTES = existing ? `${existing},${newAttr}` : newAttr;
  }
}

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ObservabilityModule.forRoot()],
  providers: [RobustConfigService],
})
export class AppModule {}
```

## Debug Configuration

Add debugging capabilities to your configuration:

```typescript
@Injectable()
export class DebugConfigService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Set up debug configuration
    if (this.isDebugMode()) {
      this.enableDebugLogging();
    }

    // Log final configuration in development
    if (this.configService.get('OTEL_SERVICE_ENV') === 'development') {
      this.logObservabilityConfig();
    }
  }

  private isDebugMode(): boolean {
    return this.configService.get('DEBUG_OBSERVABILITY') === 'true';
  }

  private enableDebugLogging() {
    // Enable debug logging for OpenTelemetry
    process.env.OTEL_LOG_LEVEL = 'debug';

    // Add debug resource attribute
    this.addResourceAttribute('debug.mode', 'enabled');
    this.addResourceAttribute('debug.timestamp', new Date().toISOString());
  }

  private logObservabilityConfig() {
    const otelEnvVars = Object.entries(process.env)
      .filter(([key]) => key.startsWith('OTEL_'))
      .reduce(
        (acc, [key, value]) => {
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string | undefined>
      );

    console.log('🔍 OpenTelemetry Configuration:', JSON.stringify(otelEnvVars, null, 2));
  }

  private addResourceAttribute(key: string, value: string) {
    const existing = process.env.OTEL_RESOURCE_ATTRIBUTES || '';
    const newAttr = `${key}=${value}`;
    process.env.OTEL_RESOURCE_ATTRIBUTES = existing ? `${existing},${newAttr}` : newAttr;
  }
}
```

## Benefits of Environment-Driven Configuration

- ✅ **Simpler**: Straightforward environment variable configuration
- ✅ **Standards-compliant**: Uses official OpenTelemetry environment variables
- ✅ **Performance**: No complex initialization overhead
- ✅ **Debugging**: Standard OpenTelemetry debugging tools work out of the box
- ✅ **Tooling**: Compatible with all OpenTelemetry collectors and vendors
- ✅ **Deployment**: Easy to configure via environment variables in containers/k8s
- ✅ **Security**: No configuration objects in code that might leak sensitive data
