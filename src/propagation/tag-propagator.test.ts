import { ROOT_CONTEXT, TextMapSetter } from '@opentelemetry/api';
import { describe, it, expect, beforeEach } from 'vitest';
import { setLoggerContextValue, runWithLoggerContext } from '../logger/logger-context-storage';
import { TagPropagator } from './tag-propagator';

describe('TagPropagator', () => {
  let propagator: TagPropagator;
  let carrier: Record<string, string>;
  let setter: TextMapSetter;

  beforeEach(() => {
    propagator = new TagPropagator();
    carrier = {};
    setter = {
      set: (c: unknown, key: string, value: string) => {
        (c as Record<string, string>)[key] = value;
      },
    };
  });

  describe('inject', () => {
    it('should inject tag header when tag exists in context', async () => {
      await runWithLoggerContext(() => {
        setLoggerContextValue('tag', 'test-tag-123');

        propagator.inject(ROOT_CONTEXT, carrier, setter);

        expect(carrier['Tag']).toBe('test-tag-123');
      });
    });

    it('should not inject tag header when tag is not in context', async () => {
      await runWithLoggerContext(() => {
        propagator.inject(ROOT_CONTEXT, carrier, setter);

        expect(carrier['Tag']).toBeUndefined();
      });
    });

    it('should not inject tag header when tag is empty string', async () => {
      await runWithLoggerContext(() => {
        setLoggerContextValue('tag', '');

        propagator.inject(ROOT_CONTEXT, carrier, setter);

        expect(carrier['Tag']).toBeUndefined();
      });
    });

    it('should not inject tag header when tag is not a string', async () => {
      await runWithLoggerContext(() => {
        setLoggerContextValue('tag', 123);

        propagator.inject(ROOT_CONTEXT, carrier, setter);

        expect(carrier['Tag']).toBeUndefined();
      });
    });

    it('should not inject tag header outside of logger context', () => {
      // Not within runWithLoggerContext
      propagator.inject(ROOT_CONTEXT, carrier, setter);

      expect(carrier['Tag']).toBeUndefined();
    });

    it('should use Title-Case "Tag" header name', async () => {
      await runWithLoggerContext(() => {
        setLoggerContextValue('tag', 'test-tag');

        propagator.inject(ROOT_CONTEXT, carrier, setter);

        expect(carrier['Tag']).toBe('test-tag');
        expect(carrier['tag']).toBeUndefined();
        expect(carrier['TAG']).toBeUndefined();
      });
    });
  });

  describe('extract', () => {
    it('should return context unchanged', () => {
      const testContext = ROOT_CONTEXT;
      const result = propagator.extract(testContext, carrier, {
        get: () => undefined,
        keys: () => [],
      });

      expect(result).toBe(testContext);
    });
  });

  describe('fields', () => {
    it('should return Tag field', () => {
      const fields = propagator.fields();

      expect(fields).toEqual(['Tag']);
    });
  });
});
