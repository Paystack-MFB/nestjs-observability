/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LoggerProvider } from '@opentelemetry/api-logs';
import { logs } from '@opentelemetry/api-logs';

import { LoggerService } from './logger.service';
import * as maskUtils from '../utils/mask-sensitive-fields';

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
    it('should maintain persistent context', () => {
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

    it('should clear context', () => {
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
});
