# Troubleshooting Guide

This guide helps you diagnose and resolve common issues when using the NestJS Observability Package v1.0 with the new register pattern and environment variable architecture.

## 🚀 Quick Diagnostics

### Basic Health Check

Run this diagnostic command to check your setup:

```bash
# Check environment variables
echo "Service: $OTEL_SERVICE_NAME"
echo "Version: $OTEL_SERVICE_VERSION"
echo "Environment: $NODE_ENV"
echo "Traces: $OTEL_TRACES_EXPORTER"
echo "Metrics: $OTEL_METRICS_EXPORTER"

# Test register module
node -r @paystackhq/nestjs-observability/register -e "console.log('✅ Register module works')"

# Check package installation
npm list @paystackhq/nestjs-observability
```

### Debug Mode

Enable debug logging to see detailed information:

```bash
export OTEL_LOG_LEVEL="debug"
export DEBUG="nestjs-observability:*"
node -r @paystackhq/nestjs-observability/register dist/main.js
```

## 🔍 Common Issues

### Issue 1: Application Won't Start

**Symptoms:**

```
Error: Cannot resolve module '@paystackhq/nestjs-observability/register'
```

**Diagnosis:**

```bash
# Check if package is installed
ls node_modules/@paystackhq/nestjs-observability/

# Check for register module
ls node_modules/@paystackhq/nestjs-observability/dist/cjs/register.js
ls node_modules/@paystackhq/nestjs-observability/dist/esm/register.js
```

**Solutions:**

1. **Reinstall Package:**

   ```bash
   npm uninstall @paystackhq/nestjs-observability
   npm install @paystackhq/nestjs-observability@^1.0.0
   ```

2. **Clear Cache:**

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check Package Version:**

   ```bash
   npm list @paystackhq/nestjs-observability
   # Should show version 1.0.0 or higher
   ```

4. **Verify Build:**
   ```bash
   cd node_modules/@paystackhq/nestjs-observability
   ls dist/
   # Should contain both cjs/ and esm/ directories
   ```

### Issue 2: No Telemetry Data

**Symptoms:**

- Application starts successfully
- No traces, metrics, or logs appear in console or platform
- `/metrics` endpoint shows no custom metrics

**Diagnosis:**

```bash
# Check environment variables
env | grep OTEL_

# Test with console exporters
export OTEL_TRACES_EXPORTER="console"
export OTEL_METRICS_EXPORTER="console"
export OTEL_LOGS_EXPORTER="console"

# Start app and make requests
curl http://localhost:3000/health
curl http://localhost:3000/metrics
```

**Solutions:**

1. **Verify Environment Variables:**

   ```bash
   # Required variables
   export OTEL_SERVICE_NAME="your-app-name"
   export OTEL_SERVICE_VERSION="1.0.0"

   # Set exporters explicitly
   export OTEL_TRACES_EXPORTER="console"
   export OTEL_METRICS_EXPORTER="console"
   ```

2. **Check Module Import:**

   ```typescript
   // Ensure you're using the new pattern
   @Module({
     imports: [
       ObservabilityModule.forRoot(), // ✅ Correct
       // NOT: ObservabilityModule.forRootAsync({...}) // ❌ Old pattern
     ],
   })
   ```

3. **Verify Register Pattern:**

   ```bash
   # Make sure you're using the register flag
   node -r @paystackhq/nestjs-observability/register dist/main.js
   ```

4. **Test Auto-Instrumentation:**
   ```bash
   # Make HTTP requests to trigger auto-instrumentation
   curl http://localhost:3000/any-endpoint
   # Should see HTTP traces in console output
   ```

### Issue 3: OTLP Export Failures

**Symptoms:**

```
Failed to export traces via OTLP
Network error: connect ECONNREFUSED
```

**Diagnosis:**

```bash
# Test OTLP endpoint connectivity
curl -v "$OTEL_EXPORTER_OTLP_ENDPOINT/v1/traces"

# Check environment variables
echo "Endpoint: $OTEL_EXPORTER_OTLP_ENDPOINT"
echo "Headers: $OTEL_EXPORTER_OTLP_HEADERS"
```

**Solutions:**

