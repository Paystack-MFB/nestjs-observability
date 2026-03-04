---
'@paystackhq/nestjs-observability': minor
---

@NoTraceClass() now suppresses HTTP auto-instrumentation spans in addition to interceptor-level spans, providing single-decorator route ignoring for tracing.

Previously, `@NoTraceClass()` only prevented the `AutoTraceInterceptor` from creating spans, but the OpenTelemetry HTTP instrumentation layer still generated spans for every inbound request. This meant health check endpoints and other high-frequency routes still produced noisy traces.

An `IgnoredRouteScanner` now runs at application boot, discovers all `@NoTraceClass()` controllers, resolves their full route paths (including global prefix and URI version segments), and registers them with the HTTP instrumentation's `ignoreIncomingRequestHook`. This gives true end-to-end trace suppression with a single decorator.

**Route resolution handles:**
- Array controller paths (`@Controller(['health', 'healthz'])`) — each path is registered independently
- URI-versioned routes — reads `@Version()` metadata and `ApplicationConfig.getVersioning()` to construct paths like `/v1/health`
- Global prefix with exclusions — respects `app.setGlobalPrefix('api', { exclude: ['health'] })`
- Multi-version controllers (`@Controller({ path: 'users', version: ['1', '2'] })`) — registers a route per version

**DiscoveryModule removed:** The initial implementation used NestJS's `DiscoveryService` to find controllers, but this pulled in `DiscoveryModule` as a dependency. When developing with `pnpm link:`, Node.js resolves `@nestjs/core` from both the library's and the app's `node_modules`, creating two copies with different DI container tokens. This caused `DiscoveryService` injection to fail at runtime. The fix uses a static `Set<Type>` populated by `@NoTraceClass()` at decoration time — no module imports needed, and the scanner reads from this set directly.
