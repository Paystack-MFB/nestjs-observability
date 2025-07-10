/* eslint-disable @typescript-eslint/no-useless-constructor */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-extraneous-class */
import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';

import {
  createTracedMethod,
  getTraceableMethodNames,
  getTraceOptions,
  isNoTraceEnabled,
  isTraceClassEnabled,
  NoTrace,
  Trace,
  TraceClass,
} from './auto-trace.decorators';

describe('@TraceClass', () => {
  it('should set TraceClass metadata on a class', () => {
    @TraceClass()
    class TestClass {}

    expect(isTraceClassEnabled(TestClass)).toBe(true);
  });

  it('should set metadata on a service', () => {
    @TraceClass()
    class TestService {}

    expect(isTraceClassEnabled(TestService)).toBe(true);
  });

  it('should return false for classes without @TraceClass', () => {
    class TestClass {}

    expect(isTraceClassEnabled(TestClass)).toBe(false);
  });

  it('should return method names', () => {
    @TraceClass()
    class TestClass {
      constructor() {}
      method1() {}
      method2() {}
      // @ts-expect-error - Used for testing method discovery
      private privateMethod() {
        // This method is used for testing method discovery
        return 'private';
      }
    }

    const methodNames = getTraceableMethodNames(TestClass.prototype);
    expect(methodNames).toContain('method1');
    expect(methodNames).toContain('method2');
    expect(methodNames).not.toContain('constructor');
    expect(methodNames).not.toContain('_privateMethod');
  });
});

describe('@Trace', () => {
  it('should set Trace metadata with default options', () => {
    class TestClass {
      @Trace()
      testMethod() {}
    }

    const options = getTraceOptions(TestClass.prototype, 'testMethod');
    expect(options).toEqual({});
  });

  it('should set Trace metadata with custom span name', () => {
    class TestClass {
      @Trace('custom-span')
      testMethod() {}
    }

    const options = getTraceOptions(TestClass.prototype, 'testMethod');
    expect(options?.spanName).toBe('custom-span');
  });

  it('should set Trace metadata with custom span name only', () => {
    class TestClass {
      @Trace('custom-span')
      testMethod() {}
    }

    const options = getTraceOptions(TestClass.prototype, 'testMethod');
    expect(options?.spanName).toBe('custom-span');
  });

  it('should set Trace metadata with undefined span name', () => {
    class TestClass {
      @Trace()
      testMethod() {}
    }

    const options = getTraceOptions(TestClass.prototype, 'testMethod');
    expect(options?.spanName).toBeUndefined();
  });

  it('should return undefined for methods without @Trace', () => {
    class TestClass {
      testMethod() {}
    }

    const options = getTraceOptions(TestClass.prototype, 'testMethod');
    expect(options).toBeUndefined();
  });

  it('should create a traced method', () => {
    const originalMethod = vi.fn().mockReturnValue('test result');
    const tracedMethod = createTracedMethod(originalMethod, 'TestClass', 'testMethod');

    expect(typeof tracedMethod).toBe('function');
    expect(tracedMethod).not.toBe(originalMethod);
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
  it('should work with @TraceClass and @NoTrace combination', () => {
    @TraceClass()
    class TestClass {
      @NoTrace()
      excludedMethod() {}

      normalMethod() {}
    }

    expect(isTraceClassEnabled(TestClass)).toBe(true);
    expect(isNoTraceEnabled(TestClass.prototype, 'normalMethod')).toBe(false);
    expect(isNoTraceEnabled(TestClass.prototype, 'excludedMethod')).toBe(true);
  });

  it('should work with @TraceClass and @Trace combination', () => {
    @TraceClass()
    class TestClass {
      @Trace('custom-span')
      customMethod() {}

      normalMethod() {}
    }

    expect(isTraceClassEnabled(TestClass)).toBe(true);

    const options = getTraceOptions(TestClass.prototype, 'customMethod');
    expect(options?.spanName).toBe('custom-span');
  });

  it('should work with @Trace and @NoTrace on different methods', () => {
    class TestClass {
      @NoTrace()
      excludedMethod() {}

      normalMethod() {}

      @Trace('custom-span')
      tracedMethod() {}
    }

    expect(getTraceOptions(TestClass.prototype, 'tracedMethod')?.spanName).toBe('custom-span');
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
        @Trace('custom')
        decoratedMethod() {}
      }

      const methods = getTraceableMethodNames(TestClass.prototype);
      expect(methods).toContain('decoratedMethod');
    });
  });
});

describe('TypeScript metadata reflection', () => {
  it('should correctly store and retrieve metadata', () => {
    @TraceClass()
    class TestClass {
      @NoTrace()
      excludedMethod() {}

      @Trace('test-span')
      testMethod() {}
    }

    // Test class-level metadata
    expect(isTraceClassEnabled(TestClass)).toBe(true);

    // Test method-level metadata
    const options = getTraceOptions(TestClass.prototype, 'testMethod');
    expect(options?.spanName).toBe('test-span');

    // Test exclusion metadata
    expect(isNoTraceEnabled(TestClass.prototype, 'excludedMethod')).toBe(true);
  });

  it('should handle undefined metadata gracefully', () => {
    class TestClass {
      testMethod() {}
    }

    expect(isTraceClassEnabled(TestClass)).toBe(false);
    expect(getTraceOptions(TestClass.prototype, 'testMethod')).toBeUndefined();
    expect(isNoTraceEnabled(TestClass.prototype, 'testMethod')).toBe(false);
  });
});

describe('Performance considerations', () => {
  it('should not significantly impact class instantiation', () => {
    @TraceClass()
    class TestClass {
      @Trace('test')
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
