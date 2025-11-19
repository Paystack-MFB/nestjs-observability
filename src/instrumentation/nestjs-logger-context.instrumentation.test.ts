import { describe, it, expect, beforeEach } from 'vitest';
import { NestJSLoggerContextInstrumentation } from './nestjs-logger-context.instrumentation';

describe('NestJSLoggerContextInstrumentation', () => {
  let instrumentation: NestJSLoggerContextInstrumentation;

  beforeEach(() => {
    instrumentation = new NestJSLoggerContextInstrumentation();
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
});
