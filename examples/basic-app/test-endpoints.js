#!/usr/bin/env node

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
async function makeRequest(method, url, data = null) {
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.text();
    console.log(`${method} ${url}`);
    console.log('Response:', result);
    console.log('---');
    return result;
  } catch (error) {
    console.error(`Error making request to ${url}:`, error);
    console.log('---');
  }
}

// Test all endpoints
async function testAllEndpoints() {
  console.log('🚀 Testing NestJS Observability Basic App Endpoints');
  console.log('='.repeat(60));

  // ==== BASIC ENDPOINTS ====
  console.log('\n📍 BASIC ENDPOINTS');
  await makeRequest('GET', `${BASE_URL}/`);
  await makeRequest('GET', `${BASE_URL}/status`);
  await makeRequest('GET', `${BASE_URL}/complex`);

  // ==== USER ENDPOINTS ====
  console.log('\n👤 USER ENDPOINTS');
  await makeRequest('POST', `${BASE_URL}/users`, {
    name: 'John Doe',
    email: 'john@example.com',
  });
  await makeRequest('GET', `${BASE_URL}/users/123`);
  await makeRequest('GET', `${BASE_URL}/users/123/profile`);
  await makeRequest('POST', `${BASE_URL}/users/validate`, {
    email: 'test@example.com',
    name: 'Test User',
  });
  await makeRequest('GET', `${BASE_URL}/users/123/advanced-profile`);

  // ==== PAYMENT ENDPOINTS ====
  console.log('\n💳 PAYMENT ENDPOINTS');
  await makeRequest('POST', `${BASE_URL}/payments`, {
    amount: 100,
    currency: 'USD',
    customerId: 'cust_123',
    method: 'credit_card',
  });
  await makeRequest('GET', `${BASE_URL}/payments/pay_123/validate`);
  await makeRequest('GET', `${BASE_URL}/payments/pay_123/status`);
  await makeRequest('POST', `${BASE_URL}/payments/pay_123/refund`);
  await makeRequest('POST', `${BASE_URL}/payments/sensitive`, {
    cardNumber: '4111111111111111',
    cvv: '123',
  });

  // ==== BASIC LOGGING ENDPOINTS ====
  console.log('\n📝 BASIC LOGGING ENDPOINTS');
  await makeRequest('POST', `${BASE_URL}/logs/info`, {
    message: 'This is an info log message',
  });
  await makeRequest('POST', `${BASE_URL}/logs/error`, {
    error: 'This is an error message',
    context: 'TestContext',
  });
  await makeRequest('POST', `${BASE_URL}/logs/debug`, {
    message: 'This is a debug message',
  });
  await makeRequest('POST', `${BASE_URL}/logs/warning`, {
    message: 'This is a warning message',
  });
  await makeRequest('POST', `${BASE_URL}/logs/activity`, {
    activity: 'User clicked button',
    userId: 'user-123',
  });

  // ==== ENHANCED LOGGING ENDPOINTS ====
  console.log('\n🔍 ENHANCED LOGGING ENDPOINTS');

  // User Action Logging
  await makeRequest('POST', `${BASE_URL}/logs/user-action`, {
    action: 'login',
    userId: 'user-456',
    metadata: {
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
      attempt: 1,
    },
  });

  // Performance Metrics
  await makeRequest('POST', `${BASE_URL}/logs/performance`, {
    operation: 'database_query',
    duration: 250,
  });

  // Business Event Logging
  await makeRequest('POST', `${BASE_URL}/logs/business-event`, {
    eventType: 'payment_processed',
    eventData: {
      amount: 99.99,
      currency: 'USD',
      customerId: 'cust_789',
      paymentMethod: 'credit_card',
      processingTime: 1500,
    },
  });

  // Security Event Logging
  await makeRequest('POST', `${BASE_URL}/logs/security-event`, {
    event: 'failed_login_attempt',
    userId: 'user-suspicious',
    ipAddress: '10.0.0.1',
  });

  // Exception Logging
  await makeRequest('POST', `${BASE_URL}/logs/exception`, {
    error: 'Database connection failed',
    context: {
      database: 'postgresql',
      host: 'localhost',
      port: 5432,
      connectionPool: 'main',
      retryAttempt: 3,
    },
  });

  // ==== CONTEXT MANAGEMENT DEMONSTRATIONS ====
  console.log('\n🔗 CONTEXT MANAGEMENT DEMONSTRATIONS');

  // Context Persistence Demo
  await makeRequest('GET', `${BASE_URL}/logs/demo/context-persistence`);

  // Context Updates Demo
  await makeRequest('GET', `${BASE_URL}/logs/demo/context-updates`);

  // Comprehensive Logging Demo
  await makeRequest('GET', `${BASE_URL}/logs/demo/comprehensive`);

  // ==== ERROR TESTING ====
  console.log('\n❌ ERROR TESTING');
  await makeRequest('GET', `${BASE_URL}/error-test`);

  console.log('\n✅ All endpoints tested!');
  console.log('\n📊 Check your logs to see the enhanced structured logging output!');
  console.log('\n💡 Tips:');
  console.log('  - Set NODE_ENV=production to see JSON structured logs');
  console.log('  - Set NODE_ENV=development to see pretty formatted logs');
  console.log('  - Check OpenTelemetry traces if tracing is enabled');
  console.log('  - Visit /metrics endpoint for Prometheus metrics');
}

// Run the tests
testAllEndpoints().catch(console.error);