1. **Verify Endpoint URL:**

   ```bash
   # Common endpoints
   export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.honeycomb.io"
   export OTEL_EXPORTER_OTLP_ENDPOINT="https://api.datadoghq.com"
   export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
   ```

2. **Check Authentication:**

   ```bash
   # Honeycomb example
   export OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=your-api-key,x-honeycomb-dataset=your-dataset"

   # Datadog example
   export OTEL_EXPORTER_OTLP_HEADERS="dd-api-key=your-api-key"

   # Generic Bearer token
   export OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer your-token"
   ```

3. **Test Network Connectivity:**

   ```bash
   # Test if endpoint is reachable
   curl -I "$OTEL_EXPORTER_OTLP_ENDPOINT"

   # Test with authentication
   curl -H "$(echo $OTEL_EXPORTER_OTLP_HEADERS | tr ',' '\n' | head -1)" "$OTEL_EXPORTER_OTLP_ENDPOINT"
   ```

4. **Fallback to Console:**
   ```bash
   # Temporarily use console to verify telemetry generation
   export OTEL_TRACES_EXPORTER="console"
   export OTEL_METRICS_EXPORTER="console"
   ```

### Issue 4: TypeScript Compilation Errors

**Symptoms:**

```
error TS2307: Cannot find module '@paystackhq/nestjs-observability'
error TS2304: Cannot find name 'TraceClass'
```

**Diagnosis:**

```bash
# Check TypeScript configuration
cat tsconfig.json

# Check type definitions
ls node_modules/@paystackhq/nestjs-observability/*.d.ts
ls node_modules/@paystackhq/nestjs-observability/dist/**/*.d.ts
```

**Solutions:**

1. **Update TypeScript Configuration:**

   ```json
   {
     "compilerOptions": {
       "moduleResolution": "node",
       "esModuleInterop": true,
       "allowSyntheticDefaultImports": true,
       "skipLibCheck": true
     }
   }
   ```

2. **Install Required Types:**

   ```bash
   npm install --save-dev @types/node
   npm install reflect-metadata
   ```

3. **Update Import Statements:**

   ```typescript
   // ✅ Correct imports
   import { ObservabilityModule, LoggerService, MetricsService } from '@paystackhq/nestjs-observability';
   import { TraceClass, Trace, NoTrace } from '@paystackhq/nestjs-observability';
   ```

4. **Check Package Exports:**
   ```bash
   # Verify package.json exports
   cat node_modules/@paystackhq/nestjs-observability/package.json | jq .exports
   ```

### Issue 5: Custom Metrics Not Working

**Symptoms:**

- `/metrics` endpoint works but shows no custom metrics
- `MetricsService.createCounter()` doesn't appear in output
- Only HTTP auto-instrumentation metrics visible

**Diagnosis:**

```bash
# Check metrics endpoint
curl http://localhost:3000/metrics | grep -i "custom\|example\|business"

# Check environment variables
echo "Metrics enabled: $OTEL_METRICS_ENABLED"
echo "Metrics endpoint: $OTEL_METRICS_ENDPOINT"
```

**Solutions:**

1. **Verify MetricsService Usage:**

   ```typescript
   @Injectable()
   export class YourService implements OnModuleInit {
     private counter: any;

     constructor(private readonly metrics: MetricsService) {}

     onModuleInit() {
       // Create metrics in onModuleInit
       this.counter = this.metrics.createCounter('my_custom_metric_total', 'Description of my metric');
     }

     someMethod() {
       // Use the metric
       this.counter.add(1, { status: 'success' });
     }
   }
   ```

2. **Check Metric Names:**

   ```typescript
   // ✅ Valid metric names (lowercase, underscores)
   'user_requests_total';
   'payment_processing_duration_seconds';

   // ❌ Invalid metric names
   'UserRequests'; // uppercase
   'requests-total'; // hyphens
   ```

3. **Verify Metrics Are Being Called:**

   ```typescript
   // Add logging to verify metrics are created and used
   onModuleInit() {
     this.counter = this.metrics.createCounter('test_counter', 'Test counter');
     console.log('Counter created:', this.counter);
   }

   someMethod() {
     console.log('Recording metric...');
     this.counter.add(1);
   }
   ```

