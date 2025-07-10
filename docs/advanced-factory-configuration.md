# Advanced Factory Configuration

This guide covers advanced patterns for configuring the `ObservabilityModule` using the factory pattern for complex scenarios.

## Advanced Factory Pattern

For complex scenarios, you can inject multiple services and perform async operations:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Example with multiple dependencies
    ObservabilityModule.forRootAsync({
      imports: [ConfigModule, DatabaseModule], // Import required modules
      inject: [ConfigService, DatabaseService], // Inject multiple services
      useFactory: async (configService: ConfigService, databaseService: DatabaseService) => {
        // Perform async operations if needed
        const dbConfig = await databaseService.getConfig();

        return {
          serviceName: configService.get('SERVICE_NAME', 'my-service'),
          serviceVersion: configService.get('SERVICE_VERSION', '1.0.0'),
          environment: configService.get('NODE_ENV', 'development'),

          // Use data from multiple sources
          logging: {
            level: configService.get('LOG_LEVEL', 'info'),
            additionalContext: {
              databaseName: dbConfig.name,
              databaseHost: dbConfig.host,
            },
          },

          // Environment-specific configuration
          tracing: {
            enabled: configService.get('TRACING_ENABLED', 'true') === 'true',
            exporter: {
              type: 'otlp',
              endpoint: configService.get('OTLP_TRACES_ENDPOINT', 'http://localhost:4318/v1/traces'),
              headers: configService.get('OTLP_HEADERS') ? JSON.parse(configService.get('OTLP_HEADERS')!) : undefined,
            },
          },
        };
      },
    }),
  ],
})
export class AppModule {}
```

## Environment-Specific Configuration

The factory pattern makes it easy to handle different environments:

```typescript
ObservabilityModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const environment = configService.get('NODE_ENV', 'development');

    // Base configuration
    const baseConfig = {
      serviceName: configService.get('SERVICE_NAME', 'my-service'),
      serviceVersion: configService.get('SERVICE_VERSION', '1.0.0'),
      environment,
    };

    // Environment-specific overrides
    if (environment === 'production') {
      return {
        ...baseConfig,
        logging: {
          level: 'info',
          consoleOutput: false, // Disable console in production
          otlpExport: {
            enabled: true,
            endpoint: configService.get('OTLP_LOGS_ENDPOINT'),
          },
        },
        tracing: {
          enabled: true,
          sampler: {
            type: 'trace_id_ratio',
            ratio: 0.1, // Sample 10% in production
          },
        },
      };
    }

    if (environment === 'development') {
      return {
        ...baseConfig,
        logging: {
          level: 'debug',
          consoleOutput: true, // Enable console in development
        },
        tracing: {
          enabled: true,
          sampler: {
            type: 'always_on', // Trace everything in development
          },
        },
      };
    }

    // Test environment
    return {
      ...baseConfig,
      logging: { level: 'error', consoleOutput: false },
      tracing: { enabled: false },
      metrics: { enabled: false },
    };
  },
});
```

## Configuration with External Services

### Using with Database Configuration

```typescript
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
      }),
    }),

    ObservabilityModule.forRootAsync({
      imports: [ConfigModule, TypeOrmModule],
      inject: [ConfigService, DataSource],
      useFactory: async (configService: ConfigService, dataSource: DataSource) => {
        // Use database information in observability configuration
        const dbName = dataSource.options.database;

        return {
          serviceName: configService.get('SERVICE_NAME', 'my-service'),
          serviceVersion: configService.get('SERVICE_VERSION', '1.0.0'),
          environment: configService.get('NODE_ENV', 'development'),

          metrics: {
            enabled: true,
            defaultLabels: {
              database: dbName,
              schema: dataSource.options.schema || 'public',
            },
          },

          logging: {
            level: configService.get('LOG_LEVEL', 'info'),
            additionalContext: {
              database: dbName,
            },
          },
        };
      },
    }),
  ],
})
export class AppModule {}
```

### Using with External Config Services

```typescript
@Injectable()
export class ExternalConfigService {
  async getServiceConfig(): Promise<ServiceConfig> {
    // Fetch configuration from external service
    const response = await fetch('https://config-service.example.com/config');
    return response.json();
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ObservabilityModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      providers: [ExternalConfigService],
      useFactory: async (configService: ConfigService) => {
        const externalConfigService = new ExternalConfigService();
        const externalConfig = await externalConfigService.getServiceConfig();

        return {
          serviceName: externalConfig.serviceName,
          serviceVersion: externalConfig.version,
          environment: configService.get('NODE_ENV', 'development'),

          tracing: {
            enabled: externalConfig.tracing.enabled,
            exporter: {
              type: 'otlp',
              endpoint: externalConfig.tracing.endpoint,
              headers: externalConfig.tracing.headers,
            },
          },

          metrics: {
            enabled: externalConfig.metrics.enabled,
            defaultLabels: {
              service: externalConfig.serviceName,
              version: externalConfig.version,
              cluster: externalConfig.cluster,
              region: externalConfig.region,
            },
          },
        };
      },
    }),
  ],
})
export class AppModule {}
```

## Feature Flags Integration

```typescript
@Injectable()
export class FeatureFlagService {
  isTracingEnabled(): boolean {
    return process.env.FEATURE_TRACING === 'true';
  }

