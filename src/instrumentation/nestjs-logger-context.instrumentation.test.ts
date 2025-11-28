import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NestJSLoggerContextInstrumentation } from './nestjs-logger-context.instrumentation';

vi.mock('../logger/logger-context-storage', () => ({
  initializeRequestLoggerContext: vi.fn(),
  setLoggerContextValue: vi.fn(),
}));

vi.mock('../utils/tag-extractor', () => ({
  extractTag: vi.fn(),
}));

describe('NestJSLoggerContextInstrumentation', () => {
  let instrumentation: NestJSLoggerContextInstrumentation;

  beforeEach(() => {
    instrumentation = new NestJSLoggerContextInstrumentation();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create instrumentation with correct name', () => {
      expect(instrumentation.instrumentationName).toContain('nestjs-logger-context');
    });

    it('should have VERSION set', () => {
      expect(instrumentation.instrumentationVersion).toBeDefined();
    });
  });

  describe('Basic functionality', () => {
    it('should not throw when instantiated', () => {
      expect(() => new NestJSLoggerContextInstrumentation()).not.toThrow();
    });

    it('should accept optional config', () => {
      const config = {};
      expect(() => new NestJSLoggerContextInstrumentation(config)).not.toThrow();
    });
  });

  describe('Tag Extraction', () => {
    it('should extract tag from tag header and store in logger context', async () => {
      const { initializeRequestLoggerContext } = await import('../logger/logger-context-storage');
      const { extractTag } = await import('../utils/tag-extractor');
      const { setLoggerContextValue } = await import('../logger/logger-context-storage');

      vi.mocked(extractTag).mockReturnValue('test-tag-123');
      vi.mocked(initializeRequestLoggerContext).mockImplementation((callback) => {
        callback();
      });

      const mockReq = { headers: { tag: 'test-tag-123' } };
      const mockNext = vi.fn();

      (
        instrumentation as unknown as { initializeLoggerContext: (req: unknown, next: () => void) => void }
      ).initializeLoggerContext(mockReq, mockNext);

      expect(extractTag).toHaveBeenCalledWith({ tag: 'test-tag-123' });
      expect(setLoggerContextValue).toHaveBeenCalledWith('tag', 'test-tag-123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract tag from x-aws-sqsd-attr-tag header', async () => {
      const { initializeRequestLoggerContext } = await import('../logger/logger-context-storage');
      const { extractTag } = await import('../utils/tag-extractor');
      const { setLoggerContextValue } = await import('../logger/logger-context-storage');

      vi.mocked(extractTag).mockReturnValue('sqs-tag-456');
      vi.mocked(initializeRequestLoggerContext).mockImplementation((callback) => {
        callback();
      });

      const mockReq = { headers: { 'x-aws-sqsd-attr-tag': 'sqs-tag-456' } };
      const mockNext = vi.fn();

      (
        instrumentation as unknown as { initializeLoggerContext: (req: unknown, next: () => void) => void }
      ).initializeLoggerContext(mockReq, mockNext);

      expect(extractTag).toHaveBeenCalledWith({ 'x-aws-sqsd-attr-tag': 'sqs-tag-456' });
      expect(setLoggerContextValue).toHaveBeenCalledWith('tag', 'sqs-tag-456');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should generate UUID when no tag headers present', async () => {
      const { initializeRequestLoggerContext } = await import('../logger/logger-context-storage');
      const { extractTag } = await import('../utils/tag-extractor');
      const { setLoggerContextValue } = await import('../logger/logger-context-storage');

      const generatedUuid = '12345678-1234-4123-8123-123456789abc';
      vi.mocked(extractTag).mockReturnValue(generatedUuid);
      vi.mocked(initializeRequestLoggerContext).mockImplementation((callback) => {
        callback();
      });

      const mockReq = { headers: { 'content-type': 'application/json' } };
      const mockNext = vi.fn();

      (
        instrumentation as unknown as { initializeLoggerContext: (req: unknown, next: () => void) => void }
      ).initializeLoggerContext(mockReq, mockNext);

      expect(extractTag).toHaveBeenCalledWith({ 'content-type': 'application/json' });
      expect(setLoggerContextValue).toHaveBeenCalledWith('tag', generatedUuid);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle undefined headers gracefully', async () => {
      const { initializeRequestLoggerContext } = await import('../logger/logger-context-storage');
      const { extractTag } = await import('../utils/tag-extractor');
      const { setLoggerContextValue } = await import('../logger/logger-context-storage');

      const generatedUuid = '87654321-4321-4321-8321-cba987654321';
      vi.mocked(extractTag).mockReturnValue(generatedUuid);
      vi.mocked(initializeRequestLoggerContext).mockImplementation((callback) => {
        callback();
      });

      const mockReq = {};
      const mockNext = vi.fn();

      (
        instrumentation as unknown as { initializeLoggerContext: (req: unknown, next: () => void) => void }
      ).initializeLoggerContext(mockReq, mockNext);

      expect(extractTag).toHaveBeenCalledWith(undefined);
      expect(setLoggerContextValue).toHaveBeenCalledWith('tag', generatedUuid);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
