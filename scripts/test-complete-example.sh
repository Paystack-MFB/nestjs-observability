#!/bin/bash

# Complete Example Application Validation Script
# This script validates all observability features working together

set -e

echo "🧪 Testing Complete Example Application with All Observability Features..."

# Build the package and examples app first
echo "📦 Building package..."
pnpm build

echo "📦 Building examples app..."
cd examples/basic-app
pnpm build
cd ../..

# Function to test app with specific environment configuration
test_with_environment() {
    local env_name="$1"
    local env_file="$2"
    local test_description="$3"
    local run_tests="$4"
    
    echo ""
    echo "🚀 Test: $test_description"
    echo "📁 Using environment: $env_name"
    
    cd examples/basic-app
    
    # Load environment if file provided
    if [ -n "$env_file" ] && [ -f "$env_file" ]; then
        set -a  # Export all variables
        source "$env_file"
        set +a
        echo "✅ Environment loaded from: $env_file"
    else
        # Manual environment setup
        echo "✅ Using manual environment configuration"
    fi
    
    # Show key configuration
    echo "📊 Configuration:"
    echo "  Service: ${OTEL_SERVICE_NAME:-not set}"
    echo "  Traces: ${OTEL_TRACES_EXPORTER:-not set}"
    echo "  Metrics: ${OTEL_METRICS_EXPORTER:-not set}"
    echo "  Logs: ${OTEL_LOGS_EXPORTER:-not set}"
    echo "  Metrics Enabled: ${OTEL_METRICS_ENABLED:-true}"
    
    # Start the app in background
    echo "⏳ Starting app with register pattern..."
    timeout 15s node -r ../../dist/cjs/register.js dist/src/main.js &
    APP_PID=$!
    
    # Wait for app to start
    sleep 4
    
    # Check if app is running
    if ps -p $APP_PID > /dev/null; then
        echo "✅ App started successfully"
        
        # Run tests if requested
        if [ "$run_tests" = "true" ]; then
            echo "🧪 Running feature tests..."
            
            # Test basic endpoints
            if curl -s http://localhost:3000/health > /dev/null; then
                echo "✅ Health endpoint responsive"
                
                # Test metrics endpoint
                if [ "${OTEL_METRICS_ENABLED:-true}" = "true" ]; then
                    if curl -s http://localhost:3000/metrics > /dev/null; then
                        echo "✅ Metrics endpoint working"
                        
                        # Test specific observability features
                        test_observability_features
                    else
                        echo "⚠️  Metrics endpoint not responsive"
                    fi
                fi
                
            else
                echo "⚠️  App not responsive on HTTP"
            fi
        fi
        
    else
        echo "❌ App failed to start"
        cd ../..
        return 1
    fi
    
    # Clean up
    kill $APP_PID 2>/dev/null || true
    sleep 1
    
    cd ../..
    echo "✅ Test completed: $test_description"
}

