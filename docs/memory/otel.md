# OpenTelemetry NestJS Observability Package Modernization Plan

## Overview
Refactor the package to align with 2025 OpenTelemetry best practices using environment variable configuration and the `-r` register pattern, while maintaining enhanced NestJS features.

## Exporter Control Strategy
Exporters will be controlled via standard OpenTelemetry environment variables:
- `OTEL_TRACES_EXPORTER` (console, otlp, jaeger, zipkin)
- `OTEL_METRICS_EXPORTER` (console, otlp, prometheus)
- `OTEL_LOGS_EXPORTER` (console, otlp)
- TypeScript factory functions for programmatic control when needed

## Integration Pattern
```bash
node -r @paystackhq/nestjs-observability/register dist/main.js
```

---

### 🔄 **Iteration 1: Foundation & Register Module**

#### Task 1: Create TypeScript Register Module Foundation
Status: **Completed** ✅

Goal: Create the core TypeScript register module that initializes OpenTelemetry SDK with environment variable configuration and safe defaults.

Working Result: A **src/register.ts** file that works with the examples app and demonstrates OpenTelemetry initialization with console exporters and auto-instrumentation.

**Completed Components:**
- ✅ **src/register.ts** - OpenTelemetry SDK initialization with latest v0.203.0 patterns
- ✅ **src/register.test.ts** - Comprehensive unit tests (12 tests passing)
- ✅ **scripts/test-register.sh** - Integration test script with examples app
- ✅ **package.json** exports updated with "./register" path
- ✅ TypeScript build configurations updated for dual CJS/ESM output

Validation:
- ✅ **src/register.ts** compiles without TypeScript errors
- ✅ **scripts/test-register.sh** script passes - tests register module with examples app
- ✅ Unit test **src/register.test.ts** validates environment variable handling
- ✅ Running examples app with register shows HTTP traces from auto-instrumentation
- ✅ Environment variables correctly override defaults in examples app

**Integration Test Results:**
- ✅ Register module initialization works correctly
- ✅ Environment variables are processed correctly
- ✅ Auto-instrumentation is enabled (HTTP traces generated)
- ✅ Console exporters are working for traces and metrics
- ✅ Service name, version, and environment configuration works
- ✅ Custom environment variables override defaults

```text
Create **src/register.ts** and comprehensive testing:

1. Create **src/register.ts** with OpenTelemetry SDK initialization:
   - Import `@opentelemetry/sdk-node` (NodeSDK)
   - Import `@opentelemetry/auto-instrumentations-node` (getNodeAutoInstrumentations)
   - Import console exporters for traces, metrics, and logs
   - Use environment variables: OTEL_SERVICE_NAME, OTEL_SERVICE_VERSION, NODE_ENV
   - Initialize NodeSDK with console exporters and auto-instrumentations
   - Add graceful shutdown on SIGTERM
   - Export SDK instance

2. Update **package.json** exports to include "./register" path

3. Update **tsconfig.build.cjs.json** and **tsconfig.build.esm.json** to compile register.ts

4. Create **src/register.test.ts** unit tests:
   - Test environment variable parsing
   - Test SDK initialization
   - Mock SDK and verify correct configuration
   - Test error handling for invalid values

5. Create **scripts/test-register.sh** integration test script:
   - Build the package
   - Start examples app with `node -r ./dist/register.js examples/basic-app/dist/main.js`
   - Make HTTP requests to trigger auto-instrumentation
   - Verify console output shows traces and metrics
   - Test with different environment variables

6. Update examples app if needed to ensure it works with register pattern
```

---

#### Task 2: Add OTLP Exporter Support with Environment Variables
Status: **Pending**

Goal: Extend the register module to support OTLP exporters controlled by environment variables, with comprehensive testing using the examples app.

Working Result: The register module dynamically configures OTLP exporters when environment variables are set, validated through automated tests and examples app integration.

Validation:
- [ ] **src/register.test.ts** unit tests pass for OTLP configuration
- [ ] **scripts/test-otlp.sh** integration test validates OTLP exporter setup
- [ ] Examples app works with OTLP environment variables (mock OTLP endpoint)
- [ ] Error handling works for invalid OTLP configuration
- [ ] Console exporters remain default when OTLP variables not set

