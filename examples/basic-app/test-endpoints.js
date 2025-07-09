#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

const endpoints = [
  {
    method: 'GET',
    path: '/',
    description: 'Get hello message',
  },
  {
    method: 'GET',
    path: '/status',
    description: 'Get application status',
  },
  {
    method: 'GET',
    path: '/health',
    description: 'Health check endpoint',
  },
  {
    method: 'GET',
    path: '/complex',
    description: 'Complex operation endpoint',
  },
  {
    method: 'GET',
    path: '/users/1',
    description: 'Get user by ID',
  },
  {
    method: 'POST',
    path: '/users',
    description: 'Create new user',
    body: { name: 'Test User', email: 'test@example.com' },
  },
  {
    method: 'GET',
    path: '/users/1/profile',
    description: 'Get user profile',
  },
  {
    method: 'POST',
    path: '/users/validate',
    description: 'Validate user data',
    body: { email: 'test@example.com', name: 'Test User' },
  },
  {
    method: 'GET',
    path: '/users/1/advanced-profile',
    description: 'Get advanced user profile',
  },
  {
    method: 'POST',
    path: '/payments',
    description: 'Process payment',
    body: { amount: 100, currency: 'USD', customerId: '1', method: 'card' },
  },
  {
    method: 'GET',
    path: '/payments/pay_123/validate',
    description: 'Validate payment',
  },
  {
    method: 'GET',
    path: '/payments/pay_123/status',
    description: 'Get payment status',
  },
  {
    method: 'POST',
    path: '/payments/pay_123/refund',
    description: 'Refund payment',
  },
  {
    method: 'POST',
    path: '/payments/sensitive',
    description: 'Process sensitive payment data',
    body: { cardNumber: '1234567890123456', cvv: '123' },
  },
  {
    method: 'POST',
    path: '/logs/info',
    description: 'Log info message',
    body: { message: 'Test info message' },
  },
  {
    method: 'POST',
    path: '/logs/error',
    description: 'Log error message',
    body: { error: 'Test error message', context: 'test context' },
  },
  {
    method: 'POST',
    path: '/logs/debug',
    description: 'Log debug message',
    body: { message: 'Test debug message' },
  },
  {
    method: 'POST',
    path: '/logs/warning',
    description: 'Log warning message',
    body: { message: 'Test warning message' },
  },
  {
    method: 'POST',
    path: '/logs/activity',
    description: 'Log activity',
    body: { activity: 'User login', userId: '1' },
  },
  {
    method: 'GET',
    path: '/error-test',
    description: 'Test error handling',
  },
];

async function testEndpoint(endpoint) {
  const { method, path, description, body } = endpoint;
  const url = `${BASE_URL}${path}`;

  console.log(`\n🔍 Testing: ${method} ${path}`);
  console.log(`   Description: ${description}`);

  try {
    const config = {
      method: method.toLowerCase(),
      url,
      timeout: 5000,
    };

    if (body) {
      config.data = body;
      config.headers = { 'Content-Type': 'application/json' };
    }

    const response = await axios(config);
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📄 Response: ${JSON.stringify(response.data, null, 2)}`);

    return { success: true, status: response.status };
  } catch (error) {
    if (error.response) {
      console.log(`   ❌ Status: ${error.response.status}`);
      console.log(`   📄 Error: ${JSON.stringify(error.response.data, null, 2)}`);
      return { success: false, status: error.response.status };
    } else {
      console.log(`   💥 Network Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

async function runTests() {
  console.log('🚀 Starting endpoint tests...');
  console.log(`🌐 Base URL: ${BASE_URL}`);

  const results = [];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push({ endpoint, result });

    // Add delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('\n📊 Test Summary:');
  console.log('================');

  const successful = results.filter((r) => r.result.success).length;
  const failed = results.filter((r) => !r.result.success).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}`);

  if (failed > 0) {
    console.log('\n❌ Failed endpoints:');
    results
      .filter((r) => !r.result.success)
      .forEach(({ endpoint, result }) => {
        console.log(`   - ${endpoint.method} ${endpoint.path} (${result.status || 'Network Error'})`);
      });
  }

  console.log('\n🎉 Test completed!');
}

runTests().catch(console.error);
