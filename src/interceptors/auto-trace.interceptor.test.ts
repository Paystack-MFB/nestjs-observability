/* eslint-disable @typescript-eslint/unbound-method */
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { Span, trace } from '@opentelemetry/api';

import { AutoTraceInterceptor } from './auto-trace.interceptor';
import { LoggerService } from '../logger/logger.service';
import { MetricsService } from '../metrics/metrics.service';
import { runWithLoggerContext, setLoggerContextValue } from '../logger/logger-context-storage';

describe('AutoTraceInterceptor - Tag Functionality', () => {
  let interceptor: AutoTraceInterceptor;
  let mockLogger: LoggerService;
  let mockMetrics: MetricsService;
  let mockSpan: Span;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let startActiveSpanSpy: ReturnType<typeof vi.fn>;
  let mockTracer: ReturnType<typeof trace.getTracer>;

  beforeEach(() => {
    mockSpan = {
      setAttribute: vi.fn(),
      setStatus: vi.fn(),
      recordException: vi.fn(),
      end: vi.fn(),
    } as unknown as Span;

    startActiveSpanSpy = vi.fn((_name: string, fn: (span: Span) => unknown) => {
      return fn(mockSpan);
    });
    mockTracer = {
      startActiveSpan: startActiveSpanSpy,
    } as unknown as ReturnType<typeof trace.getTracer>;

    vi.spyOn(trace, 'getTracer').mockReturnValue(mockTracer);

    mockLogger = {
      getContext: vi.fn().mockReturnValue({}),
      error: vi.fn(),
      warn: vi.fn(),
    } as unknown as LoggerService;

    mockMetrics = {
      recordHttpRequest: vi.fn(),
    } as unknown as MetricsService;

    interceptor = new AutoTraceInterceptor(mockMetrics, mockLogger);

    mockContext = {
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      getClass: vi.fn().mockReturnValue(class TestController {}),
      getHandler: vi.fn().mockReturnValue({ name: 'testMethod' }),
      getType: vi.fn().mockReturnValue('http'),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          method: 'GET',
          url: '/test',
        }),
        getResponse: vi.fn().mockReturnValue({
          statusCode: 200,
        }),
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: vi.fn().mockReturnValue(of({ success: true })),
    } as unknown as CallHandler;
  });

  it('should add tag to span attributes when tag present in context', async () => {
    await runWithLoggerContext(async () => {
      setLoggerContextValue('tag', 'test-tag-123');
      vi.spyOn(mockLogger, 'getContext').mockReturnValue({ tag: 'test-tag-123' });

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockContext, mockCallHandler).subscribe({
          complete: () => {
            resolve();
          },
          error: () => {
            resolve();
          },
        });
      });

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('tag', 'test-tag-123');
    });
  });

  it('should not add tag to span when tag not in context', async () => {
    await runWithLoggerContext(async () => {
      vi.spyOn(mockLogger, 'getContext').mockReturnValue({});

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockContext, mockCallHandler).subscribe({
          complete: () => {
            resolve();
          },
          error: () => {
            resolve();
          },
        });
      });

      const tagCalls = (mockSpan.setAttribute as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[0] === 'tag'
      );
      expect(tagCalls).toHaveLength(0);
    });
  });

  it('should not add tag to span when tag is not a string', async () => {
    await runWithLoggerContext(async () => {
      vi.spyOn(mockLogger, 'getContext').mockReturnValue({ tag: 123 });

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockContext, mockCallHandler).subscribe({
          complete: () => {
            resolve();
          },
          error: () => {
            resolve();
          },
        });
      });

      const tagCalls = (mockSpan.setAttribute as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[0] === 'tag'
      );
      expect(tagCalls).toHaveLength(0);
    });
  });

  it('should not add tag to span when tag is empty string', async () => {
    await runWithLoggerContext(async () => {
      vi.spyOn(mockLogger, 'getContext').mockReturnValue({ tag: '' });

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockContext, mockCallHandler).subscribe({
          complete: () => {
            resolve();
          },
          error: () => {
            resolve();
          },
        });
      });

      const tagCalls = (mockSpan.setAttribute as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[0] === 'tag'
      );
      expect(tagCalls).toHaveLength(0);
    });
  });

  it('should add tag along with other span attributes', async () => {
    await runWithLoggerContext(async () => {
      setLoggerContextValue('tag', 'test-tag-456');
      vi.spyOn(mockLogger, 'getContext').mockReturnValue({ tag: 'test-tag-456' });

      await new Promise<void>((resolve) => {
        interceptor.intercept(mockContext, mockCallHandler).subscribe({
          complete: () => {
            resolve();
          },
          error: () => {
            resolve();
          },
        });
      });

      expect(mockSpan.setAttribute).toHaveBeenCalledWith('tag', 'test-tag-456');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('controller.name', 'TestController');
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('controller.method', 'testMethod');
    });
  });
});