  isMetricsEnabled(): boolean {
    return process.env.FEATURE_METRICS === 'true';
  }

  getLogLevel(): string {
    return process.env.FEATURE_DEBUG_LOGGING === 'true' ? 'debug' : 'info';
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ObservabilityModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      providers: [FeatureFlagService],
      useFactory: async (configService: ConfigService) => {
        const featureFlags = new FeatureFlagService();

        return {
          serviceName: configService.get('SERVICE_NAME', 'my-service'),
          serviceVersion: configService.get('SERVICE_VERSION', '1.0.0'),
          environment: configService.get('NODE_ENV', 'development'),

          // Feature flag controlled configuration
          tracing: {
            enabled: featureFlags.isTracingEnabled(),
            exporter: {
              type: 'otlp',
              endpoint: configService.get('OTLP_TRACES_ENDPOINT', 'http://localhost:4318/v1/traces'),
            },
          },

          metrics: {
            enabled: featureFlags.isMetricsEnabled(),
            endpoint: '/metrics',
          },

          logging: {
            level: featureFlags.getLogLevel(),
            consoleOutput: true,
          },
        };
      },
    }),
  ],
})
export class AppModule {}
```

## Error Handling in Factory

```typescript
ObservabilityModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    try {
      // Attempt to load external configuration
      const externalConfig = await loadExternalConfig();

      return {
        serviceName: externalConfig.serviceName,
        serviceVersion: externalConfig.version,
        environment: configService.get('NODE_ENV', 'development'),
        // ... rest of config
      };
    } catch (error) {
      // Fallback to environment variables if external config fails
      console.warn('Failed to load external config, using environment variables', error);

      return {
        serviceName: configService.get('SERVICE_NAME', 'fallback-service'),
        serviceVersion: configService.get('SERVICE_VERSION', '1.0.0'),
        environment: configService.get('NODE_ENV', 'development'),

        // Conservative fallback configuration
        logging: {
          level: 'info',
          consoleOutput: true,
        },

        tracing: {
          enabled: false, // Disable tracing in fallback mode
        },

        metrics: {
          enabled: true,
          defaultLabels: {
            fallback: 'true',
          },
        },
      };
    }
  },
});
```

## Validation in Factory

```typescript
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

class ObservabilityConfigDto {
  @IsString()
  serviceName: string;

  @IsString()
  serviceVersion: string;

  @IsEnum(['development', 'staging', 'production'])
  environment: string;

  @IsOptional()
  @IsObject()
  tracing?: {
    enabled: boolean;
    exporter: {
      endpoint: string;
    };
  };
}

ObservabilityModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const config = {
      serviceName: configService.get('SERVICE_NAME', 'my-service'),
      serviceVersion: configService.get('SERVICE_VERSION', '1.0.0'),
      environment: configService.get('NODE_ENV', 'development'),
      tracing: {
        enabled: configService.get('TRACING_ENABLED', 'true') === 'true',
        exporter: {
          endpoint: configService.get('OTLP_TRACES_ENDPOINT', 'http://localhost:4318/v1/traces'),
        },
      },
    };

    // Validate configuration
    const configDto = plainToClass(ObservabilityConfigDto, config);
    const errors = await validate(configDto);

    if (errors.length > 0) {
      throw new Error(`Invalid observability configuration: ${errors.join(', ')}`);
    }

    return config;
  },
});
```

## Common Advanced Patterns

### 1. Multi-Environment Support with Shared Config

```typescript
// shared-config.ts
export const createObservabilityConfig = (
  configService: ConfigService,
  overrides: Partial<SimpleObservabilityConfig> = {}
) => {
  const baseConfig = {
    serviceName: configService.get('SERVICE_NAME', 'my-service'),
    serviceVersion: configService.get('SERVICE_VERSION', '1.0.0'),
    environment: configService.get('NODE_ENV', 'development'),
  };

  return {
    ...baseConfig,
    ...overrides,
  };
};

// app.module.ts
ObservabilityModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return createObservabilityConfig(configService, {
      // Environment-specific overrides
      tracing: {
        enabled: configService.get('NODE_ENV') === 'production',
      },
    });
  },
});
```

### 2. Conditional Module Loading

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Only load observability in non-test environments
    ...(process.env.NODE_ENV !== 'test'
      ? [
          ObservabilityModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
              serviceName: configService.get('SERVICE_NAME', 'my-service'),
              serviceVersion: configService.get('SERVICE_VERSION', '1.0.0'),
              environment: configService.get('NODE_ENV', 'development'),
            }),
          }),
        ]
      : []),
  ],
})
export class AppModule {}
```

### 3. Dynamic Configuration Updates

```typescript
@Injectable()
export class DynamicConfigService {
  private configSubject = new BehaviorSubject<ObservabilityConfig>(null);
  public config$ = this.configSubject.asObservable();

  async updateConfig(newConfig: Partial<ObservabilityConfig>) {
    const currentConfig = this.configSubject.value;
    const updatedConfig = { ...currentConfig, ...newConfig };
    this.configSubject.next(updatedConfig);
  }
}

// Note: This is an advanced pattern that requires careful consideration
// of how configuration changes affect running services
```

## Best Practices for Advanced Configuration

1. **Error Handling**: Always include try-catch blocks for external service calls
2. **Fallback Configuration**: Provide sensible defaults when external configuration fails
3. **Validation**: Validate configuration before using it
4. **Async Operations**: Use async/await properly in factory functions
5. **Dependency Order**: Ensure all required modules are imported before the observability module
6. **Environment Awareness**: Make configuration environment-specific where appropriate
7. **Security**: Never log sensitive configuration values
8. **Performance**: Consider caching expensive configuration operations

## Troubleshooting Advanced Configurations

### Common Issues

1. **Circular Dependencies**: Ensure the observability module doesn't depend on modules that depend on it
2. **Async Timing**: Make sure all async operations complete before returning configuration
3. **Module Order**: Load dependencies in the correct order
4. **Memory Leaks**: Properly dispose of resources in factory functions

### Debug Configuration

```typescript
ObservabilityModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const config = {
      serviceName: configService.get('SERVICE_NAME', 'my-service'),
      // ... other config
    };

    // Debug configuration in development
    if (configService.get('NODE_ENV') === 'development') {
      console.log('Observability Configuration:', JSON.stringify(config, null, 2));
    }

    return config;
  },
});
```