```text
Add OTLP support with comprehensive testing:

1. Extend **src/register.ts** with OTLP exporters:
   - Import OTLP exporters for traces, metrics, logs
   - Create factory functions: createTraceExporter(), createMetricReader(), createLogProcessor()
   - Support OTEL_TRACES_EXPORTER, OTEL_METRICS_EXPORTER, OTEL_LOGS_EXPORTER
   - Support OTEL_EXPORTER_OTLP_* environment variables
   - Add proper error handling and TypeScript types

2. Extend **src/register.test.ts**:
   - Test OTLP exporter creation
   - Test environment variable precedence
   - Test error cases for invalid OTLP config
   - Mock OTLP exporters and verify setup

3. Create **scripts/test-otlp.sh**:
   - Start mock OTLP collector (use simple HTTP server)
   - Configure examples app with OTLP environment variables
   - Run examples app and make requests
   - Verify OTLP requests are sent to mock collector
   - Test fallback to console when OTLP unavailable

4. Create **scripts/mock-otlp-collector.js**:
   - Simple HTTP server that accepts OTLP requests
   - Logs received traces/metrics for validation
   - Returns appropriate responses

5. Update examples app with OTLP environment variable examples in .env files
```

---

### 🔄 **Iteration 2: Simplified NestJS Module**

#### Task 3: Create Lightweight ObservabilityModule  
Status: **Pending**

Goal: Replace the complex configuration-based ObservabilityModule with a lightweight module that provides enhanced NestJS services, tested immediately with examples app.

Working Result: A new **src/observability.module.ts** that integrates with examples app and provides enhanced services without configuration.

Validation:
- [ ] **src/observability.module.ts** compiles without TypeScript errors
- [ ] **src/observability.module.test.ts** unit tests pass
- [ ] Examples app successfully imports `ObservabilityModule.forRoot()` with no parameters
- [ ] **scripts/test-module.sh** validates module integration with examples app
- [ ] All services (Logger, Metrics, Tracing) are injectable in examples app

```text
Create simplified ObservabilityModule with immediate testing:

1. Create new **src/observability.module.ts**:
   - Remove all configuration interfaces and complex setup
   - Static `forRoot()` method with no parameters
   - Providers for LoggerService, MetricsService, TracingService
   - AutoTraceInterceptor as APP_INTERCEPTOR
   - Use global OpenTelemetry providers
   - Keep @Global() decorator

2. Create **src/observability.module.test.ts**:
   - Test module can be imported without configuration
   - Verify all services are provided
   - Mock global OpenTelemetry providers
   - Test APP_INTERCEPTOR registration

3. Update examples app **src/app.module.ts**:
   - Replace current module usage with `ObservabilityModule.forRoot()`
   - Remove configuration setup
   - Test that services are available

4. Create **scripts/test-module.sh**:
   - Build package and examples app
   - Start examples app with register module
   - Verify module loads without errors
   - Test HTTP requests show enhanced tracing
   - Validate services work in controllers

5. Update **src/index.ts** to export new module and remove old config exports
```

---

#### Task 4: Research and Implement Enhanced LoggerService with Context Isolation
Status: **Pending**

Goal: Research NestJS logging best practices and create LoggerService with proper request context isolation, ensuring each request maintains separate logging context.

Working Result: A **src/logger/logger.service.ts** that integrates with NestJS AsyncLocalStorage/CLS for request context isolation and works with OpenTelemetry global providers.

Validation:
- [ ] **src/logger/logger.service.ts** compiles without TypeScript errors
- [ ] **src/logger/logger.service.test.ts** unit tests pass including context isolation tests
- [ ] **scripts/test-logger-context.sh** validates context isolation with concurrent requests
- [ ] Examples app demonstrates context isolation working correctly
- [ ] Trace context automatically included in logs

```text
Research NestJS logging patterns and implement enhanced LoggerService:

1. Research NestJS logging best practices:
   - Study how NestJS ConsoleLogger works with dependency injection
   - Research AsyncLocalStorage/CLS patterns for request context isolation  
   - Investigate OpenTelemetry Logs API integration with NestJS
   - Look into NestJS Logger providers and custom logger implementation

2. Create **src/logger/logger.service.ts**:
   - Remove ObservabilityConfig dependency
   - Use OpenTelemetry global logger provider
   - Implement request context isolation using AsyncLocalStorage or similar
   - Support structured logging with objects
   - Auto-include trace context from active spans
   - Implement setContext(), addContext(), clearContext() with isolation
   - Create createChildLogger() method
   - Maintain NestJS ConsoleLogger compatibility

3. Create **src/logger/logger.service.test.ts**:
   - Test basic logging functionality
   - Test context isolation (concurrent requests don't share context)
   - Test trace context integration
   - Test structured logging
   - Mock OpenTelemetry global providers
   - Test child logger creation

4. Create **scripts/test-logger-context.sh**:
   - Build package and examples app
   - Start examples app with register module
   - Make concurrent HTTP requests with different context values
   - Verify each request maintains separate logging context
   - Check trace correlation in logs

5. Update examples app to demonstrate logger context isolation:
   - Add endpoint that sets logger context
   - Add concurrent request testing
   - Show context isolation in action

6. Add comprehensive JSDoc documentation with usage examples
```