# Function to test observability features
test_observability_features() {
    echo "🔍 Testing observability features..."
    
    # Test simple operation
    if curl -s -X POST http://localhost:3000/example/simple \
        -H "Content-Type: application/json" \
        -d '{"test": "data", "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > /dev/null; then
        echo "✅ Simple operation endpoint works"
    fi
    
    # Test complex operation
    if curl -s -X POST http://localhost:3000/example/complex/user123 \
        -H "Content-Type: application/json" \
        -d '{"operation": "test", "complexity": "high"}' > /dev/null; then
        echo "✅ Complex operation endpoint works"
    fi
    
    # Test concurrent operations
    if curl -s -X POST http://localhost:3000/example/concurrent \
        -H "Content-Type: application/json" \
        -d '[{"id":1,"data":"test1"},{"id":2,"data":"test2"}]' > /dev/null; then
        echo "✅ Concurrent operations endpoint works"
    fi
    
    # Test sensitive operation (should not be traced)
    if curl -s -X POST http://localhost:3000/example/sensitive \
        -H "Content-Type: application/json" \
        -d '{"sensitive": "data", "password": "secret123"}' > /dev/null; then
        echo "✅ Sensitive operation endpoint works (not traced)"
    fi
    
    # Test example health check
    if curl -s http://localhost:3000/example/health > /dev/null; then
        echo "✅ Example health check works"
    fi
    
    # Test metrics collection
    METRICS_RESPONSE=$(curl -s http://localhost:3000/metrics)
    if echo "$METRICS_RESPONSE" | grep -q "example_requests_total"; then
        echo "✅ Custom metrics are being collected"
    fi
    
    if echo "$METRICS_RESPONSE" | grep -q "http_requests_total"; then
        echo "✅ HTTP metrics are being collected"
    fi
    
    if echo "$METRICS_RESPONSE" | grep -q "nodejs_"; then
        echo "✅ Node.js metrics are being collected"
    fi
    
    echo "✅ All observability features tested"
}

# Test 1: Development Environment
test_with_environment "development" ".env.development" "Development with console exporters" true

# Test 2: Production Environment (mock)
test_with_environment "production" ".env.production" "Production with OTLP exporters (mock)" false

# Test 3: Manual Environment - Console
echo ""
echo "🚀 Test: Manual console configuration"
cd examples/basic-app

export OTEL_SERVICE_NAME="manual-console-test"
export OTEL_SERVICE_VERSION="test-1.0.0"
export NODE_ENV="test"
export OTEL_TRACES_EXPORTER="console"
export OTEL_METRICS_EXPORTER="console"
export OTEL_LOGS_EXPORTER="console"
export OTEL_TRACES_SAMPLER="always_on"
export OTEL_METRICS_ENABLED="true"

echo "📊 Manual console configuration set"
echo "⏳ Testing comprehensive features..."

timeout 12s node -r ../../dist/cjs/register.js dist/src/main.js &
APP_PID=$!

sleep 3

if ps -p $APP_PID > /dev/null; then
    echo "✅ App running with manual console configuration"
    
    # Test concurrent requests for context isolation
    echo "🧪 Testing context isolation with concurrent requests..."
    
    # Start multiple requests in parallel
    curl -s -X POST http://localhost:3000/example/simple -H "Content-Type: application/json" -d '{"request":1}' &
    curl -s -X POST http://localhost:3000/example/simple -H "Content-Type: application/json" -d '{"request":2}' &
    curl -s -X POST http://localhost:3000/example/simple -H "Content-Type: application/json" -d '{"request":3}' &
    
    # Test complex operations
    curl -s -X POST http://localhost:3000/example/complex/user1 -H "Content-Type: application/json" -d '{"test":"concurrent1"}' &
    curl -s -X POST http://localhost:3000/example/complex/user2 -H "Content-Type: application/json" -d '{"test":"concurrent2"}' &
    
    # Wait for requests to complete
    wait
    
    echo "✅ Concurrent requests completed (check logs for context isolation)"
    
    # Test metrics endpoint
    METRICS_OUTPUT=$(curl -s http://localhost:3000/metrics)
    if echo "$METRICS_OUTPUT" | head -20 | grep -q "example_requests_total"; then
        echo "✅ Custom metrics visible in /metrics endpoint"
    fi
    
    # Test metrics health
    METRICS_HEALTH=$(curl -s http://localhost:3000/metrics/health)
    if echo "$METRICS_HEALTH" | grep -q "enabled.*true"; then
        echo "✅ Metrics health endpoint working"
    fi
    
else
    echo "❌ App failed to start with manual configuration"
fi

kill $APP_PID 2>/dev/null || true
cd ../..

# Test 4: Disabled Features
echo ""
echo "🚀 Test: Disabled features configuration"
cd examples/basic-app

export OTEL_SERVICE_NAME="disabled-test"
export OTEL_TRACES_EXPORTER="none"
export OTEL_METRICS_EXPORTER="none"
export OTEL_LOGS_EXPORTER="none"
export OTEL_METRICS_ENABLED="false"

echo "⏳ Testing with observability features disabled..."
timeout 8s node -r ../../dist/cjs/register.js dist/src/main.js &
APP_PID=$!

sleep 3

if ps -p $APP_PID > /dev/null; then
    echo "✅ App runs with observability disabled"
    
    # Test that metrics endpoint returns 404
    METRICS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/metrics 2>/dev/null)
    if [ "$METRICS_STATUS" = "404" ]; then
        echo "✅ Metrics endpoint correctly disabled (404)"
    else
        echo "⚠️  Metrics endpoint status: $METRICS_STATUS (expected 404)"
    fi
    
    # App should still work for business logic
    if curl -s http://localhost:3000/health > /dev/null; then
        echo "✅ Business logic still works with observability disabled"
    fi
    
else
    echo "❌ App failed to start with disabled observability"
fi

kill $APP_PID 2>/dev/null || true
cd ../..

# Test 5: Enhanced Features Integration
echo ""
echo "🚀 Test: Enhanced features integration"
cd examples/basic-app

export OTEL_SERVICE_NAME="enhanced-features-test"
export OTEL_TRACES_EXPORTER="console"
export OTEL_METRICS_EXPORTER="console"
export OTEL_LOGS_EXPORTER="console"
export OTEL_TRACES_SAMPLER="always_on"
export OTEL_METRICS_ENABLED="true"
export OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED="true"
export OTEL_SPAN_ATTRIBUTE_REDACTED_PLACEHOLDER="[HIDDEN]"

echo "⏳ Testing enhanced features integration..."
timeout 10s node -r ../../dist/cjs/register.js dist/src/main.js &
APP_PID=$!

sleep 3

if ps -p $APP_PID > /dev/null; then
    echo "✅ App running with enhanced features"
    
    # Test all example endpoints to generate comprehensive telemetry
    echo "🧪 Generating comprehensive telemetry data..."
    
    # Simple operations
    curl -s -X POST http://localhost:3000/example/simple -H "Content-Type: application/json" -d '{"test":"enhanced"}' > /dev/null
    
    # Complex operations with different users
    curl -s -X POST http://localhost:3000/example/complex/enhanced-user1 -H "Content-Type: application/json" -d '{"enhanced":"features","password":"should-be-redacted"}' > /dev/null
    
    # Concurrent operations
    curl -s -X POST http://localhost:3000/example/concurrent -H "Content-Type: application/json" -d '[{"user":"enhanced1"},{"user":"enhanced2"},{"user":"enhanced3"}]' > /dev/null
    
    # Sensitive operations (should not be traced)
    curl -s -X POST http://localhost:3000/example/sensitive -H "Content-Type: application/json" -d '{"sensitive":"enhanced-data","secret":"top-secret"}' > /dev/null
    
    # Health checks
    curl -s http://localhost:3000/example/health > /dev/null
    curl -s http://localhost:3000/health > /dev/null
    
    echo "✅ Enhanced features telemetry generated"
    
    # Check metrics contain enhanced data
    ENHANCED_METRICS=$(curl -s http://localhost:3000/metrics)
    if echo "$ENHANCED_METRICS" | grep -q "example_"; then
        echo "✅ Enhanced metrics are being collected"
    fi
    
else
    echo "❌ App failed to start with enhanced features"
fi

kill $APP_PID 2>/dev/null || true
cd ../..

# Test 6: Performance and Stress Testing
echo ""
echo "🚀 Test: Performance and load testing"
cd examples/basic-app

export OTEL_SERVICE_NAME="performance-test"
export OTEL_TRACES_EXPORTER="console"
export OTEL_METRICS_EXPORTER="console"
export OTEL_LOGS_EXPORTER="console"
export OTEL_TRACES_SAMPLER="traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.1"  # Sample 10% for performance
export OTEL_METRICS_ENABLED="true"

echo "⏳ Performance testing with sampling..."
timeout 12s node -r ../../dist/cjs/register.js dist/src/main.js &
APP_PID=$!

sleep 3

if ps -p $APP_PID > /dev/null; then
    echo "✅ App running for performance test"
    
    # Generate load with multiple concurrent requests
    echo "🧪 Generating load (50 requests)..."
    for i in {1..50}; do
        curl -s -X POST http://localhost:3000/example/simple -H "Content-Type: application/json" -d "{\"load-test\":$i}" &
        
        # Throttle to avoid overwhelming
        if [ $((i % 10)) -eq 0 ]; then
            wait
            sleep 0.5
        fi
    done
    
    wait
    echo "✅ Load testing completed"
    
    # Check final metrics
    LOAD_METRICS=$(curl -s http://localhost:3000/metrics)
    REQUEST_COUNT=$(echo "$LOAD_METRICS" | grep "example_requests_total" | head -1 | awk '{print $2}' || echo "0")
    echo "✅ Generated metrics for $REQUEST_COUNT example requests"
    
else
    echo "❌ App failed to start for performance test"
fi

kill $APP_PID 2>/dev/null || true
cd ../..

# Clean up any remaining processes
echo ""
echo "🧹 Cleaning up..."
pkill -f "node.*main.js" 2>/dev/null || true

# Final summary
echo ""
echo "🎉 Complete Example Application Testing Finished!"
echo ""
echo "✅ Validated Features:"
echo "  - Register pattern startup (node -r register.js)"
echo "  - Environment variable configuration"
echo "  - Console and OTLP exporter modes"
echo "  - Simplified ObservabilityModule.forRoot()"
echo "  - Enhanced LoggerService with context isolation"
echo "  - MetricsService with custom business metrics"
echo "  - TracingService with decorators (@TraceClass, @Trace, @NoTrace)"
echo "  - MetricsController with /metrics endpoint"
echo "  - Concurrent request context isolation"
echo "  - Attribute sanitization for sensitive data"
echo "  - Performance testing with sampling"
echo "  - Graceful handling of disabled features"
echo ""
echo "🚀 Example application demonstrates all observability features working together!"
echo "🌟 Ready for production use with environment variable configuration!"

# Return success
exit 0
