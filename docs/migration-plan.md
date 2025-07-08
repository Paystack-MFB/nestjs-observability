# Migration Plan: Current Implementation to Auto-Tracing System

## Current Implementation Analysis

### Current Architecture Overview

The current observability system consists of:

1. **Global HTTP Interceptor** (`HttpTraceInterceptor`)

   - Traces all HTTP requests automatically
   - Collects metrics (request duration, status codes)
   - Normalizes route paths to avoid high cardinality
   - Works at the HTTP layer

2. **Global Controller Method Interceptor** (`ControllerMethodTraceInterceptor`)

   - Traces all controller methods automatically
   - Creates spans with format: `{ClassName}.{methodName}`
   - Adds HTTP method and path attributes for HTTP requests
   - Works at the controller method execution layer

3. **Manual Decorators**

   - `@Trace()` - Manual method-level tracing

4. **OpenTelemetry Integration**
   - `TracingService` - Configures and initializes OpenTelemetry SDK
   - Auto-instrumentations for databases, HTTP clients, etc.
   - OTLP exporter for traces

### Current Flow

```
HTTP Request → HttpTraceInterceptor → ControllerMethodTraceInterceptor → Controller Method → @Trace (if present)
```

### Current Features

- ✅ Automatic HTTP request tracing
- ✅ Automatic controller method tracing
- ✅ Manual method tracing with `@Trace`
- ✅ OpenTelemetry auto-instrumentations
- ✅ Metrics collection
- ✅ Structured logging

## Problems with Current Implementation

### 1. Overlapping Tracing

- `HttpTraceInterceptor` creates spans for HTTP requests
- `ControllerMethodTraceInterceptor` creates spans for controller methods
- Both run for the same request, creating redundant spans

### 2. No Provider/Service Tracing

- Only controllers are automatically traced
- Services require manual `@Trace` decorators
- No class-level opt-in mechanism

### 3. Limited Customization

- No way to exclude specific methods
- No way to customize span names without manual decorators
- No way to control argument capture per method

### 4. Complex Configuration

- Requires extensive configuration in `observability.config.ts`
- Auto-instrumentations can be overwhelming
- No simple on/off switches for different components

## Migration Strategy

### Phase 1: New Decorator System (Week 1)

**Human Prompt**: "Create a new decorator system for auto-tracing that allows class-level opt-in for providers and method-level customization for all classes. Implement three decorators: @TraceAllMethods for enabling tracing on all methods of a class, @TraceMethod for customizing individual method tracing, and @NoTrace for excluding specific methods."

#### 1.1 Create New Decorators

**Instructions:**

1. Create `src/decorators/auto-trace.decorators.ts`
2. Implement `@TraceAllMethods()` decorator with metadata support
3. Implement `@TraceMethod()` decorator with customization options
4. Implement `@NoTrace()` decorator for exclusions
5. Export helper functions for metadata reading

**Code Template:**

```typescript
// src/decorators/auto-trace.decorators.ts
export function TraceAllMethods() { ... }
export function TraceMethod(spanName?: string, captureArgs?: boolean) { ... }
export function NoTrace() { ... }
```

**Success Criteria:**

- [ ] All decorators compile without errors
- [ ] Metadata is properly stored and retrievable
- [ ] TypeScript types are correct
- [ ] No linting errors

**Automated Validation:**

```bash
# Create test file: src/decorators/auto-trace.decorators.test.ts
# Run validation script
pnpm test --testNamePattern="auto-trace decorators"
pnpm lint
pnpm type-check
```

**Validation Script:**

```typescript
// src/decorators/auto-trace.decorators.test.ts
describe('Auto-trace decorators', () => {
  it('should set TraceAllMethods metadata', () => {
    @TraceAllMethods()
    class TestClass {}

    expect(isTraceAllMethodsEnabled(TestClass)).toBe(true);
  });

  it('should set TraceMethod metadata with options', () => {
    class TestClass {
      @TraceMethod('custom-span', false)
      testMethod() {}
    }

    const options = getTraceMethodOptions(TestClass.prototype, 'testMethod');
    expect(options?.spanName).toBe('custom-span');
    expect(options?.captureArgs).toBe(false);
  });

  it('should set NoTrace metadata', () => {
    class TestClass {
      @NoTrace()
      testMethod() {}
    }

    expect(isNoTraceEnabled(TestClass.prototype, 'testMethod')).toBe(true);
  });
});
```