---

#### Task 5: Update MetricsService for Global OpenTelemetry
Status: **Pending**

Goal: Refactor MetricsService to use OpenTelemetry's global meter provider while keeping the enhanced business metrics API.

Working Result: A **src/metrics/metrics.service.ts** that provides enhanced metrics functionality using global OpenTelemetry meter.

Validation:
- [ ] MetricsService compiles without TypeScript errors
- [ ] Can create counters, gauges, histograms without configuration
- [ ] Service labels automatically applied from resource attributes
- [ ] Custom metrics creation works (createCounter, createGauge, createHistogram)
- [ ] Metrics appear in configured exporter output

```text
Refactor **src/metrics/metrics.service.ts** to remove configuration dependency:

1. Update constructor to remove ObservabilityConfig parameter

2. Use OpenTelemetry global meter provider:
   - Import `@opentelemetry/api`
   - Get meter instance using `metrics.getMeterProvider().getMeter('nestjs-app')`

3. Update metrics creation methods:
   - `createCounter()` - use meter.createCounter()
   - `createGauge()` - use meter.createObservableGauge() 
   - `createHistogram()` - use meter.createHistogram()
   - `createSummary()` - create histogram with percentile configuration

4. Implement service label detection:
   - Extract service name/version from resource attributes
   - Auto-apply as default labels to all metrics

5. Keep enhanced business metrics API:
   - Maintain existing method signatures
   - Support custom label/attribute addition
   - Metric naming conventions and validation

6. Remove ensureServiceLabels and configuration processing

7. Add proper TypeScript interfaces for metric options

8. Update JSDoc with examples of usage
```

---

### 🔄 **Iteration 3: Enhanced Services Modernization**

#### Task 6: Modernize TracingService and Decorators
Status: **Pending**

Goal: Update TracingService and tracing decorators to work with OpenTelemetry's global tracer provider while maintaining enhanced NestJS tracing features, with immediate validation using examples app.

Working Result: Updated **src/tracing/tracing.service.ts** and **src/decorators/auto-trace.decorators.ts** that work without configuration and use global OpenTelemetry tracer, validated through examples app integration.

Validation:
- [ ] TracingService compiles without TypeScript errors
- [ ] **scripts/test-tracing.sh** passes - validates tracing with examples app
- [ ] @Trace, @TraceClass, @NoTrace decorators work correctly in examples app
- [ ] AutoTraceInterceptor creates spans for controller methods
- [ ] Span attributes and context propagation work
- [ ] **src/tracing/tracing.service.test.ts** unit tests pass
- [ ] Examples app shows custom spans alongside auto-instrumentation

```text
Modernize tracing components with immediate examples app testing:

1. Update **src/tracing/tracing.service.ts**:
   - Remove ObservabilityConfig dependency from constructor
   - Use `trace.getTracerProvider().getTracer('nestjs-app')` 
   - Keep existing tracing helper methods
   - Update span attribute utilities to work with global tracer

2. Update **src/decorators/auto-trace.decorators.ts**:
   - Remove configuration dependency
   - Use global tracer for span creation
   - Keep existing decorator logic (@Trace, @TraceClass, @NoTrace)
   - Maintain span naming conventions

3. Update **src/interceptors/auto-trace.interceptor.ts**:
   - Remove configuration injection
   - Use global tracer for automatic controller tracing
   - Keep existing span attribute logic
   - Maintain compatibility with decorators

4. Update **src/utils/span-attributes.ts**:
   - Remove configuration dependency
   - Use `trace.getActiveSpan()` for current span access
   - Keep sanitization logic but make it optional
   - Add environment variable control for sanitization (OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED)

5. Create **src/tracing/tracing.service.test.ts** unit tests:
   - Test global tracer provider usage
   - Test decorator functionality
   - Test span creation and attribute setting
   - Mock global tracer and verify calls

6. Create **scripts/test-tracing.sh** integration test:
   - Build package and examples app
   - Start examples app with register module
   - Make HTTP requests to trigger both auto and custom tracing
   - Verify both types of spans appear in console output
   - Test @Trace, @TraceClass, @NoTrace decorators work

7. Update examples app to demonstrate custom tracing:
   - Add @TraceClass decorator to a service
   - Add @Trace decorator to specific methods
   - Add @NoTrace to sensitive methods  
   - Show span attribute customization

8. Maintain all existing TypeScript interfaces and update JSDoc
```

