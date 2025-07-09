# NestJS Observability Examples

This directory contains comprehensive examples demonstrating the features of the NestJS Observability module.

## Examples

### [Basic App](./basic-app/)

A complete example application showcasing all observability features:

#### **🔧 Core Features**

- **Structured Logging**: JSON format for production, pretty format for development
- **Context Management**: Persistent context across log calls and child loggers
- **OpenTelemetry Integration**: Automatic trace ID inclusion in logs
- **Auto-instrumentation**: Automatic tracing of controllers and services
- **Performance Monitoring**: Built-in metrics and HTTP request tracing
- **Error Handling**: Enhanced error logging with stack traces

#### **📝 Enhanced Logging Capabilities**

- **Basic Logging**: Standard log levels (info, error, debug, warn, fatal)
- **Structured Logging**: Rich object-based logging with metadata
- **Context Persistence**: Maintain context across multiple log calls
- **Child Loggers**: Isolated logging contexts for different components
- **Business Event Logging**: Track domain-specific events
- **Security Event Logging**: Monitor authentication and security events
- **Performance Metrics**: Log operation timing and performance data
- **Exception Handling**: Comprehensive error logging with context

#### **🚀 Key Components**

##### **LoggingService**

```typescript
// Comprehensive logging service with all features
class LoggingService {
  // Basic logging methods
  logInfo(message: string): Promise<void>;
  logError(error: string, context?: string): Promise<void>;

  // Structured logging methods
  logUserAction(action: string, userId: string, metadata?: Record<string, any>): Promise<void>;
  logPerformanceMetrics(operation: string, duration: number): Promise<void>;
  logBusinessEvent(eventType: string, eventData: Record<string, any>): Promise<void>;
  logSecurityEvent(event: string, userId: string, ipAddress: string): Promise<void>;

  // Context management demonstrations
  demonstrateContextPersistence(): Promise<void>;
  demonstrateContextUpdates(): Promise<void>;
  demonstrateComprehensiveLogging(): Promise<void>;
}
```

##### **API Endpoints**

```typescript
// Basic logging endpoints
POST / logs / info; // Log info messages
POST / logs / error; // Log error messages
POST / logs / debug; // Log debug messages
POST / logs / warning; // Log warning messages
POST / logs / activity; // Log user activities

// Enhanced logging endpoints
POST / logs / user - action; // Log user actions with metadata
POST / logs / performance; // Log performance metrics
POST / logs / business - event; // Log business events
POST / logs / security - event; // Log security events
POST / logs / exception; // Log exceptions with context

// Context management demonstrations
GET / logs / demo / context - persistence; // Demonstrate context persistence
GET / logs / demo / context - updates; // Demonstrate context management
GET / logs / demo / comprehensive; // Comprehensive logging example
```

#### **📊 Usage Examples**

##### **Basic Logging**

```bash
# Log info message
curl -X POST http://localhost:3000/logs/info \
  -H "Content-Type: application/json" \
  -d '{"message": "Application started successfully"}'

# Log error with context
curl -X POST http://localhost:3000/logs/error \
  -H "Content-Type: application/json" \
  -d '{"error": "Database connection failed", "context": "DatabaseService"}'
```

##### **Structured Logging**

```bash
# Log user action with metadata
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

# Log performance metrics
curl -X POST http://localhost:3000/logs/performance \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "database_query",
    "duration": 250
  }'
```

##### **Business Event Logging**

```bash
# Log business event
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

# Log security event
curl -X POST http://localhost:3000/logs/security-event \
  -H "Content-Type: application/json" \
  -d '{
    "event": "failed_login_attempt",
    "userId": "user-suspicious",
    "ipAddress": "10.0.0.1"
  }'
```

##### **Context Management**

```bash
# Demonstrate context persistence
curl -X GET http://localhost:3000/logs/demo/context-persistence

# Demonstrate context updates
curl -X GET http://localhost:3000/logs/demo/context-updates

# Comprehensive logging demonstration
curl -X GET http://localhost:3000/logs/demo/comprehensive
```

#### **🔍 Log Output Examples**

##### **Development Mode (Pretty Formatted)**

```
[Nest] 12345  - 01/15/2024, 10:30:00 AM     LOG [RequestHandler] Processing user request
[Nest] 12345  - 01/15/2024, 10:30:00 AM     LOG [RequestHandler] {
  requestId: 'req-456',
  userId: 'user-123',
  sessionId: 'session-789',
  message: 'Validation completed'
}
```

##### **Production Mode (JSON Structured)**

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

#### **⚙️ Configuration**

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

## Getting Started

1. **Navigate to the example directory:**

   ```bash
   cd examples/basic-app
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Copy environment file:**

   ```bash
   cp env.example .env
   ```

4. **Start the application:**

   ```bash
   npm start
   ```

5. **Test the logging features:**
   ```bash
   node test-endpoints.js
   ```

## Key Learning Points

### **📝 Logging Best Practices**

1. **Use structured logging** for better searchability and analysis
2. **Leverage context management** for correlated logs across operations
3. **Include trace IDs** for distributed tracing correlation
4. **Use appropriate log levels** for different types of information
5. **Monitor performance** by logging operation timing and metrics

### **🔧 Observability Features**

1. **Automatic tracing** of controllers and services
2. **Context persistence** across log calls
3. **OpenTelemetry integration** for distributed tracing
4. **Metrics collection** for performance monitoring
5. **Error handling** with comprehensive stack traces

### **🚀 Advanced Features**

1. **Child loggers** for isolated logging contexts
2. **Business event tracking** for domain-specific monitoring
3. **Security event logging** for authentication and authorization
4. **Performance metrics** for operation timing and throughput
5. **Exception handling** with rich contextual information

## Integration with Observability Tools

### **OpenTelemetry**

- Logs automatically include trace IDs when spans are active
- Distributed tracing correlates logs across services
- Automatic instrumentation of HTTP requests and database calls

### **Prometheus Metrics**

- Built-in HTTP request metrics
- Custom business metrics
- Performance monitoring dashboards

### **Log Aggregation**

- Structured JSON logs work seamlessly with ELK stack
- Fluentd/Fluent Bit integration
- CloudWatch, Datadog, and other log platforms

## Additional Resources

- [NestJS Observability Documentation](../README.md)
- [Basic App Example](./basic-app/README.md)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Structured Logging Best Practices](https://docs.microsoft.com/en-us/azure/azure-monitor/logs/structured-logs)