#### 1.2 Update Decorator Exports

**Human Prompt**: "Update the decorator exports to include the new auto-trace decorators and remove the old TraceableClass decorator completely. Make sure the existing @Trace decorator remains available for backward compatibility."

**Instructions:**

1. Update `src/decorators/index.ts` to export new decorators
2. Remove all references to `@TraceableClass` decorator
3. Delete `src/decorators/traceable-class.decorator.ts` file
4. Ensure `@Trace` decorator remains exported

**Success Criteria:**

- [ ] New decorators are exported
- [ ] TraceableClass decorator is completely removed
- [ ] Existing @Trace decorator still works
- [ ] All existing tests pass

**Automated Validation:**

```bash
# Run existing tests
pnpm test --testNamePattern="trace decorator"
# Check exports
pnpm test --testNamePattern="decorator exports"
```

#### 1.3 Testing

**Human Prompt**: "Create a comprehensive test suite for the new auto-trace decorators. Test all combinations of decorators, edge cases, and ensure they work correctly with TypeScript metadata reflection."

**Instructions:**

1. Create comprehensive test suite for new decorators
2. Test metadata storage and retrieval
3. Test decorator combinations
4. Test edge cases and error conditions

**Success Criteria:**

- [ ] 100% code coverage for new decorators
- [ ] All edge cases handled
- [ ] Performance impact < 1ms per decoration
- [ ] Memory usage stable

**Automated Validation:**

```bash
# Run coverage check
pnpm test --coverage --testNamePattern="decorators"
# Performance benchmark
pnpm test:performance --testNamePattern="decorator performance"
```

### Phase 2: Auto-Instrumentation Service (Week 2)

**Human Prompt**: "Create an auto-instrumentation service that automatically discovers and traces all NestJS controllers by default, and optionally traces providers marked with @TraceAllMethods. Use NestJS's DiscoveryService to find classes and dynamically wrap their methods with tracing logic."

#### 2.1 Create Auto-Instrumentation Service

**Instructions:**

1. Create `src/services/auto-instrumentation.service.ts`
2. Implement `OnModuleInit` interface
3. Add controller discovery using `DiscoveryService`
4. Add provider discovery with `@TraceAllMethods` filtering
5. Implement method wrapping with trace logic

**Code Template:**

```typescript
// src/services/auto-instrumentation.service.ts
@Injectable()
export class AutoInstrumentationService implements OnModuleInit {
  async onModuleInit() {
    // Discover all controllers and auto-trace them
    // Discover providers with @TraceAllMethods
    // Apply method-level customizations
  }
}
```

**Success Criteria:**

- [ ] Service initializes without errors
- [ ] Discovers all controllers in application
- [ ] Discovers only `@TraceAllMethods` providers
- [ ] Method wrapping preserves original behavior
- [ ] Trace spans are created correctly

**Automated Validation:**

```bash
# Create integration test
pnpm test --testNamePattern="auto-instrumentation service"
# Test with sample controllers and providers
pnpm test:integration --testNamePattern="controller discovery"
```

**Validation Script:**

```typescript
// src/services/auto-instrumentation.service.test.ts
describe('AutoInstrumentationService', () => {
  it('should discover all controllers', async () => {
    const service = new AutoInstrumentationService(/* deps */);
    await service.onModuleInit();

    // Verify all controllers are instrumented
    expect(instrumentedControllers).toHaveLength(expectedControllerCount);
  });

  it('should only instrument @TraceAllMethods providers', async () => {
    @TraceAllMethods()
    class TracedService {}

    class UntracedService {}

    const service = new AutoInstrumentationService(/* deps */);
    await service.onModuleInit();

    expect(isInstrumented(TracedService)).toBe(true);
    expect(isInstrumented(UntracedService)).toBe(false);
  });
});
```

#### 2.2 Controller Auto-Discovery

**Human Prompt**: "Implement controller auto-discovery that finds all NestJS controllers and automatically instruments their public methods with tracing. Ensure the instrumentation respects method-level decorators like @NoTrace and @TraceMethod."

**Instructions:**