---

#### Task 7: Update MetricsController for Simplified Architecture
Status: **Pending**

Goal: Update the MetricsController to work with the new simplified architecture and global OpenTelemetry providers, with immediate validation through examples app.

Working Result: A **src/controllers/metrics.controller.ts** that provides /metrics endpoint without configuration dependency, validated through examples app integration.

Validation:
- [ ] MetricsController compiles without TypeScript errors
- [ ] **scripts/test-metrics-endpoint.sh** passes - validates /metrics endpoint with examples app
- [ ] /metrics endpoint works correctly in examples app
- [ ] Prometheus format output includes all metrics
- [ ] **src/controllers/metrics.controller.test.ts** unit tests pass
- [ ] Controller works with global meter provider
- [ ] Environment variables control endpoint behavior

```text
Update MetricsController with immediate examples app testing:

1. Update **src/controllers/metrics.controller.ts**:
   - Remove ObservabilityConfig dependency from constructor
   - Use global meter provider to access metrics
   - Import `@opentelemetry/api` for metrics access
   - Keep existing /metrics endpoint functionality
   - Ensure Prometheus format compatibility

2. Add environment variable support:
   - Check `OTEL_METRICS_ENABLED` to conditionally enable endpoint
   - Use `OTEL_METRICS_ENDPOINT` for custom endpoint path
   - Handle case when metrics are disabled

3. Create **src/controllers/metrics.controller.test.ts** unit tests:
   - Test endpoint functionality without configuration
   - Test global meter provider usage
   - Test environment variable handling
   - Mock metrics collection and verify format
   - Test error handling scenarios

4. Create **scripts/test-metrics-endpoint.sh** integration test:
   - Build package and examples app
   - Start examples app with register module
   - Make HTTP requests to generate some metrics
   - Test /metrics endpoint returns Prometheus format
   - Verify custom metrics from MetricsService appear
   - Test with OTEL_METRICS_ENABLED=false

5. Update examples app to demonstrate metrics:
   - Add custom metrics creation in a service
   - Show both auto-instrumentation and custom metrics
   - Test different metric types (counter, gauge, histogram)

6. Add proper error handling for metrics collection failures

7. Update TypeScript types and JSDoc documentation

8. Consider making controller registration conditional based on metrics configuration
```

---

### 🔄 **Iteration 4: Environment Variable Configuration & Documentation**

#### Task 8: Create Comprehensive Environment Variable Configuration
Status: **Pending**

Goal: Document all supported OpenTelemetry environment variables and add library-specific variables for enhanced features, with immediate validation through examples app testing.

Working Result: Updated **CLAUDE.md** with comprehensive environment variable documentation and a new **docs/environment-variables.md** file, validated through examples app with different configurations.

Validation:
- [ ] **CLAUDE.md** updated with new environment variables section
- [ ] **docs/environment-variables.md** created with full variable list
- [ ] **scripts/test-env-vars.sh** passes - validates environment variables with examples app
- [ ] All documented variables actually work in the register module
- [ ] Examples app tested with development and production configurations
- [ ] Default values clearly documented and working

