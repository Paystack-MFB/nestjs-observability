# NestJS Observability Basic Example

This example demonstrates the comprehensive logging capabilities of the NestJS Observability module, showcasing structured logging, context management, OpenTelemetry integration, and performance monitoring.

## Features Demonstrated

### 🔧 **Core Observability Features**

- **Structured Logging**: JSON format for production, pretty format for development
- **Context Management**: Persistent context across log calls and child loggers
- **OpenTelemetry Integration**: Automatic trace ID inclusion in logs
- **Performance Monitoring**: Built-in metrics and tracing
- **Error Handling**: Enhanced error logging with stack traces
- **Auto-instrumentation**: Automatic tracing of controllers and services

### 📝 **Enhanced Logging Capabilities**

- **Basic Logging**: Standard log levels (info, error, debug, warn)
- **Structured Logging**: Rich object-based logging with metadata
- **Context Persistence**: Maintain context across multiple log calls
- **Child Loggers**: Isolated logging contexts for different components
- **Business Event Logging**: Track domain-specific events
- **Security Event Logging**: Monitor authentication and security events
- **Performance Metrics**: Log operation timing and performance data
- **Exception Handling**: Comprehensive error logging with context

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Start the application
npm start
```

### Testing the Logging Features

```bash
# Run the comprehensive test suite
node test-endpoints.js
```

## Logging Examples

### 1. Basic Logging

```typescript
// Simple string logging
logger.log('User logged in successfully');
logger.error('Database connection failed');
logger.debug('Processing user request');
logger.warn('Rate limit approaching');
```

### 2. Structured Logging

```typescript
// Rich object logging
logger.log({
  message: 'User action performed',
  action: 'login',
  userId: 'user-123',
  timestamp: new Date().toISOString(),
  metadata: {
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...',
    attempt: 1,
  },
});
```

### 3. Context Management

```typescript
// Create child logger with persistent context
const requestLogger = logger.createChildLogger('RequestHandler', {
  requestId: 'req-456',
  userId: 'user-123',
  sessionId: 'session-789',
});

// All subsequent logs include the context
requestLogger.log('Processing request');
requestLogger.log('Validation completed');
requestLogger.log('Request finished');
```

### 4. Performance Monitoring

```typescript
// Log performance metrics
logger.log(
  {
    message: 'Database query performance',
    operation: 'user_lookup',
    duration: 250,
    unit: 'ms',
    threshold: 500,
    status: 'normal',
  },
  'PerformanceMonitor'
);
```

### 5. Business Event Logging

```typescript
// Track business events
logger.log(
  {
    message: 'Payment processed',
    eventType: 'payment_success',
    eventData: {
      amount: 99.99,
      currency: 'USD',
      customerId: 'cust-123',
      paymentMethod: 'credit_card',
    },
  },
  'BusinessEvents'
);
```

### 6. Security Event Logging

```typescript
// Monitor security events
const securityLogger = logger.createChildLogger('SecurityMonitor', {
  securityLevel: 'high',
  eventCategory: 'authentication',
});

securityLogger.warn({
  message: 'Failed login attempt',
  event: 'failed_login',
  userId: 'user-456',
  ipAddress: '10.0.0.1',
  timestamp: new Date().toISOString(),
  requiresReview: true,
});
```

### 7. Exception Handling

```typescript
// Comprehensive error logging
try {
  await riskyOperation();
} catch (error) {
  const errorLogger = logger.createChildLogger('ErrorHandler', {
    errorId: `error-${Date.now()}`,
    severity: 'high',
    operation: 'database_connection',
  });

  errorLogger.error(error, 'DatabaseError');
  errorLogger.debug({
    message: 'Additional error context',
    connectionPool: 'main',
    retryAttempt: 3,
    lastSuccessful: '2024-01-15T10:30:00Z',
  });
}
```

## API Endpoints

### Basic Logging Endpoints

- `POST /logs/info` - Log info messages
- `POST /logs/error` - Log error messages
- `POST /logs/debug` - Log debug messages
- `POST /logs/warning` - Log warning messages
- `POST /logs/activity` - Log user activities

### Enhanced Logging Endpoints

- `POST /logs/user-action` - Log user actions with metadata
- `POST /logs/performance` - Log performance metrics
- `POST /logs/business-event` - Log business events
- `POST /logs/security-event` - Log security events
- `POST /logs/exception` - Log exceptions with context

### Context Management Demonstrations

- `GET /logs/demo/context-persistence` - Demonstrate context persistence
- `GET /logs/demo/context-updates` - Demonstrate context management
- `GET /logs/demo/comprehensive` - Comprehensive logging example

## Usage Examples

### Basic Info Logging

```bash
curl -X POST http://localhost:3000/logs/info \
  -H "Content-Type: application/json" \
  -d '{"message": "Application started successfully"}'
```

### User Action Logging

```bash
curl -X POST http://localhost:3000/logs/user-action \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "userId": "user-123",
    "metadata": {
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "attempt": 1
    }
  }'
```

### Performance Metrics

```bash
curl -X POST http://localhost:3000/logs/performance \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "database_query",
    "duration": 250
  }'
```

### Business Event Logging

```bash
curl -X POST http://localhost:3000/logs/business-event \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "payment_processed",
    "eventData": {
      "amount": 99.99,
      "currency": "USD",
      "customerId": "cust-123",
      "paymentMethod": "credit_card"
    }
  }'
```

### Security Event Logging

```bash
curl -X POST http://localhost:3000/logs/security-event \
  -H "Content-Type: application/json" \
  -d '{
    "event": "failed_login_attempt",
    "userId": "user-suspicious",
    "ipAddress": "10.0.0.1"
  }'