1. Implement `instrumentControllers()` method
2. Use `DiscoveryService.getControllers()` to find all controllers
3. Filter out constructors and non-function properties
4. Wrap each public method with tracing
5. Respect `@NoTrace()` exclusions

**Success Criteria:**

- [ ] All controller methods are wrapped
- [ ] `@NoTrace()` methods are excluded
- [ ] Original method behavior preserved
- [ ] Trace spans have correct names
- [ ] HTTP context is available in spans

**Automated Validation:**

```bash
# Test controller discovery
pnpm test --testNamePattern="controller discovery"
# Test method wrapping
pnpm test --testNamePattern="method wrapping"
```

#### 2.3 Provider Opt-in Discovery

**Human Prompt**: "Implement provider discovery that only instruments services and providers marked with @TraceAllMethods. Apply any method-level customizations specified with @TraceMethod decorators."

**Instructions:**

1. Implement `instrumentProviders()` method
2. Use `DiscoveryService.getProviders()` to find all providers
3. Filter providers using `isTraceAllMethodsEnabled()`
4. Wrap public methods with tracing
5. Apply `@TraceMethod()` customizations

**Success Criteria:**

- [ ] Only `@TraceAllMethods` providers are instrumented
- [ ] Method customizations are applied
- [ ] Performance impact < 5ms per provider
- [ ] Memory usage scales linearly

**Automated Validation:**

```bash
# Test provider filtering
pnpm test --testNamePattern="provider filtering"
# Performance test
pnpm test:performance --testNamePattern="provider instrumentation"
```

### Phase 3: Integration and Testing (Week 3)

**Human Prompt**: "Integrate the auto-instrumentation service into the existing ObservabilityModule and coordinate with existing interceptors to prevent duplicate tracing. Ensure the system works seamlessly with the current HTTP tracing infrastructure."

#### 3.1 Module Integration

**Instructions:**

1. Add `AutoInstrumentationService` to `ObservabilityModule`
2. Add `DiscoveryService` import
3. Ensure proper initialization order
4. Add feature toggle for auto-instrumentation
5. Handle circular dependencies

**Success Criteria:**

- [ ] Service initializes in correct order
- [ ] No circular dependency errors
- [ ] Feature toggle works correctly
- [ ] Existing functionality unchanged
- [ ] Module loads without errors

**Automated Validation:**

```bash
# Test module initialization
pnpm test --testNamePattern="module integration"
# Test initialization order
pnpm test --testNamePattern="initialization order"
# Test feature toggle
pnpm test --testNamePattern="feature toggle"
```

**Validation Script:**

```typescript
// src/observability.module.test.ts
describe('ObservabilityModule with AutoInstrumentation', () => {
  it('should initialize AutoInstrumentationService', async () => {
    const module = await Test.createTestingModule({
      imports: [ObservabilityModule.forRoot()],
    }).compile();

    const service = module.get(AutoInstrumentationService);
    expect(service).toBeDefined();
  });

  it('should handle feature toggle', async () => {
    const module = await Test.createTestingModule({
      imports: [ObservabilityModule.forRoot({ autoInstrumentation: false })],
    }).compile();

    // Verify service is not active
    expect(autoInstrumentationActive).toBe(false);
  });
});
```

#### 3.2 Interceptor Coordination

**Human Prompt**: "Modify the existing ControllerMethodTraceInterceptor to detect when methods are already auto-instrumented and avoid creating duplicate spans. When auto-instrumentation is active, the interceptor should only add HTTP-specific attributes to existing spans."

**Instructions:**

1. Modify `ControllerMethodTraceInterceptor` to detect auto-instrumentation
2. Prevent double-tracing of the same methods
3. Add HTTP attributes to existing spans when auto-instrumented
4. Create fallback span creation for non-auto-instrumented methods
5. Maintain backward compatibility

**Success Criteria:**

- [ ] No duplicate spans created
- [ ] HTTP attributes preserved
- [ ] Fallback works for non-auto-instrumented methods
- [ ] Performance impact < 2ms per request
- [ ] All existing tests pass

**Automated Validation:**

```bash
# Test interceptor coordination
pnpm test --testNamePattern="interceptor coordination"
# Test no duplicate spans
pnpm test --testNamePattern="no duplicate spans"
# Performance test
pnpm test:performance --testNamePattern="interceptor performance"
```

**Validation Script:**