4. **Check Prometheus Format:**
   ```bash
   # Custom metrics should appear with your service labels
   curl http://localhost:3000/metrics | grep -A 5 "TYPE.*counter"
   ```

### Issue 6: Context Isolation Problems

**Symptoms:**

- Logs from different requests mixed together
- Trace IDs not unique per request
- Child loggers not working correctly

**Diagnosis:**

```bash
# Test concurrent requests
curl http://localhost:3000/test &
curl http://localhost:3000/test &
curl http://localhost:3000/test &
wait

# Check logs for trace correlation
grep -o "traceId=[^,]*" logs.txt | sort | uniq -c
```

**Solutions:**

1. **Verify LoggerService Usage:**

   ```typescript
   @Injectable()
   export class YourService {
     constructor(private readonly logger: LoggerService) {
       // Set service-level context
       this.logger.setContext({ service: 'YourService' });
     }

     async handleRequest(requestId: string) {
       // Add request-specific context
       this.logger.addContext('requestId', requestId);

       // Use child logger for isolated operations
       const childLogger = this.logger.createChildLogger();
       childLogger.addContext('operation', 'handleRequest');

       childLogger.info('Processing request');
       // Child logger automatically includes parent context
     }
   }
   ```

2. **Check Async Context:**

   ```typescript
   // Ensure async operations maintain context
   async processData(data: any) {
     this.logger.addContext('dataId', data.id);

     // Context should be maintained across async boundaries
     await this.asyncOperation();

     // This should still include dataId context
     this.logger.info('Data processed');
   }
   ```

### Issue 7: Docker Deployment Issues

**Symptoms:**

- Works locally but fails in Docker
- Register module not found in container
- Environment variables not being read

**Diagnosis:**

```dockerfile
# Add to Dockerfile for debugging
RUN ls -la node_modules/@paystackhq/nestjs-observability/
RUN echo $OTEL_SERVICE_NAME
RUN node -r @paystackhq/nestjs-observability/register -e "console.log('Test')"
```

**Solutions:**

1. **Verify Dockerfile:**

   ```dockerfile
   FROM node:18

   # Set environment variables before COPY
   ENV OTEL_SERVICE_NAME="my-app"
   ENV OTEL_SERVICE_VERSION="1.0.0"
   ENV NODE_ENV="production"

   WORKDIR /app

   # Copy package files first
   COPY package*.json ./
   RUN npm install

   # Copy source code
   COPY . .
   RUN npm run build

   # Verify register module exists
   RUN ls -la node_modules/@paystackhq/nestjs-observability/dist/

   CMD ["node", "-r", "@paystackhq/nestjs-observability/register", "dist/main.js"]
   ```

2. **Check Build Context:**

   ```bash
   # Build with verbose output
   docker build --progress=plain -t my-app .

   # Test register module in container
   docker run --rm my-app node -r @paystackhq/nestjs-observability/register -e "console.log('OK')"
   ```

3. **Environment Variable Injection:**
   ```bash
   # Test with environment variables
   docker run --rm \
     -e OTEL_SERVICE_NAME="test-app" \
     -e OTEL_TRACES_EXPORTER="console" \
     my-app
   ```

### Issue 8: High Memory Usage

**Symptoms:**

- Memory usage increases over time
- Out of memory errors in production
- High heap usage in metrics

**Diagnosis:**

```bash
# Monitor memory usage
node --inspect --max-old-space-size=4096 -r @paystackhq/nestjs-observability/register dist/main.js

# Check heap dump
curl http://localhost:3000/metrics | grep -i memory
```

**Solutions:**

1. **Optimize Sampling:**

   ```bash
   # Reduce trace sampling in production
   export OTEL_TRACES_SAMPLER="traceidratio"
   export OTEL_TRACES_SAMPLER_ARG="0.01"  # 1% sampling
   ```

2. **Configure Export Intervals:**

   ```bash
   # Increase export intervals to reduce memory pressure
   export OTEL_METRIC_EXPORT_INTERVAL="60000"  # 60 seconds
   export OTEL_SPAN_EXPORT_TIMEOUT="30000"     # 30 seconds
   ```