```

### Exception Logging

```bash
curl -X POST http://localhost:3000/logs/exception \
  -H "Content-Type: application/json" \
  -d '{
    "error": "Database connection failed",
    "context": {
      "database": "postgresql",
      "host": "localhost",
      "port": 5432,
      "connectionPool": "main",
      "retryAttempt": 3
    }
  }'
```

## Log Output Examples

### Development Mode (Pretty Formatted)

```
[Nest] 12345  - 01/15/2024, 10:30:00 AM     LOG [RequestHandler] Processing user request
[Nest] 12345  - 01/15/2024, 10:30:00 AM     LOG [RequestHandler] {
  requestId: 'req-456',
  userId: 'user-123',
  sessionId: 'session-789',
  message: 'Validation completed'
}
```

### Production Mode (JSON Structured)

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "log",
  "message": "User action performed",
  "context": "UserActions",
  "serviceName": "basic-example",
  "serviceVersion": "1.0.0",
  "environment": "production",
  "pid": 12345,
  "action": "login",
  "userId": "user-123",
  "sessionId": "session-456",
  "traceId": "1234567890abcdef",
  "spanId": "abcdef1234567890"
}
```

## Context Management Demonstrations

### Context Persistence Demo

```bash
curl -X GET http://localhost:3000/logs/demo/context-persistence
```

This demonstrates how child loggers maintain context across multiple log calls.

### Context Updates Demo

```bash
curl -X GET http://localhost:3000/logs/demo/context-updates
```

This shows how to manage context using child loggers for different phases of operation.

### Comprehensive Logging Demo

```bash
curl -X GET http://localhost:3000/logs/demo/comprehensive
```

This provides a complete example of transaction processing with full context and structured logging.

## Configuration

The logging behavior can be configured via environment variables:

```env
# Basic Configuration
NODE_ENV=production              # Enables JSON structured logging
LOG_LEVEL=info                   # Set logging level
SERVICE_NAME=basic-example       # Service name in logs
SERVICE_VERSION=1.0.0           # Service version in logs

# OpenTelemetry Configuration
TRACING_ENABLED=true            # Enable distributed tracing
OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces

# Metrics Configuration
METRICS_ENABLED=true            # Enable Prometheus metrics
METRICS_ENDPOINT=/metrics       # Metrics endpoint path
```

## Best Practices

### 1. **Use Structured Logging**

```typescript
// Good: Structured with consistent fields
logger.log({
  message: 'User login successful',
  userId: 'user-123',
  timestamp: new Date().toISOString(),
  duration: 250,
});

// Avoid: Unstructured string interpolation
logger.log(`User ${userId} logged in after ${duration}ms`);
```

### 2. **Leverage Context Management**

```typescript
// Create child loggers for different contexts
const authLogger = logger.createChildLogger('AuthService', {
  module: 'authentication',
  version: '2.0.0',
});

const paymentLogger = logger.createChildLogger('PaymentService', {
  module: 'payments',
  processor: 'stripe',
});
```

### 3. **Use Appropriate Log Levels**

```typescript
logger.debug('Detailed diagnostic information');
logger.log('General application flow');
logger.warn('Warning conditions');
logger.error('Error conditions');
logger.fatal('Critical system failures');
```

### 4. **Include Relevant Context**

```typescript
// Include operation context
logger.log({
  message: 'Database query executed',
  operation: 'user_lookup',
  duration: 150,
  recordsFound: 1,
  query: 'SELECT * FROM users WHERE id = ?',
});
```

### 5. **Monitor Performance**

```typescript
const startTime = Date.now();
await performOperation();
const duration = Date.now() - startTime;

logger.log({
  message: 'Operation completed',
  operation: 'data_processing',
  duration,
  recordsProcessed: 100,
  status: duration > 1000 ? 'slow' : 'normal',
});
```

## Integration with Observability Tools

### OpenTelemetry

- Logs automatically include trace IDs when spans are active
- Distributed tracing correlates logs across services
- Automatic instrumentation of HTTP requests and database calls

### Prometheus Metrics

- Built-in HTTP request metrics
- Custom business metrics
- Performance monitoring dashboards

### Log Aggregation

- Structured JSON logs work seamlessly with ELK stack
- Fluentd/Fluent Bit integration
- CloudWatch, Datadog, and other log platforms

## Monitoring and Alerting

### Key Metrics to Monitor

- **Error Rate**: Monitor `level: "error"` logs
- **Performance**: Track `duration` fields in performance logs
- **Security Events**: Alert on `securityLevel: "high"` events
- **Business Events**: Track conversion and user actions

### Sample Alerting Rules

```yaml
# High error rate alert
- alert: HighErrorRate
  expr: rate(logs_total{level="error"}[5m]) > 0.1

# Slow operations alert
- alert: SlowOperations
  expr: histogram_quantile(0.95, logs_duration_seconds) > 1.0

# Security events alert
- alert: SecurityEvent
  expr: increase(logs_total{securityLevel="high"}[1m]) > 0
```

## Additional Resources

- [NestJS Observability Documentation](../../README.md)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Structured Logging Best Practices](https://docs.microsoft.com/en-us/azure/azure-monitor/logs/structured-logs)

## Troubleshooting

### Common Issues

1. **Logs not appearing**: Check `LOG_LEVEL` and `NODE_ENV` settings
2. **Missing trace IDs**: Ensure tracing is enabled and spans are active
3. **Performance impact**: Use appropriate log levels and async logging
4. **Context not persisting**: Use child loggers for context isolation

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Enable all tracing
TRACING_ENABLED=true npm start
```