```typescript
// src/interceptors/controller-method-trace.interceptor.test.ts
describe('ControllerMethodTraceInterceptor with AutoInstrumentation', () => {
  it('should not create duplicate spans', async () => {
    const spanCollector = new SpanCollector();

    // Make request to auto-instrumented controller
    await makeRequest('/test');

    const spans = spanCollector.getSpans();
    const duplicateSpans = spans.filter((s) => s.name === 'TestController.testMethod');

    expect(duplicateSpans).toHaveLength(1);
  });

  it('should add HTTP attributes to existing spans', async () => {
    const spanCollector = new SpanCollector();

    await makeRequest('/test');

    const span = spanCollector.getSpanByName('TestController.testMethod');
    expect(span.attributes['http.method']).toBe('GET');
    expect(span.attributes['http.path']).toBe('/test');
  });
});
```

#### 3.3 Comprehensive Testing

**Human Prompt**: "Create end-to-end tests that validate the complete auto-instrumentation system works correctly with real NestJS applications. Include performance benchmarks and memory usage monitoring to ensure the system is production-ready."

**Instructions:**

1. Create E2E test suite with real controllers and services
2. Set up performance benchmarks
3. Create memory usage monitoring
4. Test error scenarios and edge cases
5. Validate trace output format

**Success Criteria:**

- [ ] E2E tests pass with real applications
- [ ] Performance degradation < 5%
- [ ] Memory usage increase < 10%
- [ ] Error scenarios handled gracefully
- [ ] Trace output matches expected format

**Automated Validation:**

```bash
# E2E test suite
pnpm test:e2e --testNamePattern="auto-instrumentation e2e"
# Performance benchmark
pnpm test:performance --testNamePattern="full system performance"
# Memory usage test
pnpm test:memory --testNamePattern="memory usage"
```

**E2E Validation Script:**

```typescript
// test/e2e/auto-instrumentation.e2e.test.ts
describe('Auto-instrumentation E2E', () => {
  it('should trace complete request flow', async () => {
    const app = await createTestApp();
    const spanCollector = new SpanCollector();

    await request(app).get('/users/123').expect(200);

    const spans = spanCollector.getSpans();

    // Verify HTTP span
    expect(spans.find((s) => s.name === 'HTTP GET /users/:id')).toBeDefined();

    // Verify controller span
    expect(spans.find((s) => s.name === 'UserController.getUserById')).toBeDefined();

    // Verify service span (if @TraceAllMethods)
    expect(spans.find((s) => s.name === 'UserService.findById')).toBeDefined();
  });
});
```

### Phase 4: Migration and Cleanup (Week 4)

**Human Prompt**: "Finalize the migration by updating documentation, simplifying configuration, and preparing the system for production use. Ensure developers have clear guidance on how to use the new auto-tracing features."

#### 4.1 Documentation and Examples

**Instructions:**

1. Update all documentation to reflect new system
2. Create migration guide for users
3. Update JSDoc comments in code
4. Create usage examples
5. Update README files

**Success Criteria:**

- [ ] Documentation is complete and accurate
- [ ] Migration guide is helpful
- [ ] Examples work correctly
- [ ] JSDoc comments are updated
- [ ] README reflects new features

**Automated Validation:**

```bash
# Validate documentation
pnpm docs:validate
# Test examples
pnpm test:examples
# Check JSDoc
pnpm docs:generate
```

#### 4.2 Configuration Simplification

**Human Prompt**: "Simplify the observability configuration by removing complex auto-instrumentation settings and providing sensible defaults. Add a simple toggle for enabling/disabling auto-instrumentation."

**Instructions:**

1. Simplify configuration interface
2. Add simple enable/disable toggle
3. Provide sensible defaults
4. Update configuration schema
5. Create configuration migration utility

**Success Criteria:**

- [ ] Configuration is simplified
- [ ] Defaults work for 80% of use cases
- [ ] Schema validation passes
- [ ] Migration utility works
- [ ] Documentation is updated

**Automated Validation:**

```bash
# Test configuration simplification
pnpm test --testNamePattern="config simplification"
# Validate schema
pnpm config:validate
# Test defaults
pnpm test --testNamePattern="default configuration"
```

#### 4.3 Example Migration

