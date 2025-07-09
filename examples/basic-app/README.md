# NestJS Observability - Basic Example

This example demonstrates how to use the `nestjs-observability` library in a basic NestJS application with tracing, metrics, and logging.

## Features

- **Automatic Tracing**: Controllers are automatically traced by default
- **Configurable Instrumentation**: Use decorators to control tracing behavior
- **Metrics Collection**: Automatic collection of HTTP metrics
- **Structured Logging**: Comprehensive logging with OpenTelemetry integration
- **Health Endpoints**: Untraced health check endpoints for monitoring

## Key Components

### Controllers

#### AppController (Traced)

- **Location**: `src/app.controller.ts`
- **Behavior**: All public methods are automatically traced
- **Endpoints**: User management, payments, logging, status checks

#### HealthController (NOT Traced)

- **Location**: `src/health.controller.ts`
- **Behavior**: Uses `@NoTraceClass()` decorator to exclude entire controller from tracing
- **Purpose**: Health check endpoints that don't need tracing for performance and noise reduction
- **Endpoints**:
  - `GET /health` - Basic health check
  - `GET /health/ready` - Readiness probe
  - `GET /health/live` - Liveness probe
  - `GET /health/metrics` - System metrics
  - `GET /health/version` - Version information

### Services

#### UserService (Traced)

- **Location**: `src/user.service.ts`
- **Behavior**: Uses `@TraceAllMethods()` decorator to trace all public methods
- **Purpose**: Demonstrates service-level tracing

#### PaymentService (Selective Tracing)

- **Location**: `src/payment.service.ts`
- **Behavior**: Uses `@TraceMethod()` and `@NoTrace()` decorators for selective tracing
- **Purpose**: Demonstrates fine-grained tracing control

## Decorator Examples

### Class-Level Exclusion

```typescript
@Controller('health')
@NoTraceClass() // Excludes entire controller from auto-tracing
export class HealthController {
  @Get()
  getHealth() {
    // This method will NOT be traced
    return { status: 'healthy' };
  }
}
```

### Service-Level Tracing

```typescript
@Injectable()
@TraceAllMethods() // Traces all public methods
export class UserService {
  findUser(id: string) {
    // This method will be traced
  }

  @NoTrace() // Excludes specific method from tracing
  private internalHelper() {
    // This method will NOT be traced
  }
}
```

### Method-Level Tracing

```typescript
@Injectable()
export class PaymentService {
  @TraceMethod('custom-payment-span') // Custom span name
  processPayment(data: any) {
    // This method will be traced with custom span name
  }

  @NoTrace() // Excludes from tracing
  processSensitiveData(data: any) {
    // This method will NOT be traced
  }
}
```

## Running the Example

1. Install dependencies:

```bash
pnpm install
```

2. Build the application:

```bash
pnpm build
```

3. Start the application:

```bash
pnpm start:dev
```

4. Test the endpoints:

```bash
node test-endpoints.js
```

## Testing Tracing Behavior

### Traced Endpoints (will generate spans)

- `GET /` - Hello message
- `GET /status` - Application status
- `GET /complex` - Complex operation
- `GET /users/:id` - User operations
- `POST /payments` - Payment operations
- `POST /logs/*` - Logging operations

### Non-Traced Endpoints (will NOT generate spans)

- `GET /health` - Health check
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check
- `GET /health/metrics` - System metrics
- `GET /health/version` - Version info

## Configuration

The observability configuration is in `src/app.module.ts`:

```typescript
ObservabilityModule.forRoot({
  serviceName: 'basic-example',
  tracing: {
    enabled: true,
    autoInstrumentation: {
      enabled: true,
      captureArguments: true,
    },
  },
  // ... other config
});
```

## Environment Variables

- `TRACING_ENABLED` - Enable/disable tracing (default: true)
- `AUTO_INSTRUMENTATION_ENABLED` - Enable/disable auto-instrumentation (default: true)
- `CAPTURE_ARGUMENTS` - Capture method arguments in traces (default: true)
- `OTLP_TRACES_ENDPOINT` - OpenTelemetry traces endpoint
- `OTLP_LOGS_ENDPOINT` - OpenTelemetry logs endpoint

## Observability Stack

This example works best with:

- **Jaeger** for distributed tracing
- **Prometheus** for metrics collection
- **Grafana** for visualization
- **OpenTelemetry Collector** for telemetry aggregation

## Key Learning Points

1. **Default Behavior**: Controllers are traced automatically
2. **Selective Exclusion**: Use `@NoTraceClass()` to exclude entire controllers
3. **Service Tracing**: Use `@TraceAllMethods()` for comprehensive service tracing
4. **Method Control**: Use `@TraceMethod()` and `@NoTrace()` for fine-grained control
5. **Performance**: Health checks and monitoring endpoints should typically be excluded from tracing
