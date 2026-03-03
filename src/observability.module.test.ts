import 'reflect-metadata';
// ABOUTME: Unit tests for ObservabilityModule structure and controller scanning.
// ABOUTME: Verifies @NoTraceClass controllers register their routes with the ignored-routes registry.

import { Controller, Get, Module, VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { APP_INTERCEPTOR, ApplicationConfig, DiscoveryModule } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock OpenTelemetry modules
vi.mock('@opentelemetry/api', () => ({
  context: {
    active: vi.fn().mockReturnValue({
      getValue: vi.fn(),
      setValue: vi.fn().mockReturnValue({}),
    }),
    with: vi.fn((_ctx: unknown, fn: () => unknown) => fn()),
  },
  createContextKey: vi.fn((name: string) => Symbol(name)),
  metrics: {
    getMeterProvider: vi.fn().mockReturnValue({
      getMeter: vi.fn().mockReturnValue({
        createCounter: vi.fn(),
        createHistogram: vi.fn(),
        createObservableGauge: vi.fn(),
      }),
    }),
  },
  trace: {
    getActiveSpan: vi.fn(),
    getTracer: vi.fn().mockReturnValue({
      startSpan: vi.fn().mockReturnValue({
        end: vi.fn(),
        recordException: vi.fn(),
        setAttributes: vi.fn(),
        setStatus: vi.fn(),
      }),
    }),
    getTracerProvider: vi.fn().mockReturnValue({
      getTracer: vi.fn().mockReturnValue({
        startSpan: vi.fn().mockReturnValue({
          end: vi.fn(),
          recordException: vi.fn(),
          setAttributes: vi.fn(),
          setStatus: vi.fn(),
        }),
      }),
    }),
  },
}));

vi.mock('@opentelemetry/api-logs', () => ({
  logs: {
    getLoggerProvider: vi.fn().mockReturnValue({
      getLogger: vi.fn().mockReturnValue({
        emit: vi.fn(),
      }),
    }),
  },
}));

import { MetricsController } from './controllers/metrics.controller';
import { NoTraceClass } from './decorators/auto-trace.decorators';
import { AutoTraceInterceptor } from './interceptors/auto-trace.interceptor';
import { RequestLoggingInterceptor } from './interceptors/request-logging.interceptor';
import { LoggerService } from './logger/logger.service';
import { MetricsService } from './metrics/metrics.service';
import { ObservabilityModule } from './observability.module';
import { getIgnoredRoutes, resetIgnoredRoutes } from './sdk-core';
import { TracingService } from './tracing/tracing.service';

// Mock environment variables
const mockEnv = {
  NODE_ENV: 'test',
  OTEL_SERVICE_NAME: 'test-service',
  OTEL_SERVICE_VERSION: '1.0.0',
};

// Test controllers
@Controller('health')
@NoTraceClass()
class TestHealthController {
  @Get()
  check(): string {
    return 'ok';
  }
}

@Controller('api')
class TestApiController {
  @Get()
  list(): string[] {
    return [];
  }
}

@Controller()
@NoTraceClass()
class TestRootController {
  @Get()
  root(): string {
    return 'root';
  }
}

@Controller('readiness')
@NoTraceClass()
class TestReadinessController {
  @Get()
  check(): string {
    return 'ready';
  }
}

@Controller('/status')
@NoTraceClass()
class TestLeadingSlashController {
  @Get()
  check(): string {
    return 'ok';
  }
}

@Controller(['health', 'healthz'])
@NoTraceClass()
class TestMultiPathController {
  @Get()
  check(): string {
    return 'ok';
  }
}

@Controller(['/', 'status'])
@NoTraceClass()
class TestArrayWithRootController {
  @Get()
  check(): string {
    return 'ok';
  }
}

@Controller({ path: 'users', version: '1' })
@NoTraceClass()
class TestVersionedController {
  @Get()
  list(): string[] {
    return [];
  }
}

@Controller({ path: 'users', version: ['1', '2'] })
@NoTraceClass()
class TestMultiVersionController {
  @Get()
  list(): string[] {
    return [];
  }
}

@Controller({ path: 'users', version: VERSION_NEUTRAL })
@NoTraceClass()
class TestVersionNeutralController {
  @Get()
  list(): string[] {
    return [];
  }
}

@Controller('users')
@NoTraceClass()
class TestUnversionedUsersController {
  @Get()
  list(): string[] {
    return [];
  }
}

describe('ObservabilityModule', () => {
  let module: TestingModule | undefined;

  beforeEach(() => {
    // Set up environment variables
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });
  });

  afterEach(async () => {
    resetIgnoredRoutes();
    vi.restoreAllMocks();
    if (module) {
      await module.close();
      module = undefined;
    }
    Object.keys(mockEnv).forEach((key) => {
      Reflect.deleteProperty(process.env, key);
    });
  });

  describe('forRoot()', () => {
    it('should create module without configuration parameters', () => {
      const moduleDefinition = ObservabilityModule.forRoot();

      expect(moduleDefinition).toBeDefined();
      expect(moduleDefinition.module).toBe(ObservabilityModule);
      expect(moduleDefinition.providers).toBeDefined();
      expect(moduleDefinition.controllers).toContain(MetricsController);
      expect(moduleDefinition.exports).toContain(LoggerService);
      expect(moduleDefinition.exports).toContain(MetricsService);
      expect(moduleDefinition.exports).toContain(TracingService);
    });

    it('should provide all required services', async () => {
      module = await Test.createTestingModule({
        imports: [ObservabilityModule.forRoot()],
      }).compile();

      expect(module.get(LoggerService)).toBeInstanceOf(LoggerService);
      expect(module.get(MetricsService)).toBeInstanceOf(MetricsService);
      expect(module.get(TracingService)).toBeInstanceOf(TracingService);
    });

    it('should register AutoTraceInterceptor as APP_INTERCEPTOR', () => {
      const moduleDefinition = ObservabilityModule.forRoot();

      // Check that AutoTraceInterceptor is registered
      const interceptorProviders = moduleDefinition.providers?.filter(
        (provider) => typeof provider === 'object' && 'provide' in provider && provider.provide === APP_INTERCEPTOR
      );

      expect(interceptorProviders).toBeDefined();
      expect(interceptorProviders?.length).toBeGreaterThan(0);

      const autoTraceInterceptor = interceptorProviders?.find(
        (provider) =>
          typeof provider === 'object' && 'useClass' in provider && provider.useClass === AutoTraceInterceptor
      );
      expect(autoTraceInterceptor).toBeDefined();
    });

    it('should always register RequestLoggingInterceptor', () => {
      const moduleDefinition = ObservabilityModule.forRoot();

      const interceptorProviders = moduleDefinition.providers?.filter(
        (provider) => typeof provider === 'object' && 'provide' in provider && provider.provide === APP_INTERCEPTOR
      );

      const requestLoggingInterceptor = interceptorProviders?.find(
        (provider) =>
          typeof provider === 'object' && 'useClass' in provider && provider.useClass === RequestLoggingInterceptor
      );

      expect(requestLoggingInterceptor).toBeDefined();
    });

    it('should include DiscoveryModule in imports', () => {
      const moduleDefinition = ObservabilityModule.forRoot();

      expect(moduleDefinition.imports).toContain(DiscoveryModule);
    });
  });

  describe('Module Registration', () => {
    it('should be marked as Global', () => {
      const moduleMetadata = Reflect.getMetadata('__module:global__', ObservabilityModule) as boolean;
      expect(moduleMetadata).toBe(true);
    });
  });

  describe('onApplicationBootstrap - controller scanning', () => {
    it('should register @NoTraceClass controller routes as ignored', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestHealthController, TestApiController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      await module.init();

      expect(getIgnoredRoutes().has('/health')).toBe(true);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should not register controllers without @NoTraceClass', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestApiController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      await module.init();

      expect(getIgnoredRoutes().has('/api')).toBe(false);
      expect(getIgnoredRoutes().size).toBe(0);
    });

    it('should skip @NoTraceClass controllers with empty/root path and warn', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestRootController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      await module.init();

      expect(getIgnoredRoutes().size).toBe(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('root-path controllers cannot be excluded from tracing')
      );
    });

    it('should register multiple @NoTraceClass controllers', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestHealthController, TestReadinessController, TestApiController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      await module.init();

      expect(getIgnoredRoutes().has('/health')).toBe(true);
      expect(getIgnoredRoutes().has('/readiness')).toBe(true);
      expect(getIgnoredRoutes().has('/api')).toBe(false);
      expect(getIgnoredRoutes().size).toBe(2);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should register all paths for array-path controller', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestMultiPathController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      await module.init();

      expect(getIgnoredRoutes().has('/health')).toBe(true);
      expect(getIgnoredRoutes().has('/healthz')).toBe(true);
      expect(getIgnoredRoutes().size).toBe(2);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should warn for root paths in array but register valid ones', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestArrayWithRootController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      await module.init();

      expect(getIgnoredRoutes().has('/status')).toBe(true);
      expect(getIgnoredRoutes().size).toBe(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('root-path controllers cannot be excluded from tracing')
      );
    });
  });

  describe('global prefix handling', () => {
    it('should prepend global prefix to controller routes', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestHealthController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      // Override ApplicationConfig to simulate a global prefix
      const appConfig = module.get(ApplicationConfig);
      vi.spyOn(appConfig, 'getGlobalPrefix').mockReturnValue('api/v1');
      vi.spyOn(appConfig, 'getGlobalPrefixOptions').mockReturnValue({});

      await module.init();

      expect(getIgnoredRoutes().has('/api/v1/health')).toBe(true);
      expect(getIgnoredRoutes().has('/health')).toBe(false);
    });

    it('should handle controller paths with leading slash', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestLeadingSlashController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const appConfig = module.get(ApplicationConfig);
      vi.spyOn(appConfig, 'getGlobalPrefix').mockReturnValue('api/v1');
      vi.spyOn(appConfig, 'getGlobalPrefixOptions').mockReturnValue({});

      await module.init();

      expect(getIgnoredRoutes().has('/api/v1/status')).toBe(true);
    });

    it('should not prepend global prefix for excluded paths', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestHealthController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const appConfig = module.get(ApplicationConfig);
      vi.spyOn(appConfig, 'getGlobalPrefix').mockReturnValue('api/v1');
      vi.spyOn(appConfig, 'getGlobalPrefixOptions').mockReturnValue({
        exclude: [{ path: 'health', pathRegex: /^\/health/, requestMethod: 0 }],
      });

      await module.init();

      expect(getIgnoredRoutes().has('/health')).toBe(true);
      expect(getIgnoredRoutes().has('/api/v1/health')).toBe(false);
    });

    it('should apply global prefix to each path in array', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestMultiPathController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const appConfig = module.get(ApplicationConfig);
      vi.spyOn(appConfig, 'getGlobalPrefix').mockReturnValue('api/v1');
      vi.spyOn(appConfig, 'getGlobalPrefixOptions').mockReturnValue({});

      await module.init();

      expect(getIgnoredRoutes().has('/api/v1/health')).toBe(true);
      expect(getIgnoredRoutes().has('/api/v1/healthz')).toBe(true);
      expect(getIgnoredRoutes().has('/health')).toBe(false);
      expect(getIgnoredRoutes().has('/healthz')).toBe(false);
      expect(getIgnoredRoutes().size).toBe(2);
    });

    it('should exclude individual array paths from global prefix independently', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestMultiPathController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const appConfig = module.get(ApplicationConfig);
      vi.spyOn(appConfig, 'getGlobalPrefix').mockReturnValue('api/v1');
      vi.spyOn(appConfig, 'getGlobalPrefixOptions').mockReturnValue({
        exclude: [{ path: 'health', pathRegex: /^\/health/, requestMethod: 0 }],
      });

      await module.init();

      expect(getIgnoredRoutes().has('/health')).toBe(true);
      expect(getIgnoredRoutes().has('/api/v1/healthz')).toBe(true);
      expect(getIgnoredRoutes().has('/api/v1/health')).toBe(false);
      expect(getIgnoredRoutes().has('/healthz')).toBe(false);
      expect(getIgnoredRoutes().size).toBe(2);
    });
  });

  describe('URI versioning', () => {
    it('should prepend version prefix for URI-versioned controllers', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestVersionedController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const appConfig = module.get(ApplicationConfig);
      vi.spyOn(appConfig, 'getGlobalPrefix').mockReturnValue('');
      vi.spyOn(appConfig, 'getGlobalPrefixOptions').mockReturnValue({});
      vi.spyOn(appConfig, 'getVersioning').mockReturnValue({
        type: VersioningType.URI,
      });

      await module.init();

      expect(getIgnoredRoutes().has('/v1/users')).toBe(true);
      expect(getIgnoredRoutes().size).toBe(1);
    });

    it('should use custom version prefix', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestVersionedController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const appConfig = module.get(ApplicationConfig);
      vi.spyOn(appConfig, 'getGlobalPrefix').mockReturnValue('');
      vi.spyOn(appConfig, 'getGlobalPrefixOptions').mockReturnValue({});
      vi.spyOn(appConfig, 'getVersioning').mockReturnValue({
        type: VersioningType.URI,
        prefix: 'api/v',
      });

      await module.init();

      expect(getIgnoredRoutes().has('/api/v1/users')).toBe(true);
      expect(getIgnoredRoutes().size).toBe(1);
    });

    it('should handle prefix: false', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestVersionedController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const appConfig = module.get(ApplicationConfig);
      vi.spyOn(appConfig, 'getGlobalPrefix').mockReturnValue('');
      vi.spyOn(appConfig, 'getGlobalPrefixOptions').mockReturnValue({});
      vi.spyOn(appConfig, 'getVersioning').mockReturnValue({
        type: VersioningType.URI,
        prefix: false,
      });

      await module.init();

      expect(getIgnoredRoutes().has('/1/users')).toBe(true);
      expect(getIgnoredRoutes().size).toBe(1);
    });

    it('should combine global prefix with version', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestVersionedController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const appConfig = module.get(ApplicationConfig);
      vi.spyOn(appConfig, 'getGlobalPrefix').mockReturnValue('api');
      vi.spyOn(appConfig, 'getGlobalPrefixOptions').mockReturnValue({});
      vi.spyOn(appConfig, 'getVersioning').mockReturnValue({
        type: VersioningType.URI,
      });

      await module.init();

      expect(getIgnoredRoutes().has('/api/v1/users')).toBe(true);
      expect(getIgnoredRoutes().has('/v1/users')).toBe(false);
      expect(getIgnoredRoutes().size).toBe(1);
    });

    it('should register routes for each version in multi-version controller', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestMultiVersionController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const appConfig = module.get(ApplicationConfig);
      vi.spyOn(appConfig, 'getGlobalPrefix').mockReturnValue('');
      vi.spyOn(appConfig, 'getGlobalPrefixOptions').mockReturnValue({});
      vi.spyOn(appConfig, 'getVersioning').mockReturnValue({
        type: VersioningType.URI,
      });

      await module.init();

      expect(getIgnoredRoutes().has('/v1/users')).toBe(true);
      expect(getIgnoredRoutes().has('/v2/users')).toBe(true);
      expect(getIgnoredRoutes().size).toBe(2);
    });

    it('should not add version segment for VERSION_NEUTRAL', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestVersionNeutralController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const appConfig = module.get(ApplicationConfig);
      vi.spyOn(appConfig, 'getGlobalPrefix').mockReturnValue('');
      vi.spyOn(appConfig, 'getGlobalPrefixOptions').mockReturnValue({});
      vi.spyOn(appConfig, 'getVersioning').mockReturnValue({
        type: VersioningType.URI,
      });

      await module.init();

      expect(getIgnoredRoutes().has('/users')).toBe(true);
      expect(getIgnoredRoutes().size).toBe(1);
    });

    it('should not add version segment for non-URI versioning types', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestVersionedController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const appConfig = module.get(ApplicationConfig);
      vi.spyOn(appConfig, 'getGlobalPrefix').mockReturnValue('');
      vi.spyOn(appConfig, 'getGlobalPrefixOptions').mockReturnValue({});
      vi.spyOn(appConfig, 'getVersioning').mockReturnValue({
        type: VersioningType.HEADER,
        header: 'X-API-Version',
      });

      await module.init();

      expect(getIgnoredRoutes().has('/users')).toBe(true);
      expect(getIgnoredRoutes().has('/v1/users')).toBe(false);
      expect(getIgnoredRoutes().size).toBe(1);
    });

    it('should use defaultVersion when controller has no explicit version', async () => {
      @Module({
        imports: [ObservabilityModule.forRoot()],
        controllers: [TestUnversionedUsersController],
      })
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestAppModule {}

      module = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const appConfig = module.get(ApplicationConfig);
      vi.spyOn(appConfig, 'getGlobalPrefix').mockReturnValue('');
      vi.spyOn(appConfig, 'getGlobalPrefixOptions').mockReturnValue({});
      vi.spyOn(appConfig, 'getVersioning').mockReturnValue({
        type: VersioningType.URI,
        defaultVersion: '1',
      });

      await module.init();

      expect(getIgnoredRoutes().has('/v1/users')).toBe(true);
      expect(getIgnoredRoutes().size).toBe(1);
    });
  });
});