**Human Prompt**: "Update the basic-app example to demonstrate the new auto-tracing features. Show before/after comparisons and document any breaking changes."

**Instructions:**

1. Update `examples/basic-app` to use new system
2. Create before/after comparison
3. Document breaking changes
4. Add performance comparison
5. Update README files

**Success Criteria:**

- [ ] Example app works with new system
- [ ] Performance is same or better
- [ ] Documentation is updated
- [ ] Breaking changes are documented
- [ ] Migration steps are clear

**Automated Validation:**

```bash
# Test example app
cd examples/basic-app && pnpm test
# Performance comparison
pnpm performance:compare
# Documentation validation
pnpm docs:validate
```

## Detailed Implementation Plan

### New Decorator Implementation

#### `@TraceAllMethods()` Decorator

```typescript
import { Type } from '@nestjs/common';
import 'reflect-metadata';

const TRACE_ALL_METHODS_KEY = 'trace:all-methods';

export function TraceAllMethods() {
  return function <T extends Type>(target: T): T {
    Reflect.defineMetadata(TRACE_ALL_METHODS_KEY, true, target);
    return target;
  };
}

export function isTraceAllMethodsEnabled(target: Type): boolean {
  return Reflect.getMetadata(TRACE_ALL_METHODS_KEY, target) === true;
}
```

#### `@TraceMethod()` Decorator

```typescript
interface TraceMethodOptions {
  spanName?: string;
  captureArgs?: boolean;
}

const TRACE_METHOD_KEY = 'trace:method';

export function TraceMethod(spanName?: string, captureArgs = true) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const options: TraceMethodOptions = { spanName, captureArgs };
    Reflect.defineMetadata(TRACE_METHOD_KEY, options, target, propertyKey);
    return descriptor;
  };
}

export function getTraceMethodOptions(target: object, propertyKey: string): TraceMethodOptions | undefined {
  return Reflect.getMetadata(TRACE_METHOD_KEY, target, propertyKey);
}
```

#### `@NoTrace()` Decorator

```typescript
const NO_TRACE_KEY = 'trace:no-trace';

export function NoTrace() {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(NO_TRACE_KEY, true, target, propertyKey);
    return descriptor;
  };
}

export function isNoTraceEnabled(target: object, propertyKey: string): boolean {
  return Reflect.getMetadata(NO_TRACE_KEY, target, propertyKey) === true;
}
```

### Auto-Instrumentation Service Implementation

```typescript
@Injectable()
export class AutoInstrumentationService implements OnModuleInit {
  private readonly tracer = trace.getTracer('auto-instrumentation');

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly moduleRef: ModuleRef,
    private readonly logger: LoggerService
  ) {}

  async onModuleInit() {
    await this.instrumentControllers();
    await this.instrumentProviders();
  }

  private async instrumentControllers() {
    const controllers = this.discoveryService.getControllers();

    for (const controller of controllers) {
      const instance = controller.instance;
      const prototype = Object.getPrototypeOf(instance);

      this.instrumentMethods(instance, prototype, controller.metatype.name);
    }
  }

  private async instrumentProviders() {
    const providers = this.discoveryService.getProviders();

    for (const provider of providers) {
      if (isTraceAllMethodsEnabled(provider.metatype)) {
        const instance = provider.instance;
        const prototype = Object.getPrototypeOf(instance);

        this.instrumentMethods(instance, prototype, provider.metatype.name);
      }
    }
  }

  private instrumentMethods(instance: any, prototype: any, className: string) {
    const methodNames = Object.getOwnPropertyNames(prototype)
      .filter((name) => name !== 'constructor')
      .filter((name) => typeof prototype[name] === 'function');

    for (const methodName of methodNames) {
      if (isNoTraceEnabled(prototype, methodName)) {
        continue;
      }

      const originalMethod = instance[methodName];
      const options = getTraceMethodOptions(prototype, methodName);

      instance[methodName] = this.createTracedMethod(originalMethod, className, methodName, options);
    }
  }

  private createTracedMethod(
    originalMethod: Function,
    className: string,
    methodName: string,
    options?: TraceMethodOptions
  ) {
    const spanName = options?.spanName ?? `${className}.${methodName}`;
    const captureArgs = options?.captureArgs ?? true;

    return async function (this: any, ...args: any[]) {
      return this.tracer.startActiveSpan(spanName, async (span: Span) => {
        // Add attributes, handle errors, etc.
        // Similar to existing @Trace implementation
      });
    };
  }
}
```

