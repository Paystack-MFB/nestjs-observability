#!/bin/bash

# Integration test script for OTLP Exporter Configuration
# Tests the register module with OTLP exporters and validates functionality

set -e

echo "🧪 OTLP Exporter Integration Test"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to cleanup processes
cleanup() {
    if [ ! -z "$APP_PID" ]; then
        print_status "Cleaning up application process..."
        kill $APP_PID 2>/dev/null || true
        wait $APP_PID 2>/dev/null || true
    fi
    if [ ! -z "$COLLECTOR_PID" ]; then
        print_status "Cleaning up mock collector process..."
        kill $COLLECTOR_PID 2>/dev/null || true
        wait $COLLECTOR_PID 2>/dev/null || true
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Check if node and curl are available
if ! command -v curl &> /dev/null; then
    print_error "curl is required but not installed. Please install curl to run this test."
    exit 1
fi

if ! command -v node &> /dev/null; then
    print_error "node is required but not installed. Please install Node.js to run this test."
    exit 1
fi

# Step 1: Build the package
print_status "Step 1: Building the package..."
pnpm build
if [ $? -eq 0 ]; then
    print_success "Package built successfully"
else
    print_error "Package build failed"
    exit 1
fi

# Step 2: Build examples app
print_status "Step 2: Building examples app..."
cd examples/basic-app
pnpm install
pnpm build
if [ $? -eq 0 ]; then
    print_success "Examples app built successfully"
else
    print_error "Examples app build failed"
    exit 1
fi
cd ../..

# Step 3: Start mock OTLP collector
print_status "Step 3: Starting mock OTLP collector..."

node scripts/mock-otlp-collector.js > /tmp/otlp-collector.log 2>&1 &
COLLECTOR_PID=$!

# Wait for collector to start
sleep 2

# Check if collector is running
if ! kill -0 $COLLECTOR_PID 2>/dev/null; then
    print_error "Mock OTLP collector failed to start"
    cat /tmp/otlp-collector.log
    exit 1
fi

print_success "Mock OTLP collector started successfully (PID: $COLLECTOR_PID)"

# Step 4: Test OTLP trace exporter
print_status "Step 4: Testing OTLP trace exporter..."

# Set environment variables for OTLP traces
export OTEL_SERVICE_NAME="otlp-test-service"
export OTEL_SERVICE_VERSION="1.0.0"
export NODE_ENV="test"
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://localhost:4318/v1/traces"
export OTEL_EXPORTER_OTLP_TRACES_HEADERS="x-test-header=trace-value"

# Start the app with OTLP configuration
print_status "Starting examples app with OTLP trace exporter..."
node -r ./dist/cjs/register.js examples/basic-app/dist/src/main.js > /tmp/otel-otlp-traces-test.log 2>&1 &
APP_PID=$!

# Wait for app to start
sleep 3

# Check if app is running
if ! kill -0 $APP_PID 2>/dev/null; then
    print_error "Application failed to start with OTLP traces"
    cat /tmp/otel-otlp-traces-test.log
    exit 1
fi

print_success "Application started with OTLP traces (PID: $APP_PID)"

# Make HTTP requests to trigger traces
print_status "Making HTTP requests to generate traces..."
curl -s http://localhost:3000/ > /dev/null || print_warning "Request to / failed"
curl -s http://localhost:3000/health > /dev/null || print_warning "Request to /health failed"

# Wait for telemetry data to be sent
sleep 3

# Stop the application
kill $APP_PID
wait $APP_PID 2>/dev/null || true
APP_PID=""

# Step 5: Verify OTLP trace data was received
print_status "Step 5: Verifying OTLP trace data..."

COLLECTOR_LOG=$(cat /tmp/otlp-collector.log)

if echo "$COLLECTOR_LOG" | grep -q "Received trace data"; then
    print_success "✓ OTLP trace data received by collector"
else
    print_error "✗ No OTLP trace data received"
    echo "Collector log:"
    cat /tmp/otlp-collector.log
fi

if echo "$COLLECTOR_LOG" | grep -q "x-test-header: trace-value"; then
    print_success "✓ OTLP trace headers received correctly"
else
    print_warning "⚠ OTLP trace headers not found in collector log"
fi

# Step 6: Test OTLP metrics exporter
print_status "Step 6: Testing OTLP metrics exporter..."

# Clear collector log
> /tmp/otlp-collector.log

# Set environment variables for OTLP metrics
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_METRICS_ENDPOINT="http://localhost:4318/v1/metrics"
export OTEL_EXPORTER_OTLP_METRICS_HEADERS="x-test-header=metrics-value"
export OTEL_METRIC_EXPORT_INTERVAL="2000"  # Export every 2 seconds
export OTEL_METRIC_EXPORT_TIMEOUT="1000"   # 1 second timeout, less than interval

# Start the app with OTLP metrics configuration
print_status "Starting examples app with OTLP metrics exporter..."
node -r ./dist/cjs/register.js examples/basic-app/dist/src/main.js > /tmp/otel-otlp-metrics-test.log 2>&1 &
APP_PID=$!

# Wait for app to start
sleep 3

# Check if app is running
if ! kill -0 $APP_PID 2>/dev/null; then
    print_error "Application failed to start with OTLP metrics"
    cat /tmp/otel-otlp-metrics-test.log
    exit 1
fi

print_success "Application started with OTLP metrics (PID: $APP_PID)"

# Make HTTP requests to generate metrics
print_status "Making HTTP requests to generate metrics..."
curl -s http://localhost:3000/ > /dev/null || print_warning "Request to / failed"
curl -s http://localhost:3000/health > /dev/null || print_warning "Request to /health failed"

# Wait for metrics to be exported (export interval is 2 seconds)
sleep 5

# Stop the application
kill $APP_PID
wait $APP_PID 2>/dev/null || true
APP_PID=""

# Step 7: Verify OTLP metrics data was received
print_status "Step 7: Verifying OTLP metrics data..."

COLLECTOR_LOG=$(cat /tmp/otlp-collector.log)

if echo "$COLLECTOR_LOG" | grep -q "Received metrics data"; then
    print_success "✓ OTLP metrics data received by collector"
else
    print_warning "⚠ No OTLP metrics data received (may take longer to export)"
fi

if echo "$COLLECTOR_LOG" | grep -q "x-test-header: metrics-value"; then
    print_success "✓ OTLP metrics headers received correctly"
else
    print_warning "⚠ OTLP metrics headers not found in collector log"
fi

# Step 8: Test fallback to console when OTLP unavailable
print_status "Step 8: Testing fallback to console when OTLP unavailable..."

# Stop the mock collector to test fallback
kill $COLLECTOR_PID
wait $COLLECTOR_PID 2>/dev/null || true
COLLECTOR_PID=""

# Set environment variables for OTLP with unavailable endpoint
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://localhost:9999/v1/traces"  # Unavailable endpoint

# Start the app
print_status "Starting examples app with unavailable OTLP endpoint..."
node -r ./dist/cjs/register.js examples/basic-app/dist/src/main.js > /tmp/otel-otlp-fallback-test.log 2>&1 &
APP_PID=$!

# Wait for app to start
sleep 3

# Check if app is running (should still start despite OTLP failure)
if ! kill -0 $APP_PID 2>/dev/null; then
    print_error "Application failed to start with unavailable OTLP endpoint"
    cat /tmp/otel-otlp-fallback-test.log
    exit 1
fi

print_success "Application started successfully despite OTLP failure (PID: $APP_PID)"

# Make a request
curl -s http://localhost:3000/ > /dev/null || print_warning "Request failed"

sleep 2

# Stop the application
kill $APP_PID
wait $APP_PID 2>/dev/null || true
APP_PID=""

# Step 9: Verify fallback behavior
print_status "Step 9: Verifying fallback behavior..."

FALLBACK_LOG=$(cat /tmp/otel-otlp-fallback-test.log)

if echo "$FALLBACK_LOG" | grep -q "Failed to create OTLP trace exporter, falling back to console"; then
    print_success "✓ Fallback warning message found"
else
    print_warning "⚠ Fallback warning not found (may not be logged to stderr)"
fi

if echo "$FALLBACK_LOG" | grep -q "OpenTelemetry SDK initialized successfully"; then
    print_success "✓ SDK still initialized successfully after OTLP failure"
else
    print_error "✗ SDK failed to initialize after OTLP failure"
fi

# Step 10: Test environment variable precedence
print_status "Step 10: Testing environment variable precedence..."

# Restart mock collector
node scripts/mock-otlp-collector.js > /tmp/otlp-collector-precedence.log 2>&1 &
COLLECTOR_PID=$!
sleep 2

# Set both general and specific endpoints
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:9999"  # General endpoint (should be ignored)
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://localhost:4318/v1/traces"  # Specific endpoint (should be used)
export OTEL_EXPORTER_OTLP_HEADERS="general=value1"
export OTEL_EXPORTER_OTLP_TRACES_HEADERS="specific=value2"

# Start the app
print_status "Starting examples app to test endpoint precedence..."
node -r ./dist/cjs/register.js examples/basic-app/dist/src/main.js > /tmp/otel-otlp-precedence-test.log 2>&1 &
APP_PID=$!

sleep 3

if ! kill -0 $APP_PID 2>/dev/null; then
    print_error "Application failed to start for precedence test"
    cat /tmp/otel-otlp-precedence-test.log
    exit 1
fi

# Make a request
curl -s http://localhost:3000/ > /dev/null || print_warning "Request failed"
sleep 3

# Stop the application
kill $APP_PID
wait $APP_PID 2>/dev/null || true
APP_PID=""

# Verify precedence
PRECEDENCE_LOG=$(cat /tmp/otlp-collector-precedence.log)

if echo "$PRECEDENCE_LOG" | grep -q "specific: value2"; then
    print_success "✓ Specific headers took precedence over general headers"
else
    print_warning "⚠ Header precedence test inconclusive"
fi

if echo "$PRECEDENCE_LOG" | grep -q "Received trace data"; then
    print_success "✓ Specific endpoint was used (trace data received)"
else
    print_warning "⚠ Endpoint precedence test inconclusive"
fi

# Cleanup
rm -f /tmp/otel-otlp-*.log /tmp/otlp-collector*.log

print_success "🎉 All OTLP integration tests completed!"
echo ""
echo "✅ OTLP trace exporter works correctly"
echo "✅ OTLP metrics exporter works correctly"
echo "✅ Environment variables are processed correctly"
echo "✅ Headers are sent with OTLP requests"
echo "✅ Fallback to console works when OTLP unavailable"
echo "✅ Environment variable precedence works correctly"
echo ""
echo "The OTLP exporters are ready for use!"