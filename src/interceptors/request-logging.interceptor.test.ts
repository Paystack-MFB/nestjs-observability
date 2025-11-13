import { CallHandler, ExecutionContext } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError, lastValueFrom } from 'rxjs';

import { LoggerService } from '../logger/logger.service';
import { RequestLoggingInterceptor } from './request-logging.interceptor';
import * as spanUtils from '../utils/span-attributes';
import * as register from '../register';

describe('RequestLoggingInterceptor', () => {
  let interceptor: RequestLoggingInterceptor;
  let loggerInfoSpy: ReturnType<typeof vi.fn>;
  let loggerErrorSpy: ReturnType<typeof vi.fn>;
  let executionContext: ExecutionContext;
  let callHandler: CallHandler;

  beforeEach(() => {
    loggerInfoSpy = vi.fn();
    loggerErrorSpy = vi.fn();
    const logger = {
      info: loggerInfoSpy,
      error: loggerErrorSpy,
    } as unknown as LoggerService;

    interceptor = new RequestLoggingInterceptor(logger);

    // Mock execution context
    executionContext = {
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      getClass: vi.fn().mockReturnValue(class TestController {}),
      getHandler: vi.fn().mockReturnValue({ name: 'testMethod' }),
      getType: vi.fn().mockReturnValue('http'),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          body: { amount: 1000, password: 'secret123' },
          connection: { remoteAddress: '127.0.0.1' },
          headers: { 'user-agent': 'test-agent', token: 'secret-token' },
          method: 'POST',
          query: { page: '1', apiKey: 'test-key' },
          url: '/api/test',
        }),
        getResponse: vi.fn().mockReturnValue({
          statusCode: 200,
        }),
      }),
    } as unknown as ExecutionContext;

    // Mock call handler
    callHandler = {
      handle: vi.fn().mockReturnValue(of({ success: true, token: 'response-token' })),
    } as unknown as CallHandler;

    // Mock utility functions
    vi.spyOn(register, 'getServiceName').mockReturnValue('test-service');
    vi.spyOn(register, 'getServiceEnvironment').mockReturnValue('test');
    vi.spyOn(register, 'getHttpRequestLoggingEnabled').mockReturnValue(true);
    vi.spyOn(spanUtils, 'getCurrentTraceId').mockReturnValue('trace-123');
    vi.spyOn(spanUtils, 'getCurrentSpanId').mockReturnValue('span-456');
  });

  it('should log request and response with masked sensitive data', async () => {
    await lastValueFrom(interceptor.intercept(executionContext, callHandler));

    // Verify request log
    expect(loggerInfoSpy).toHaveBeenCalledWith(
      'HTTP Request',

      expect.objectContaining({
        service: 'test-service',
        type: 'request',
        level: 'info',
        environment: 'test',
        endpoint: '/api/test',
        traceId: 'trace-123',
        spanId: 'span-456',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        payload: expect.objectContaining({
          verb: 'POST',
          client: '127.0.0.1',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          headers: expect.objectContaining({
            'user-agent': 'test-agent',
            token: '****',
          }),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          query: expect.objectContaining({
            page: '1',
            apiKey: '****',
          }),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          body: expect.objectContaining({
            amount: 1000,
            password: '****',
          }),
        }),
      })
    );

    // Verify response log
    expect(loggerInfoSpy).toHaveBeenCalledWith(
      'HTTP Response',

      expect.objectContaining({
        service: 'test-service',
        type: 'response',
        level: 'info',
        environment: 'test',
        endpoint: '/api/test',
        traceId: 'trace-123',
        spanId: 'span-456',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        payload: expect.objectContaining({
          verb: 'POST',
          client: '127.0.0.1',
          status: 200,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          body: expect.objectContaining({
            success: true,
            token: '****',
          }),
        }),
      })
    );
  });

  it('should handle errors and log error response', async () => {
    const error = new Error('Test error');
    callHandler.handle = vi.fn().mockReturnValue(throwError(() => error));

    try {
      await lastValueFrom(interceptor.intercept(executionContext, callHandler));
    } catch {
      // Expected to throw
    }

    // Verify error log
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'HTTP Response Error',

      expect.objectContaining({
        service: 'test-service',
        type: 'response',
        level: 'error',
        endpoint: '/api/test',
        error: 'Test error',
      })
    );
  });

  it('should extract client IP from x-forwarded-for header', async () => {
    executionContext.switchToHttp = vi.fn().mockReturnValue({
      getRequest: vi.fn().mockReturnValue({
        body: {},
        connection: { remoteAddress: '127.0.0.1' },
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
        method: 'GET',
        url: '/api/test',
      }),
      getResponse: vi.fn().mockReturnValue({ statusCode: 200 }),
    });

    await lastValueFrom(interceptor.intercept(executionContext, callHandler));

    expect(loggerInfoSpy).toHaveBeenCalledWith(
      'HTTP Request',

      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        payload: expect.objectContaining({
          client: '192.168.1.1',
        }),
      })
    );
  });

  it('should calculate age with Age header', async () => {
    executionContext.switchToHttp = vi.fn().mockReturnValue({
      getRequest: vi.fn().mockReturnValue({
        body: {},
        connection: { remoteAddress: '127.0.0.1' },
        headers: { age: '100' },
        method: 'GET',
        url: '/api/test',
      }),
      getResponse: vi.fn().mockReturnValue({ statusCode: 200 }),
    });

    await lastValueFrom(interceptor.intercept(executionContext, callHandler));

    expect(loggerInfoSpy).toHaveBeenCalledWith(
      'HTTP Request',
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        age: expect.any(Number),
      })
    );

    // Age should be at least 100 (from header)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const requestLog = loggerInfoSpy.mock.calls[0][1];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(requestLog.age).toBeGreaterThanOrEqual(100);
  });

  it('should skip logging for non-HTTP contexts', async () => {
    executionContext.getType = vi.fn().mockReturnValue('rpc');

    await lastValueFrom(interceptor.intercept(executionContext, callHandler));

    expect(loggerInfoSpy).not.toHaveBeenCalled();
  });

  it('should skip logging when OTEL_LOG_HTTP_REQUESTS is disabled', async () => {
    vi.spyOn(register, 'getHttpRequestLoggingEnabled').mockReturnValue(false);

    await lastValueFrom(interceptor.intercept(executionContext, callHandler));

    expect(loggerInfoSpy).not.toHaveBeenCalled();
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it('should respect @NoLogClass decorator', async () => {
    // Test that when @NoLogClass is applied, the interceptor checks for it
    // The actual decorator functionality is tested in auto-trace.decorators.test.ts
    // Here we just verify the interceptor calls the check function

    // Create a controller class and manually set the metadata
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class TestControllerWithNoLog {}
    Reflect.defineMetadata('log:no-log-class', true, TestControllerWithNoLog);

    // Update execution context to use the decorated class
    executionContext.getClass = vi.fn().mockReturnValue(TestControllerWithNoLog);

    await lastValueFrom(interceptor.intercept(executionContext, callHandler));

    // Since we're using the real isNoLogClassEnabled function which checks metadata,
    // and we've set the metadata, logging should be skipped
    expect(loggerInfoSpy).not.toHaveBeenCalled();
  });

  it('should include created timestamp in ISO format', async () => {
    await lastValueFrom(interceptor.intercept(executionContext, callHandler));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const requestLog = loggerInfoSpy.mock.calls[0][1];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(requestLog.created).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should handle missing headers gracefully', async () => {
    executionContext.switchToHttp = vi.fn().mockReturnValue({
      getRequest: vi.fn().mockReturnValue({
        body: {},
        connection: {},
        method: 'GET',
        url: '/api/test',
      }),
      getResponse: vi.fn().mockReturnValue({ statusCode: 200 }),
    });

    await lastValueFrom(interceptor.intercept(executionContext, callHandler));

    expect(loggerInfoSpy).toHaveBeenCalledTimes(2);
  });
});
