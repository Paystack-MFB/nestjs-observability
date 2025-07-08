/* eslint-disable @typescript-eslint/no-useless-constructor */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-extraneous-class */

import { Injectable } from '@nestjs/common';
import 'reflect-metadata';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  getTraceableMethodNames,
  getTraceMethodOptions,
  isNoTraceEnabled,
  isTraceAllMethodsEnabled,
  NoTrace,
  TraceAllMethods,
  TraceMethod,
} from './auto-trace.decorators';

describe('Auto-trace decorators', () => {
  beforeEach(() => {
    // Clear any existing metadata between tests
    Reflect.deleteMetadata('trace:all-methods', TestClass);
    Reflect.deleteMetadata('trace:method', TestClass.prototype);
    Reflect.deleteMetadata('trace:no-trace', TestClass.prototype);
  });

  describe('@TraceAllMethods', () => {
    it('should set TraceAllMethods metadata on a class', () => {
      @TraceAllMethods()
      class TestClass {}

      expect(isTraceAllMethodsEnabled(TestClass)).toBe(true);
    });

    it('should work with @Injectable decorator', () => {
      @Injectable()
      @TraceAllMethods()
      class TestService {}

      expect(isTraceAllMethodsEnabled(TestService)).toBe(true);
    });

    it('should return false for classes without @TraceAllMethods', () => {
      class TestClass {}

      expect(isTraceAllMethodsEnabled(TestClass)).toBe(false);
    });

    it('should preserve class functionality', () => {
      @TraceAllMethods()
      class TestClass {
        getValue() {
          return 'test';
        }
      }

      const instance = new TestClass();
      expect(instance.getValue()).toBe('test');
    });
  });

  describe('@TraceMethod', () => {
    it('should set TraceMethod metadata with default options', () => {
      class TestClass {
        @TraceMethod()
        testMethod() {}
      }

      const options = getTraceMethodOptions(TestClass.prototype, 'testMethod');
      expect(options).toBeDefined();
      expect(options?.captureArgs).toBe(true);
      expect(options?.spanName).toBeUndefined();
    });

    it('should set TraceMethod metadata with custom span name', () => {
      class TestClass {
        @TraceMethod('custom-span')
        testMethod() {}
      }

      const options = getTraceMethodOptions(TestClass.prototype, 'testMethod');
      expect(options?.spanName).toBe('custom-span');
      expect(options?.captureArgs).toBe(true);
    });

    it('should set TraceMethod metadata with custom span name and captureArgs', () => {
      class TestClass {
        @TraceMethod('custom-span', false)
        testMethod() {}
      }

      const options = getTraceMethodOptions(TestClass.prototype, 'testMethod');
      expect(options?.spanName).toBe('custom-span');
      expect(options?.captureArgs).toBe(false);
    });

    it('should set TraceMethod metadata with only captureArgs parameter', () => {
      class TestClass {
        @TraceMethod(undefined, false)
        testMethod() {}
      }

      const options = getTraceMethodOptions(TestClass.prototype, 'testMethod');
      expect(options?.spanName).toBeUndefined();
      expect(options?.captureArgs).toBe(false);
    });

    it('should return undefined for methods without @TraceMethod', () => {
      class TestClass {
        testMethod() {}
      }

      const options = getTraceMethodOptions(TestClass.prototype, 'testMethod');
      expect(options).toBeUndefined();
    });

    it('should preserve method functionality', () => {
      class TestClass {
        @TraceMethod('test-span')
        getValue() {
          return 'test';
        }
      }

      const instance = new TestClass();
      expect(instance.getValue()).toBe('test');
    });
  });

  describe('@NoTrace', () => {
    it('should set NoTrace metadata on a method', () => {
      class TestClass {
        @NoTrace()
        testMethod() {}
      }

      expect(isNoTraceEnabled(TestClass.prototype, 'testMethod')).toBe(true);
    });

    it('should return false for methods without @NoTrace', () => {
      class TestClass {
        testMethod() {}
      }

      expect(isNoTraceEnabled(TestClass.prototype, 'testMethod')).toBe(false);
    });

    it('should preserve method functionality', () => {
      class TestClass {
        @NoTrace()
        getValue() {
          return 'test';
        }
      }

      const instance = new TestClass();
      expect(instance.getValue()).toBe('test');
    });
  });

  describe('Decorator combinations', () => {
    it('should work with @TraceAllMethods and @NoTrace combination', () => {
      @TraceAllMethods()
      class TestClass {
        @NoTrace()
        excludedMethod() {}

        normalMethod() {}
      }

      expect(isTraceAllMethodsEnabled(TestClass)).toBe(true);
      expect(isNoTraceEnabled(TestClass.prototype, 'normalMethod')).toBe(false);
      expect(isNoTraceEnabled(TestClass.prototype, 'excludedMethod')).toBe(true);
    });

    it('should work with @TraceAllMethods and @TraceMethod combination', () => {
      @TraceAllMethods()
      class TestClass {
        @TraceMethod('custom-span', false)
        customMethod() {}

        normalMethod() {}
      }

      expect(isTraceAllMethodsEnabled(TestClass)).toBe(true);

      const options = getTraceMethodOptions(TestClass.prototype, 'customMethod');
      expect(options?.spanName).toBe('custom-span');
      expect(options?.captureArgs).toBe(false);
    });

    it('should work with @TraceMethod and @NoTrace on different methods', () => {
      class TestClass {
        @NoTrace()
        excludedMethod() {}

        normalMethod() {}

        @TraceMethod('custom-span')
        tracedMethod() {}
      }

      expect(getTraceMethodOptions(TestClass.prototype, 'tracedMethod')?.spanName).toBe('custom-span');
      expect(isNoTraceEnabled(TestClass.prototype, 'excludedMethod')).toBe(true);
      expect(isNoTraceEnabled(TestClass.prototype, 'normalMethod')).toBe(false);
    });
  });

  describe('Helper functions', () => {
    describe('getTraceableMethodNames', () => {
      it('should return all method names except constructor', () => {
        class TestClass {
          constructor() {}
          method1() {}
          method2() {}
        }

        const methods = getTraceableMethodNames(TestClass.prototype);
        expect(methods).toContain('method1');
        expect(methods).toContain('method2');
        expect(methods).not.toContain('constructor');
      });

      it('should exclude methods with @NoTrace', () => {
        class TestClass {
          method1() {}

          @NoTrace()
          method2() {}
        }

        const methods = getTraceableMethodNames(TestClass.prototype);
        expect(methods).toContain('method1');
        expect(methods).not.toContain('method2');
      });

      it('should only include functions, not properties', () => {
        class TestClass {
          property = 'value';
          method() {}
        }

        const methods = getTraceableMethodNames(TestClass.prototype);
        expect(methods).toContain('method');
        expect(methods).not.toContain('property');
      });

      it('should handle empty classes', () => {
        class TestClass {}

        const methods = getTraceableMethodNames(TestClass.prototype);
        expect(methods).toEqual([]);
      });
    });

    describe('Edge cases', () => {
      it('should handle classes with only constructor', () => {
        class TestClass {
          constructor() {}
        }

        const methods = getTraceableMethodNames(TestClass.prototype);
        expect(methods).toEqual([]);
      });

      it('should handle classes with private methods', () => {
        class TestClass {
          public publicMethod() {}
          // @ts-expect-error - Used for testing method discovery
          private privateMethod() {}
        }

        const methods = getTraceableMethodNames(TestClass.prototype);
        expect(methods).toContain('privateMethod');
        expect(methods).toContain('publicMethod');
      });

      it('should handle async methods', () => {
        class TestClass {
          async asyncMethod() {}
        }

        const methods = getTraceableMethodNames(TestClass.prototype);
        expect(methods).toContain('asyncMethod');
      });

      it('should handle static methods', () => {
        class TestClass {
          static staticMethod() {}
          instanceMethod() {}
        }

        const methods = getTraceableMethodNames(TestClass.prototype);
        expect(methods).toContain('instanceMethod');
        expect(methods).not.toContain('staticMethod');
      });

      it('should handle methods with decorators', () => {
        class TestClass {
          @TraceMethod('custom')
          decoratedMethod() {}
        }

        const methods = getTraceableMethodNames(TestClass.prototype);
        expect(methods).toContain('decoratedMethod');
      });
    });
  });

  describe('TypeScript metadata reflection', () => {
    it('should correctly store and retrieve metadata', () => {
      @TraceAllMethods()
      class TestClass {
        @NoTrace()
        excludedMethod() {}

        @TraceMethod('test-span', false)
        testMethod() {}
      }

      // Test class-level metadata
      expect(isTraceAllMethodsEnabled(TestClass)).toBe(true);

      // Test method-level metadata
      const options = getTraceMethodOptions(TestClass.prototype, 'testMethod');
      expect(options?.spanName).toBe('test-span');
      expect(options?.captureArgs).toBe(false);

      // Test exclusion metadata
      expect(isNoTraceEnabled(TestClass.prototype, 'excludedMethod')).toBe(true);
    });

    it('should handle undefined metadata gracefully', () => {
      class TestClass {
        testMethod() {}
      }

      expect(isTraceAllMethodsEnabled(TestClass)).toBe(false);
      expect(getTraceMethodOptions(TestClass.prototype, 'testMethod')).toBeUndefined();
      expect(isNoTraceEnabled(TestClass.prototype, 'testMethod')).toBe(false);
    });
  });

  describe('Performance considerations', () => {
    it('should not significantly impact class instantiation', () => {
      @TraceAllMethods()
      class TestClass {
        @TraceMethod('test')
        method1() {}

        @NoTrace()
        method2() {}
      }

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        new TestClass();
      }
      const end = performance.now();

      // Should take less than 100ms for 1000 instantiations
      expect(end - start).toBeLessThan(100);
    });
  });
});

// Helper test class for shared use
class TestClass {
  method1() {}
  method2() {}
  method3() {}
}