```text
Create comprehensive environment variable documentation with examples app validation:

1. Update **CLAUDE.md** Environment Variables section:
   - Replace custom config documentation with OpenTelemetry standard variables
   - Add library-specific variables for enhanced features
   - Include development vs production examples
   - Document safe defaults with examples

2. Create **docs/environment-variables.md** with comprehensive variable list:
   - Core OpenTelemetry variables (OTEL_SERVICE_NAME, OTEL_SERVICE_VERSION, etc.)
   - Exporter configuration (OTEL_TRACES_EXPORTER, OTEL_EXPORTER_OTLP_ENDPOINT, etc.)
   - Resource attributes (OTEL_RESOURCE_ATTRIBUTES)
   - Sampling configuration (OTEL_TRACES_SAMPLER, OTEL_TRACES_SAMPLER_ARG)
   - Library-specific variables (OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED, etc.)

3. Create **scripts/test-env-vars.sh** validation script:
   - Test examples app with different environment variable combinations
   - Verify console exporter works with default settings
   - Test OTLP configuration (mock endpoint)
   - Test resource attributes and service identification
   - Validate sampling configuration
   - Test library-specific variables

4. Update examples app with configuration examples:
   - Create **.env.development** - development configuration
   - Create **.env.production** - production configuration
   - Create **docker.env** - Docker environment variables
   - Show different exporter configurations

5. Add comprehensive configuration examples:
   - Kubernetes ConfigMap/Secret examples
   - Docker Compose environment variables
   - Different observability platform configurations

6. Document precedence rules and troubleshooting:
   - Environment variables override defaults
   - Specific endpoint variables override general ones
   - Common configuration issues and solutions
   - Links to official OpenTelemetry documentation

7. Validate all documented variables work correctly with register module
```

---

#### Task 9: Update Build Configuration and Package Exports
Status: **Pending**

Goal: Update build system to properly compile TypeScript register module and update package.json exports for the new architecture, with immediate validation through examples app.

Working Result: Updated build configuration that produces both CJS and ESM versions of the register module with proper package.json exports, validated through examples app testing.

Validation:
- [ ] `pnpm build` successfully compiles register.ts for both CJS and ESM
- [ ] **package.json** exports include register module paths
- [ ] **scripts/test-build-exports.sh** passes - validates build exports with examples app
- [ ] Both `require('@paystackhq/nestjs-observability/register')` and `import '@paystackhq/nestjs-observability/register'` work
- [ ] Build validation script passes for new exports
- [ ] TypeScript types are properly generated for register module
- [ ] Examples app can import and use register module correctly

```text
Update build system with immediate examples app validation:

1. Update **package.json** exports field:
   - Add "./register" export pointing to both CJS and ESM versions
   - Ensure proper type definitions for register module
   - Keep existing main module exports
   - Update version and description if needed

2. Update TypeScript build configurations:
   - Modify **tsconfig.build.cjs.json** to include register.ts
   - Modify **tsconfig.build.esm.json** to include register.ts
   - Ensure proper compilation of register module
   - Handle any dependency resolution issues

3. Update build scripts:
   - Modify **scripts/fix-esm-imports.js** to handle register module
   - Update **scripts/validate-build.js** to validate register exports
   - Ensure **scripts/copy-package-json.js** handles new exports
   - Add register module checks to validation

4. Create **scripts/test-build-exports.sh** validation script:
   - Build the package completely
   - Test CommonJS import: `require('@paystackhq/nestjs-observability/register')`
   - Test ESM import: `import '@paystackhq/nestjs-observability/register'`
   - Verify examples app can use register pattern
   - Test TypeScript compilation with register module
   - Validate package.json exports work correctly

5. Update **scripts/build-info.js**:
   - Include register module in build information
   - Show export paths for register module
   - Display build output structure

6. Test build process thoroughly:
   - Run full build and ensure no errors
   - Verify both CJS and ESM register modules work
   - Test examples app with built register module
   - Validate TypeScript types are accessible

7. Update build-related documentation if needed
```

---

### 🔄 **Iteration 5: Testing & Examples Update**

#### Task 10: Update Example Application for New Architecture
Status: **Pending**

Goal: Update the basic example application to demonstrate the new register pattern and simplified module usage, serving as comprehensive validation for all previous tasks.

Working Result: Updated **examples/basic-app** that uses the new `-r` register pattern and simplified ObservabilityModule, demonstrating all enhanced features working together.

Validation:
- [ ] Example app runs with `node -r @paystackhq/nestjs-observability/register dist/main.js`
- [ ] **scripts/test-complete-example.sh** passes - validates full functionality
- [ ] All observability features work (tracing, metrics, logging) together
- [ ] Environment variables control exporter configuration
- [ ] Enhanced services demonstrate context isolation
- [ ] Custom tracing decorators work alongside auto-instrumentation
- [ ] /metrics endpoint shows both auto and custom metrics
- [ ] README shows comprehensive new usage patterns

