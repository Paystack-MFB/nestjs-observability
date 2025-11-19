/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/unbound-method */
// Test file requires flexibility for mocking third-party OpenTelemetry API
import * as api from '@opentelemetry/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOGGER_CONTEXT_KEY } from '../logger/logger.service';
import { LoggerContextMiddleware } from './logger-context.middleware';

describe('LoggerContextMiddleware', () => {
  let middleware: LoggerContextMiddleware;
  let nextSpy: ReturnType<typeof vi.fn>;
  let mockContext: any;
  let mockNewContext: any;

  beforeEach(() => {
    middleware = new LoggerContextMiddleware();
    nextSpy = vi.fn();

    // Create mock context objects
    const mockContextMap = new Map<string, unknown>();

    mockNewContext = {
      getValue: vi.fn((key) => (key === LOGGER_CONTEXT_KEY ? mockContextMap : undefined)),
      setValue: vi.fn(),
      deleteValue: vi.fn(),
    };

    mockContext = {
      getValue: vi.fn((key) => (key === LOGGER_CONTEXT_KEY ? mockContextMap : undefined)),
      setValue: vi.fn().mockReturnValue(mockNewContext),
      deleteValue: vi.fn(),
    };

    // Mock OpenTelemetry context API
    vi.spyOn(api.context, 'active').mockReturnValue(mockContext);
    vi.spyOn(api.context, 'with').mockImplementation((_context: unknown, fn: () => unknown) => {
      return fn();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Context Initialization', () => {
    it('should get the active OpenTelemetry context', () => {
      middleware.use({}, {}, nextSpy);

      expect(api.context.active).toHaveBeenCalled();
    });

    it('should create a new context with LOGGER_CONTEXT_KEY and a Map', () => {
      middleware.use({}, {}, nextSpy);

      expect(mockContext.setValue).toHaveBeenCalledWith(LOGGER_CONTEXT_KEY, expect.any(Map));
    });

    it('should set the context map to an empty Map initially', () => {
      middleware.use({}, {}, nextSpy);

      const [key, value] = (mockContext.setValue as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(key).toBe(LOGGER_CONTEXT_KEY);
      expect(value).toBeInstanceOf(Map);
      expect(value.size).toBe(0);
    });

    it('should create a separate Map instance for each request', () => {
      const maps: Map<string, unknown>[] = [];

      mockContext.setValue.mockImplementation((key: unknown, value: unknown) => {
        if (key === LOGGER_CONTEXT_KEY) {
          maps.push(value as Map<string, unknown>);
        }
        return mockNewContext;
      });

      middleware.use({}, {}, vi.fn());
      middleware.use({}, {}, vi.fn());

      expect(maps).toHaveLength(2);
      expect(maps[0]).not.toBe(maps[1]);
    });
  });

  describe('Context Wrapping', () => {
    it('should call api.context.with() with the new context and a callback', () => {
      middleware.use({}, {}, nextSpy);

      expect(api.context.with).toHaveBeenCalledWith(mockNewContext, expect.any(Function));
    });

    it('should pass the new context (from setValue) to api.context.with()', () => {
      middleware.use({}, {}, nextSpy);

      const calls = (api.context.with as ReturnType<typeof vi.fn>).mock.calls;
      const contextArg = calls[0][0];

      expect(contextArg).toBe(mockNewContext);
    });

    it('should wrap next() in the context callback', () => {
      middleware.use({}, {}, nextSpy);

      expect(api.context.with).toHaveBeenCalled();
      expect(nextSpy).toHaveBeenCalled();
    });
  });

  describe('Middleware Execution Flow', () => {
    it('should call next() during request processing', () => {
      middleware.use({}, {}, nextSpy);

      expect(nextSpy).toHaveBeenCalledTimes(1);
    });

    it('should call next() within the context scope', () => {
      const executionOrder: string[] = [];

      vi.mocked(api.context.with).mockImplementation((_context: unknown, fn: () => unknown) => {
        executionOrder.push('enter-context');

        const result = fn();
        executionOrder.push('exit-context');
        return result;
      });

      nextSpy.mockImplementation(() => {
        executionOrder.push('next-called');
      });

      middleware.use({}, {}, nextSpy);

      expect(executionOrder).toEqual(['enter-context', 'next-called', 'exit-context']);
    });

    it('should complete without errors for normal requests', () => {
      expect(() => {
        middleware.use({}, {}, nextSpy);
      }).not.toThrow();
    });

    it('should return void', () => {
      // Method returns void, so we just verify it doesn't throw
      expect(() => {
        middleware.use({}, {}, nextSpy);
      }).not.toThrow();
    });
  });

  describe('Request Parameter Handling', () => {
    it('should accept any request parameter type', () => {
      expect(() => {
        middleware.use({}, {}, nextSpy);
      }).not.toThrow();

      expect(() => {
        middleware.use({ method: 'GET', url: '/' }, {}, nextSpy);
      }).not.toThrow();

      expect(() => {
        middleware.use(undefined, undefined, nextSpy);
      }).not.toThrow();
    });

    it('should accept any response parameter type', () => {
      expect(() => {
        middleware.use({}, {}, nextSpy);
      }).not.toThrow();

      expect(() => {
        middleware.use({}, { statusCode: 200 }, nextSpy);
      }).not.toThrow();

      expect(() => {
        middleware.use({}, undefined, nextSpy);
      }).not.toThrow();
    });

    it('should not require accessing req or res properties', () => {
      // Verify middleware doesn't try to access req/res
      const readOnlyReq = Object.freeze({});
      const readOnlyRes = Object.freeze({});

      expect(() => {
        middleware.use(readOnlyReq, readOnlyRes, nextSpy);
      }).not.toThrow();
    });
  });

  describe('OpenTelemetry Integration', () => {
    it('should call api.context.active() exactly once', () => {
      middleware.use({}, {}, nextSpy);

      expect(vi.mocked(api.context.active)).toHaveBeenCalledTimes(1);
    });

    it('should call setValue() exactly once with LOGGER_CONTEXT_KEY', () => {
      middleware.use({}, {}, nextSpy);

      expect(mockContext.setValue).toHaveBeenCalledTimes(1);
      expect(mockContext.setValue).toHaveBeenCalledWith(LOGGER_CONTEXT_KEY, expect.any(Map));
    });

    it('should call api.context.with() exactly once', () => {
      middleware.use({}, {}, nextSpy);

      expect(vi.mocked(api.context.with)).toHaveBeenCalledTimes(1);
    });

    it('should verify the new context can retrieve the context map via getValue', () => {
      middleware.use({}, {}, nextSpy);

      // Get the setValue call to find the map
      const [, contextMap] = (mockContext.setValue as ReturnType<typeof vi.fn>).mock.calls[0];

      // Verify the new context would return this map
      const result = mockNewContext.getValue(LOGGER_CONTEXT_KEY);
      expect(result).toStrictEqual(contextMap);
    });
  });

  describe('Context Isolation', () => {
    it('should create separate Map instances for concurrent requests', () => {
      const maps: Map<string, unknown>[] = [];

      mockContext.setValue.mockImplementation((key: unknown, value: unknown) => {
        if (key === LOGGER_CONTEXT_KEY) {
          maps.push(value as Map<string, unknown>);
        }
        return mockNewContext;
      });

      const next1 = vi.fn();
      const next2 = vi.fn();

      middleware.use({}, {}, next1);
      middleware.use({}, {}, next2);

      expect(maps).toHaveLength(2);
      expect(maps[0]).not.toBe(maps[1]);
    });

    it('should not allow context leakage between requests', () => {
      const contexts: any[] = [];

      mockContext.setValue.mockImplementation((key: unknown, value: unknown) => {
        if (key === LOGGER_CONTEXT_KEY) {
          contexts.push(value);
        }
        return mockNewContext;
      });

      // First request
      middleware.use({}, {}, vi.fn());
      const firstMap = contexts[0];

      // Second request
      middleware.use({}, {}, vi.fn());
      const secondMap = contexts[1];

      // Modify first map
      firstMap.set('test', 'value1');

      // Second map should not have the modification
      expect(secondMap.has('test')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle next() throwing an error', () => {
      const nextError = vi.fn().mockImplementation(() => {
        throw new Error('Next handler error');
      });

      expect(() => {
        middleware.use({}, {}, nextError);
      }).toThrow('Next handler error');
    });

    it('should still set up context even if next() throws', () => {
      const nextError = vi.fn().mockImplementation(() => {
        throw new Error('Next handler error');
      });

      try {
        middleware.use({}, {}, nextError);
      } catch {
        // Expected
      }

      // Verify context setup was attempted

      expect(mockContext.setValue).toHaveBeenCalledWith(LOGGER_CONTEXT_KEY, expect.any(Map));
    });

    it('should handle api.context.with() errors', () => {
      vi.mocked(api.context.with).mockImplementation(() => {
        throw new Error('Context error');
      });

      expect(() => {
        middleware.use({}, {}, nextSpy);
      }).toThrow('Context error');
    });

    it('should handle api.context.active() errors', () => {
      vi.mocked(api.context.active).mockImplementation(() => {
        throw new Error('Active context error');
      });

      expect(() => {
        middleware.use({}, {}, nextSpy);
      }).toThrow('Active context error');
    });

    it('should handle setValue() errors', () => {
      mockContext.setValue.mockImplementation(() => {
        throw new Error('SetValue error');
      });

      expect(() => {
        middleware.use({}, {}, nextSpy);
      }).toThrow('SetValue error');
    });
  });

  describe('Context Availability', () => {
    it('should make the context Map retrievable via getValue after initialization', () => {
      middleware.use({}, {}, nextSpy);

      // Get the map that was passed to setValue
      const [, contextMap] = (mockContext.setValue as ReturnType<typeof vi.fn>).mock.calls[0];

      // Verify it's retrievable from the new context
      const retrieved = mockNewContext.getValue(LOGGER_CONTEXT_KEY);
      expect(retrieved).toStrictEqual(contextMap);
    });

    it('should provide empty Map for new requests', () => {
      middleware.use({}, {}, nextSpy);

      const [, contextMap] = (mockContext.setValue as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(contextMap).toBeInstanceOf(Map);
      expect(contextMap.size).toBe(0);
    });
  });

  describe('Integration Behavior', () => {
    it('should enable multiple middleware calls in sequence', () => {
      const next1 = vi.fn();
      const next2 = vi.fn();
      const next3 = vi.fn();

      expect(() => {
        middleware.use({}, {}, next1);
        middleware.use({}, {}, next2);
        middleware.use({}, {}, next3);
      }).not.toThrow();

      expect(next1).toHaveBeenCalled();
      expect(next2).toHaveBeenCalled();
      expect(next3).toHaveBeenCalled();
    });

    it('should be instantiable and reusable', () => {
      const middleware1 = new LoggerContextMiddleware();
      const middleware2 = new LoggerContextMiddleware();

      expect(() => {
        middleware1.use({}, {}, vi.fn());
        middleware2.use({}, {}, vi.fn());
      }).not.toThrow();

      // Both should have been called
      expect(api.context.with).toHaveBeenCalledTimes(2);
    });
  });
});