### Integration with Existing Interceptors

#### Modified Controller Method Interceptor

```typescript
@Injectable()
export class ControllerMethodTraceInterceptor implements NestInterceptor {
  intercept(executionContext: ExecutionContext, next: CallHandler): Observable<unknown> {
    const className = executionContext.getClass().name;
    const handlerName = executionContext.getHandler().name;

    // Check if method is already traced by auto-instrumentation
    if (this.isMethodAutoTraced(executionContext)) {
      // Just add HTTP-specific attributes to existing span
      return this.addHttpAttributes(executionContext, next);
    }

    // Original tracing logic for non-auto-traced methods
    return this.createNewSpan(executionContext, next);
  }
}
```

## Migration Timeline

### Week 1: Foundation

- **Day 1-2**: Create new decorator system
- **Day 3**: Update decorator exports and remove TraceableClass
- **Day 4-5**: Create comprehensive test suite

### Week 2: Core Implementation

- **Day 1-2**: Implement AutoInstrumentationService
- **Day 3**: Add controller discovery and instrumentation
- **Day 4**: Add provider discovery and instrumentation
- **Day 5**: Create integration tests

### Week 3: Integration

- **Day 1-2**: Integrate with ObservabilityModule
- **Day 3**: Update interceptors to work with auto-instrumentation
- **Day 4**: Comprehensive testing and benchmarking
- **Day 5**: Fix any performance issues

### Week 4: Migration

- **Day 1-2**: Update documentation and examples
- **Day 3**: Simplify configuration
- **Day 4-5**: Finalize and prepare for production

## Overall Success Criteria

### Technical Requirements

- [ ] All automated tests pass
- [ ] Performance degradation < 5%
- [ ] Memory usage increase < 10%
- [ ] 100% backward compatibility during transition
- [ ] Zero breaking changes for existing users

### Functional Requirements

- [ ] Controllers auto-traced by default
- [ ] Providers traceable with `@TraceAllMethods`
- [ ] Method-level customization works
- [ ] Exclusions work correctly
- [ ] No duplicate spans created

### Quality Requirements

- [ ] Code coverage > 90%
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Documentation complete
- [ ] Examples updated

## Master Validation Script

Create a comprehensive validation script that runs all tests:

```bash
#!/bin/bash
# scripts/validate-migration.sh

echo "🚀 Running Migration Validation"

# Phase 1 Validation
echo "📋 Phase 1: Decorator System"
pnpm test --testNamePattern="auto-trace decorators"
pnpm lint
pnpm type-check

# Phase 2 Validation
echo "📋 Phase 2: Auto-Instrumentation Service"
pnpm test --testNamePattern="auto-instrumentation service"
pnpm test --testNamePattern="controller discovery"
pnpm test --testNamePattern="provider filtering"

# Phase 3 Validation
echo "📋 Phase 3: Integration"
pnpm test --testNamePattern="module integration"
pnpm test --testNamePattern="interceptor coordination"
pnpm test:e2e --testNamePattern="auto-instrumentation e2e"

# Phase 4 Validation
echo "📋 Phase 4: Migration"
pnpm docs:validate
cd examples/basic-app && pnpm test && cd ../..

# Performance Validation
echo "📊 Performance Validation"
pnpm test:performance
pnpm test:memory

# Final Validation
echo "✅ Final Validation"
pnpm test
pnpm build
pnpm lint
pnpm type-check

echo "🎉 Migration validation complete!"
```

## Automated Monitoring

Set up automated monitoring to track success metrics:

```typescript
// scripts/monitor-migration.ts
interface MigrationMetrics {
  performance: {
    requestLatency: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  coverage: {
    controllers: number;
    providers: number;
    methods: number;
  };
  errors: {
    instrumentationErrors: number;
    spanCreationErrors: number;
    deprecationWarnings: number;
  };
}

async function monitorMigration(): Promise<MigrationMetrics> {
  // Collect metrics
  // Validate against success criteria
  // Report results
}
```

This comprehensive plan provides clear instructions, measurable success criteria, and automated validation for each phase of the migration, making it perfect for a coding agent to follow and execute.