3. **Limit Span Attributes:**

   ```bash
   # Enable attribute sanitization
   export OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED="true"
   ```

4. **Check for Leaks:**
   ```typescript
   // Ensure proper cleanup in services
   @Injectable()
   export class YourService implements OnModuleDestroy {
     onModuleDestroy() {
       // Clean up resources
       this.logger.clearContext();
     }
   }
   ```

## 🔧 Advanced Debugging

### Enable Detailed Logging

```bash
# OpenTelemetry debug logs
export OTEL_LOG_LEVEL="debug"

# Node.js debug for specific modules
export DEBUG="nestjs-observability:*,@opentelemetry/*"

# NestJS debug logging
export LOG_LEVEL="debug"
```

### Inspect Register Module

```bash
# Check what the register module loads
node -r @paystackhq/nestjs-observability/register -e "
  console.log('OpenTelemetry loaded:', typeof require('@opentelemetry/api'));
  console.log('Auto instrumentation:', typeof require('@opentelemetry/auto-instrumentations-node'));
"
```

### Test Minimal Setup

Create a minimal test to isolate issues:

```typescript
// test-minimal.ts
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ObservabilityModule } from '@paystackhq/nestjs-observability';

@Module({
  imports: [ObservabilityModule.forRoot()],
})
class TestModule {}

async function test() {
  const app = await NestFactory.create(TestModule);
  console.log('✅ Minimal setup works');
  await app.close();
}

test().catch(console.error);
```

```bash
# Test minimal setup
node -r @paystackhq/nestjs-observability/register test-minimal.js
```

### Network Debugging

```bash
# Test OTLP connectivity with curl
curl -X POST \
  -H "Content-Type: application/x-protobuf" \
  -H "$(echo $OTEL_EXPORTER_OTLP_HEADERS | tr ',' '\n' | head -1)" \
  --data-binary @/dev/null \
  "$OTEL_EXPORTER_OTLP_ENDPOINT/v1/traces"

# Use tcpdump to monitor network traffic
sudo tcpdump -i any -A host api.honeycomb.io
```

## 📞 Getting Help

### Before Asking for Help

1. **Check the logs** with debug mode enabled
2. **Verify environment variables** are set correctly
3. **Test with console exporters** first
4. **Try the minimal setup** to isolate the issue
5. **Check the migration guide** if upgrading from v0.x

### When Reporting Issues

Include this information:

```bash
# Environment info
echo "Node.js: $(node --version)"
echo "Package: $(npm list @paystackhq/nestjs-observability)"
echo "OS: $(uname -a)"

# Configuration
env | grep OTEL_ | sort

# Test register module
node -r @paystackhq/nestjs-observability/register -e "console.log('Register works')" 2>&1

# Package structure
ls -la node_modules/@paystackhq/nestjs-observability/dist/
```

### Community Resources

- **GitHub Issues**: Report bugs with reproduction steps
- **GitHub Discussions**: Ask questions and share experiences
- **Migration Guide**: [docs/migration-guide.md](./migration-guide.md)
- **Examples**: Study `examples/basic-app/` for working patterns

## 🚀 Performance Tips

### Production Optimizations

```bash
# Sampling for cost control
export OTEL_TRACES_SAMPLER="traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.1"

# Batch exports for efficiency
export OTEL_BSP_MAX_EXPORT_BATCH_SIZE="512"
export OTEL_BSP_EXPORT_TIMEOUT="30000"

# Resource attributes optimization
export OTEL_RESOURCE_ATTRIBUTES="service.name=my-app,service.version=1.0.0"
```

### Memory Management

```typescript
// Use child loggers for temporary context
const childLogger = this.logger.createChildLogger();
childLogger.addContext('tempData', data);
// Child logger is garbage collected when out of scope
```

### Monitoring Health

```typescript
// Add health checks for observability
@Controller('health')
export class HealthController {
  @Get('observability')
  checkObservability() {
    return {
      traces: process.env.OTEL_TRACES_EXPORTER,
      metrics: process.env.OTEL_METRICS_EXPORTER,
      service: process.env.OTEL_SERVICE_NAME,
    };
  }
}
```
