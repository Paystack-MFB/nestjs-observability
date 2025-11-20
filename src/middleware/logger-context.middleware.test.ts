// Test file for LoggerContextMiddleware using AsyncLocalStorage
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoggerContextMiddleware } from './logger-context.middleware';
import * as contextStorage from '../logger/logger-context-storage';

describe('LoggerContextMiddleware', () => {
  let middleware: LoggerContextMiddleware;

  beforeEach(() => {
    middleware = new LoggerContextMiddleware();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should be instantiable', () => {
      expect(middleware).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(middleware.use).toBeDefined();
    });

    it('should accept middleware parameters', () => {
      const next = vi.fn();
      expect(() => {
        middleware.use({}, {}, next);
      }).not.toThrow();
    });
  });

  describe('Context Initialization', () => {
    it('should execute next callback', () => {
      const next = vi.fn();
      middleware.use({}, {}, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from next()', () => {
      const error = new Error('Next handler error');
      const next = vi.fn().mockImplementation(() => {
        throw error;
      });

      expect(() => {
        middleware.use({}, {}, next);
      }).toThrow('Next handler error');
    });
  });

  describe('Context Availability', () => {
    it('should make context available during next() execution', () => {
      let contextWasAvailable = false;

      const next = vi.fn(() => {
        contextWasAvailable = contextStorage.isLoggerContextAvailable();
      });

      middleware.use({}, {}, next);

      expect(contextWasAvailable).toBe(true);
    });

    it('should allow setting context values during next() execution', () => {
      let setSuccess = false;
      let getValue = '';

      const next = vi.fn(() => {
        setSuccess = contextStorage.setLoggerContextValue('testKey', 'testValue');
        getValue = contextStorage.getLoggerContextValue('testKey') as string;
      });

      middleware.use({}, {}, next);

      expect(setSuccess).toBe(true);
      expect(getValue).toBe('testValue');
    });
  });

  describe('Request Parameter Handling', () => {
    it('should handle various request/response types', () => {
      expect(() => {
        middleware.use({}, {}, vi.fn());
        middleware.use({ method: 'GET', url: '/' }, {}, vi.fn());
        middleware.use(undefined, undefined, vi.fn());
        middleware.use({}, { statusCode: 200 }, vi.fn());
        middleware.use({}, undefined, vi.fn());
      }).not.toThrow();
    });

    it('should not require accessing req or res properties', () => {
      const readOnlyReq = Object.freeze({});
      const readOnlyRes = Object.freeze({});

      expect(() => {
        middleware.use(readOnlyReq, readOnlyRes, vi.fn());
      }).not.toThrow();
    });
  });

  describe('Middleware Execution Flow', () => {
    it('should return void', () => {
      middleware.use({}, {}, vi.fn());
      // Method returns void, as expected from NestMiddleware
    });

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

      const next1 = vi.fn();
      const next2 = vi.fn();

      expect(() => {
        middleware1.use({}, {}, next1);
        middleware2.use({}, {}, next2);
      }).not.toThrow();

      expect(next1).toHaveBeenCalled();
      expect(next2).toHaveBeenCalled();
    });
  });

  describe('Context Isolation', () => {
    it('should create isolated contexts for sequential requests', () => {
      const results: string[] = [];

      const next1 = vi.fn(() => {
        contextStorage.setLoggerContextValue('request', 'req1');
        results.push(contextStorage.getLoggerContextValue('request') as string);
      });

      const next2 = vi.fn(() => {
        contextStorage.setLoggerContextValue('request', 'req2');
        results.push(contextStorage.getLoggerContextValue('request') as string);
      });

      middleware.use({}, {}, next1);
      middleware.use({}, {}, next2);

      expect(results).toEqual(['req1', 'req2']);
    });

    it('should not leak context between requests', () => {
      let contextInSecondRequest = false;

      const next1 = vi.fn(() => {
        contextStorage.setLoggerContextValue('leak', 'value');
      });

      const next2 = vi.fn(() => {
        contextInSecondRequest = contextStorage.getLoggerContextValue('leak') !== undefined;
      });

      middleware.use({}, {}, next1);
      middleware.use({}, {}, next2);

      expect(contextInSecondRequest).toBe(false);
    });
  });
});
