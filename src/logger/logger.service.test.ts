/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as api from '@opentelemetry/api';
import type { LoggerProvider } from '@opentelemetry/api-logs';
import { logs } from '@opentelemetry/api-logs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as maskUtils from '../utils/mask-sensitive-fields';
import { LOGGER_CONTEXT_KEY, LoggerService } from './logger.service';

describe('LoggerService', () => {
  let loggerService: LoggerService;
  let mockEmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock the OTEL logger
    mockEmit = vi.fn();
    vi.spyOn(logs, 'getLoggerProvider').mockReturnValue({
      getLogger: vi.fn().mockReturnValue({
        emit: mockEmit,
      }),
    } as LoggerProvider);

    loggerService = new LoggerService();
  });

  afterEach(() => {
    // Restore all mocks to prevent leakage between tests
    vi.restoreAllMocks();
  });

  describe('sensitive data masking', () => {
    it('should mask sensitive fields in log data', () => {
      const sensitiveData: Record<string, string> = {
        username: 'john_doe',
        password: 'secret123',
        apiKey: 'abc123',
        email: 'john@example.com',
        token: 'bearer_token_here',
      };

      loggerService.info('User login', sensitiveData);

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            username: 'john_doe',
            password: '****',
            apiKey: '****',
            email: '****',
            token: '****',
          }),
          body: 'User login',
          severityText: 'INFO',
        })
      );
    });

    it('should mask nested sensitive fields', () => {
      const nestedData: Record<string, unknown> = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret',
            apiKey: 'key123',
          },
        },
        settings: {
          public: true,
          secret: 'hidden',
        },
      };

      loggerService.info('User data', nestedData);

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            user: {
              name: 'John',
              credentials: {
                password: '****',
                apiKey: '****',
              },
            },
            settings: {
              public: true,
              secret: '****',
            },
          }),
        })
      );
    });

    it('should mask sensitive fields in error logs', () => {
      const errorData: Record<string, string> = {
        userId: '123',
        apiKey: 'secret_key',
        message: 'Authentication failed',
      };

      loggerService.error('Auth error', errorData);

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            userId: '123',
            apiKey: '****',
            message: 'Authentication failed',
          }),
          severityText: 'ERROR',
        })
      );
    });

    it('should mask sensitive fields in debug logs', () => {
      const debugData = {
        step: 'validation',
        password: 'test123',
        normalField: 'value',
      };

      loggerService.debug('Debug info', debugData);

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            step: 'validation',
            password: '****',
            normalField: 'value',
          }),
          severityText: 'DEBUG',
        })
      );
    });

    it('should mask sensitive fields in warn logs', () => {
      const warnData: Record<string, number | string> = {
        operation: 'payment',
        card: '1234567890123456',
        amount: 100,
      };

      loggerService.warn('Payment warning', warnData);

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            operation: 'payment',
            card: '****',
            amount: 100,
          }),
          severityText: 'WARN',
        })
      );
    });

    it('should mask sensitive fields in persistent context', () => {
      const loggerMap = new Map<string, unknown>();
      const ctx = api.context.active().setValue(LOGGER_CONTEXT_KEY, loggerMap);

      api.context.with(ctx, () => {
        loggerService.setContext({
          userId: '123',
          token: 'secret_token',
          environment: 'production',
        });

        loggerService.info('Operation completed', { operation: 'test' });

        expect(mockEmit).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({
              userId: '123',
              token: '****',
              environment: 'production',
              operation: 'test',
            }),
          })
        );
      });
    });

    it('should apply custom sensitive fields', () => {
      // Add custom sensitive field
      vi.spyOn(maskUtils, 'maskSensitiveFields').mockImplementation((data: unknown) => {
        const result = { ...(data as Record<string, unknown>) };
        if (result['customField']) result['customField'] = '****';
        return result;
      });

      loggerService.info('Custom test', { customField: 'sensitive', normalField: 'safe' });

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            customField: '****',
            normalField: 'safe',
          }),
        })
      );
    });
  });

  describe('context management', () => {
    it('should maintain persistent context within request scope', () => {
      // Initialize request-scoped context
      const loggerMap = new Map<string, unknown>();
      const ctx = api.context.active().setValue(LOGGER_CONTEXT_KEY, loggerMap);

      api.context.with(ctx, () => {
        loggerService.setContext({ requestId: 'req-123' });

        loggerService.info('First log', { step: 1 });
        loggerService.info('Second log', { step: 2 });

        expect(mockEmit).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            attributes: expect.objectContaining({
              requestId: 'req-123',
              step: 1,
            }),
          })
        );

        expect(mockEmit).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            attributes: expect.objectContaining({
              requestId: 'req-123',
              step: 2,
            }),
          })
        );
      });
    });

    it('should clear context', () => {
      const loggerMap = new Map<string, unknown>();
      const ctx = api.context.active().setValue(LOGGER_CONTEXT_KEY, loggerMap);

      api.context.with(ctx, () => {
        loggerService.setContext({ requestId: 'req-123' });
        loggerService.clearContext();

        loggerService.info('After clear', { step: 1 });

        expect(mockEmit).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.not.objectContaining({
              requestId: expect.anything(),
            }),
          })
        );
      });
    });

    it('should get context as plain object', () => {
      const loggerMap = new Map<string, unknown>();
      const ctx = api.context.active().setValue(LOGGER_CONTEXT_KEY, loggerMap);

      api.context.with(ctx, () => {
        loggerService.addContext('userId', '123');
        loggerService.addContext('requestId', 'req-456');

        const context = loggerService.getContext();

        expect(context).toEqual({
          userId: '123',
          requestId: 'req-456',
        });
      });
    });

    it('should return empty object when getting context outside request scope', () => {
      const context = loggerService.getContext();
      expect(context).toEqual({});
    });

    it('should warn when addContext called outside request scope', () => {
      const warnSpy = vi.spyOn(loggerService, 'warn');

      // Call outside any context
      loggerService.addContext('key', 'value');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Logger context unavailable'),
        expect.objectContaining({
          guidance: expect.stringContaining('withContext'),
          location: expect.any(String),
        })
      );
    });

    it('should warn when setContext called outside request scope', () => {
      const warnSpy = vi.spyOn(loggerService, 'warn');

      // Call outside any context
      loggerService.setContext({ key: 'value' });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Logger context unavailable'),
        expect.objectContaining({
          contextKeys: ['key'],
          guidance: expect.stringContaining('withContext'),
        })
      );
    });

    it('should warn when creating child logger without parent context', () => {
      const warnSpy = vi.spyOn(loggerService, 'warn');

      loggerService.createChildLogger();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Creating child logger without parent context'),
        expect.objectContaining({
          guidance: expect.any(String),
        })
      );
    });
  });

  describe('isContextAvailable diagnostic', () => {
    it('should return false when no context exists', () => {
      expect(loggerService.isContextAvailable()).toBe(false);
    });

    it('should return true when context exists', () => {
      const loggerMap = new Map<string, unknown>();
      const ctx = api.context.active().setValue(LOGGER_CONTEXT_KEY, loggerMap);

      api.context.with(ctx, () => {
        expect(loggerService.isContextAvailable()).toBe(true);
      });
    });
  });

  describe('log levels', () => {
    it('should handle info logs', () => {
      loggerService.info('Info message', { key: 'value' });

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Info message',
          severityText: 'INFO',
        })
      );
    });

    it('should handle error logs', () => {
      loggerService.error('Error message', { key: 'value' });

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Error message',
          severityText: 'ERROR',
        })
      );
    });

    it('should handle warn logs', () => {
      loggerService.warn('Warning message', { key: 'value' });

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Warning message',
          severityText: 'WARN',
        })
      );
    });

    it('should handle debug logs', () => {
      loggerService.debug('Debug message', { key: 'value' });

      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Debug message',
          severityText: 'DEBUG',
        })
      );
    });
  });

  describe('context isolation', () => {
    it('should isolate context between concurrent requests', async () => {
      const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

      const request1Promise = (async () => {
        const loggerMap1 = new Map<string, unknown>();
        const ctx1 = api.context.active().setValue(LOGGER_CONTEXT_KEY, loggerMap1);

        return api.context.with(ctx1, async () => {
          loggerService.addContext('requestId', 'req-1');
          await delay(10);
          const context = loggerService.getContext();
          expect(context).toEqual({ requestId: 'req-1' });
        });
      })();

      const request2Promise = (async () => {
        const loggerMap2 = new Map<string, unknown>();
        const ctx2 = api.context.active().setValue(LOGGER_CONTEXT_KEY, loggerMap2);

        return api.context.with(ctx2, async () => {
          loggerService.addContext('requestId', 'req-2');
          await delay(5);
          const context = loggerService.getContext();
          expect(context).toEqual({ requestId: 'req-2' });
        });
      })();

      await Promise.all([request1Promise, request2Promise]);
    });

    it('should maintain context through async operations', async () => {
      const loggerMap = new Map<string, unknown>();
      const ctx = api.context.active().setValue(LOGGER_CONTEXT_KEY, loggerMap);

      await api.context.with(ctx, async () => {
        loggerService.addContext('requestId', 'req-async');

        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 2));

        // Context should still be available
        const context = loggerService.getContext();
        expect(context).toEqual({ requestId: 'req-async' });

        loggerService.info('Async operation', { step: 1 });
        expect(mockEmit).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({
              requestId: 'req-async',
              step: 1,
            }),
          })
        );
      });
    });
  });

  describe('child logger', () => {
    it('should create child logger with isolated context', () => {
      const loggerMap = new Map<string, unknown>();
      const ctx = api.context.active().setValue(LOGGER_CONTEXT_KEY, loggerMap);

      api.context.with(ctx, () => {
        loggerService.addContext('parent', 'value');

        const childLogger = loggerService.createChildLogger();
        childLogger.addContext('child', 'value');

        // Parent should only have parent context
        expect(loggerService.getContext()).toEqual({ parent: 'value' });

        // Child should have both parent and child context
        expect(childLogger.getContext()).toEqual({ parent: 'value', child: 'value' });
      });
    });

    it('should isolate child logger modifications from parent', () => {
      const loggerMap = new Map<string, unknown>();
      const ctx = api.context.active().setValue(LOGGER_CONTEXT_KEY, loggerMap);

      api.context.with(ctx, () => {
        loggerService.addContext('shared', 'initial');

        const childLogger = loggerService.createChildLogger();
        childLogger.addContext('shared', 'modified');
        childLogger.addContext('childOnly', 'value');

        // Parent context should remain unchanged
        expect(loggerService.getContext()).toEqual({ shared: 'initial' });

        // Child should have its own modified context
        expect(childLogger.getContext()).toEqual({
          shared: 'modified',
          childOnly: 'value',
        });
      });
    });

    it('should support multiple child loggers with isolated contexts', () => {
      const loggerMap = new Map<string, unknown>();
      const ctx = api.context.active().setValue(LOGGER_CONTEXT_KEY, loggerMap);

      api.context.with(ctx, () => {
        loggerService.addContext('parent', 'value');

        const child1 = loggerService.createChildLogger();
        const child2 = loggerService.createChildLogger();

        child1.addContext('child1', 'value1');
        child2.addContext('child2', 'value2');

        expect(loggerService.getContext()).toEqual({ parent: 'value' });
        expect(child1.getContext()).toEqual({ parent: 'value', child1: 'value1' });
        expect(child2.getContext()).toEqual({ parent: 'value', child2: 'value2' });
      });
    });

    it('should create child logger without context when parent has no context', () => {
      // No context initialized
      const childLogger = loggerService.createChildLogger();

      expect(childLogger).toBeInstanceOf(LoggerService);
      expect(childLogger.getContext()).toEqual({});
    });
  });

  describe('withContext utility', () => {
    it('should execute function within new logger context', async () => {
      await loggerService.withContext(() => {
        loggerService.addContext('jobId', 'job-123');
        loggerService.info('Background job', { step: 1 });

        expect(mockEmit).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({
              jobId: 'job-123',
              step: 1,
            }),
          })
        );
      });
    });

    it('should support async functions in withContext', async () => {
      await loggerService.withContext(async () => {
        loggerService.addContext('jobId', 'job-async');

        await new Promise((resolve) => setTimeout(resolve, 5));

        loggerService.info('Async job', { step: 1 });

        expect(mockEmit).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({
              jobId: 'job-async',
              step: 1,
            }),
          })
        );
      });
    });

    it('should isolate withContext from external context', async () => {
      const loggerMap = new Map<string, unknown>();
      const ctx = api.context.active().setValue(LOGGER_CONTEXT_KEY, loggerMap);

      await api.context.with(ctx, async () => {
        loggerService.addContext('external', 'value');

        await loggerService.withContext(async () => {
          // Should not see external context
          expect(loggerService.getContext()).toEqual({});

          loggerService.addContext('internal', 'value');
          expect(loggerService.getContext()).toEqual({ internal: 'value' });

          return Promise.resolve();
        });

        // External context should remain unchanged
        expect(loggerService.getContext()).toEqual({ external: 'value' });
      });
    });
  });
});