```text
Update example application as comprehensive validation:

1. Update **examples/basic-app/src/main.ts**:
   - Remove custom SDK initialization code
   - Simplify to basic NestJS app startup
   - Add example of accessing enhanced services
   - Show graceful shutdown handling

2. Update **examples/basic-app/src/app.module.ts**:
   - Use `ObservabilityModule.forRoot()` with no parameters
   - Remove all configuration setup
   - Show how all services are automatically available
   - Include MetricsController if needed

3. Create comprehensive example service files:
   - **examples/basic-app/src/example.service.ts** with @TraceClass
   - Demonstrate structured logging with context isolation
   - Show custom metrics creation (counter, gauge, histogram)
   - Include @Trace and @NoTrace decorator examples
   - Test concurrent requests for context isolation

4. Create **examples/basic-app/.env.example** and variants:
   - **.env.development** - console exporters, debug logging
   - **.env.production** - OTLP exporters, optimized settings
   - **.env.docker** - Docker-specific configurations
   - Document all available OpenTelemetry variables

5. Update **examples/basic-app/package.json**:
   - Update start scripts to use register pattern
   - Add scripts for different environments (dev, prod, docker)
   - Include testing and monitoring scripts
   - Add script variations for different exporters

6. Create **scripts/test-complete-example.sh** comprehensive validation:
   - Build package and examples app
   - Test with different environment configurations
   - Make concurrent requests to test context isolation
   - Verify traces, metrics, and logs all work together
   - Test /metrics endpoint with custom metrics
   - Validate enhanced features integration

7. Update **examples/basic-app/README.md**:
   - Document new startup pattern with examples
   - Show environment variable usage with real scenarios
   - Include comprehensive troubleshooting section
   - Add performance considerations
   - Document all enhanced features

8. Add **examples/basic-app/test-endpoints.js** for comprehensive testing:
   - Test endpoints that demonstrate all features
   - Context isolation testing endpoints
   - Custom metrics demonstration endpoints
   - Error scenarios for testing
```

---

#### Task 11: Create Integration Tests for New Architecture
Status: **Pending**

Goal: Create comprehensive integration tests that verify the register module and simplified architecture work correctly, building on all previous task implementations.

Working Result: New test files in **src/** that validate OpenTelemetry integration, environment variable configuration, and enhanced services working together.

Validation:
- [ ] Integration tests pass with `pnpm test`
- [ ] **src/register.test.ts** validates register module functionality
- [ ] **src/integration/full-stack.test.ts** tests complete workflow
- [ ] Environment variable configuration thoroughly tested
- [ ] Enhanced services functionality validated with context isolation
- [ ] All exporters tested with appropriate mocks
- [ ] Test coverage maintains 90%+ for all components

```text
Create comprehensive integration tests building on implemented tasks:

1. Create **src/register.test.ts**:
   - Test register module initialization with various configurations
   - Verify environment variable configuration and precedence
   - Test different exporter configurations (console, OTLP)
   - Mock OpenTelemetry SDK and verify correct setup
   - Test error handling for invalid configurations
   - Validate graceful shutdown functionality

2. Update **src/observability.module.test.ts**:
   - Test simplified module import without configuration
   - Verify all services are available through dependency injection
   - Test global OpenTelemetry provider access
   - Mock NestJS testing utilities for proper service testing
   - Test module registration with different configurations

3. Update **src/logger/logger.service.test.ts**:
   - Remove all configuration-based tests
   - Add tests for global logger provider usage
   - Test trace context integration and correlation
   - Verify structured logging with context isolation
   - Test concurrent logging scenarios for context separation
   - Test createChildLogger functionality

4. Update **src/metrics/metrics.service.test.ts**:
   - Test global meter provider usage without configuration
   - Verify custom metrics creation (counter, gauge, histogram)
   - Test service label detection from resource attributes
   - Mock OpenTelemetry metrics API and verify calls
   - Test business metrics API compatibility

5. Update **src/tracing/tracing.service.test.ts**:
   - Test global tracer provider usage
   - Verify decorator functionality (@Trace, @TraceClass, @NoTrace)
   - Test span creation and attribute setting
   - Test AutoTraceInterceptor with mocked HTTP contexts
   - Validate span attribute sanitization

6. Create **src/integration/full-stack.test.ts**:
   - Test complete initialization flow (register + module)
   - Verify register module + NestJS module integration
   - Test environment variable precedence and override behavior
   - Mock different exporter scenarios and validate output
   - Test enhanced services working together
   - Validate context isolation across concurrent operations

7. Update test configuration and setup:
   - Ensure proper OpenTelemetry test isolation between tests
   - Add helpers for mocking global providers
   - Configure test environment variables
   - Update **vitest.config.ts** for new test structure
   - Add test utilities for OpenTelemetry mocking

8. Create **src/test-helpers/otel-mocks.ts**:
   - Centralized OpenTelemetry mocking utilities
   - Provider setup and teardown helpers
   - Environment variable management for tests
```

---

#### Task 12: Update Documentation and Migration Guide
Status: **Pending**

Goal: Create comprehensive documentation for the new architecture and a migration guide for existing users, with validation through examples and real migration scenarios.

Working Result: Updated documentation files and a migration guide that helps users transition from the old configuration-based approach to the new environment variable approach, validated through examples app and migration testing.

Validation:
- [ ] **README.md** updated with new usage patterns
- [ ] **docs/migration-guide.md** created with step-by-step migration instructions
- [ ] **scripts/test-migration.sh** passes - validates migration scenarios
- [ ] All code examples updated and tested in documentation
- [ ] Links to OpenTelemetry documentation added and verified
- [ ] Breaking changes clearly documented with working examples

```text
Create comprehensive documentation with migration validation:

1. Update **README.md** with new architecture:
   - Replace configuration examples with register pattern
   - Show environment variable usage with practical examples
   - Update quick start guide with step-by-step instructions
   - Add new integration examples using examples app
   - Include performance benefits and comparisons

2. Create **docs/migration-guide.md** with comprehensive migration path:
   - Document breaking changes from v0.1.4 to v1.0.0
   - Provide step-by-step migration instructions with code examples
   - Show before/after code examples for real scenarios
   - Include environment variable mapping from old config
   - Add troubleshooting section for common migration issues
   - Provide migration timeline and rollback strategies

3. Create **scripts/test-migration.sh** validation script:
   - Test migration scenarios with mock old configuration
   - Validate environment variable mappings work correctly
   - Test examples app with migrated configuration
   - Verify all features work after migration
   - Test rollback scenarios if needed

4. Update **CLAUDE.md** for new development workflow:
   - Replace configuration system documentation
   - Add new environment variable patterns and validation
   - Update development workflow information
   - Document new architecture components and relationships
   - Include testing patterns for new architecture

5. Update existing documentation files:
   - **docs/first-steps.md** - new getting started flow with examples
   - **docs/best-practices.md** - environment variable best practices
   - **docs/advanced-factory-configuration.md** - mark as deprecated
   - **docs/environment-variables.md** - comprehensive variable guide

6. Create **docs/troubleshooting.md** with practical solutions:
   - Common environment variable configuration issues
   - Register module troubleshooting with examples
   - OpenTelemetry initialization problems and solutions
   - Performance considerations and optimization tips
   - Context isolation issues and debugging
   - Integration problems with popular platforms

7. Add **docs/opentelemetry-compatibility.md**:
   - Supported OpenTelemetry versions matrix
   - Environment variable compatibility table
   - Exporter compatibility and configuration matrix
   - Integration guides for popular platforms (Jaeger, Datadog, etc.)

8. Update **package.json** and repository metadata:
   - Update description and keywords for new architecture
   - Update repository links and documentation paths
   - Add new examples and migration guide links
```

---

### 🔄 **Iteration 6: Final Validation & Release Preparation**

#### Task 13: Comprehensive End-to-End Testing
Status: **Pending**

Goal: Perform comprehensive testing of the complete new architecture with real applications and multiple exporter configurations, validating all previous task implementations working together.

Working Result: Validated package that works correctly in real-world scenarios with comprehensive test coverage, performance validation, and real-world integration testing.

Validation:
- [ ] All tests pass with 90%+ coverage across all components
- [ ] **scripts/test-e2e-complete.sh** passes - validates complete functionality
- [ ] Example application works with all supported exporters
- [ ] Performance benchmarks show no regression from old architecture
- [ ] Memory leak testing passes for long-running scenarios
- [ ] Integration with popular observability platforms verified
- [ ] All enhanced features work together seamlessly

```text
Perform comprehensive end-to-end testing validating all implementations:

1. Create **scripts/test-e2e-complete.sh** master validation script:
   - Run all previous task validation scripts in sequence
   - Execute full test suite with `pnpm test:coverage` and ensure 90%+ coverage
   - Fix any failing tests or coverage gaps
   - Verify all TypeScript compilation passes for all components

2. Test with real observability platforms:
   - Configure examples app with Jaeger and verify traces appear correctly
   - Set up Prometheus scraping and verify metrics collection
   - Test OTLP export to popular platforms (Datadog, New Relic, etc.)
   - Validate enhanced features work with each platform
   - Test context isolation across different exporter configurations

3. Performance testing and comparison:
   - Benchmark startup time with register module vs old architecture
   - Measure memory usage compared to old configuration-based approach
   - Test with high-throughput applications and measure impact
   - Verify no memory leaks in long-running processes
   - Test context isolation performance with concurrent requests
   - Create performance comparison report

4. Integration testing with examples app across scenarios:
   - Test all environment variable combinations documented
   - Verify enhanced services work correctly together
   - Test error scenarios and edge cases
   - Validate graceful degradation when services unavailable
   - Test migration scenarios from old configuration

5. Documentation and migration validation:
   - Verify all code examples in documentation work as documented
   - Test migration guide with actual v0.1.4 version
   - Validate all environment variable documentation
   - Test troubleshooting scenarios and solutions
   - Verify all links and references work correctly

6. Platform compatibility testing:
   - Test on different Node.js versions (18, 20, 22)
   - Verify both CommonJS and ESM compatibility work correctly
   - Test in Docker containers with different configurations
   - Test in Kubernetes with ConfigMaps and Secrets  
   - Validate register module works in different deployment scenarios

7. Real-world scenario validation:
   - Test with actual production-like workloads
   - Validate enhanced features under realistic conditions
   - Test failover and recovery scenarios
   - Validate performance characteristics at scale

8. Create comprehensive validation report:
   - Document all test results and performance metrics
   - Include comparison with old architecture
   - List verified compatibility and integrations
   - Document any limitations or known issues
```

---

#### Task 14: Prepare Release and Update Changelog
Status: **Pending**

Goal: Prepare the package for release with proper versioning, changelog updates, and release notes, validated through final release testing.

Working Result: Package ready for release with updated version, comprehensive changelog, proper Git tagging, and final validation of release artifacts.

Validation:
- [ ] Version bumped to 1.0.0 in package.json
- [ ] CHANGELOG.md updated with breaking changes and new features
- [ ] **scripts/test-release-artifacts.sh** passes - validates release package
- [ ] Git tag created for release
- [ ] Build passes all quality checks
- [ ] Package can be successfully published
- [ ] Release artifacts tested in clean environment

```text
Prepare package for release with comprehensive validation:

1. Update version and metadata in **package.json**:
   - Bump version to 1.0.0 (major version due to breaking changes)
   - Update description to reflect new architecture
   - Verify all dependencies are at correct versions
   - Update keywords to include OpenTelemetry, register pattern
   - Ensure repository and bug URLs are correct

2. Update **CHANGELOG.md** with comprehensive changes:
   - Add new section for v1.0.0 with detailed breaking changes
   - Document all new features and improvements
   - List enhanced capabilities and performance improvements
   - Include migration instructions reference
   - Add acknowledgments and contributor credits

3. Create **scripts/test-release-artifacts.sh** validation script:
   - Run `pnpm clean && pnpm build && pnpm test` 
   - Verify all build artifacts are correct and complete
   - Test package installation from tarball in clean environment
   - Validate register module works from installed package
   - Test examples app with installed package
   - Verify TypeScript types are correctly exported

4. Update release-related files:
   - Ensure **LICENSE** is up to date
   - Update **README.md** badges, links, and version references
   - Verify all documentation links work correctly
   - Update any hardcoded version numbers in documentation

5. Git preparation and validation:
   - Ensure all changes are committed with proper commit messages
   - Run final validation: `pnpm prepublishOnly`
   - Create release tag: `git tag v1.0.0`
   - Verify git history is clean and all files are properly tracked
   - Push changes and tags to repository

6. Package publishing preparation:
   - Verify publishConfig in **package.json** is correct
   - Test with `pnpm pack` to verify package contents
   - Validate package.json exports work correctly
   - Test installation and imports in clean environment
   - Confirm no unnecessary files are included

7. Create comprehensive release notes:
   - Major architectural changes from configuration to environment variables
   - Breaking changes and migration requirements
   - New capabilities and enhanced features
   - Performance improvements and comparisons
   - Platform compatibility and requirements
   - Links to migration guide and documentation

8. Final validation checklist:
   - All tests pass with 90%+ coverage
   - Build artifacts are complete and correct
   - Package installs and works in clean environment
   - Documentation is accurate and complete
   - Migration guide tested with real scenarios
   - Release notes are comprehensive and accurate
```