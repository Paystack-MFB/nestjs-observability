/**
 * Global Test Setup for OpenTelemetry NestJS Observability Package
 * 
 * This file is automatically run before all tests to ensure proper
 * OpenTelemetry isolation and mocking setup.
 */

import 'reflect-metadata';
import { vi, beforeEach, afterEach } from 'vitest';

// Global test environment variables
const TEST_ENV_VARS = {
  NODE_ENV: 'test',
  OTEL_SERVICE_NAME: 'test-service',
  OTEL_SERVICE_VERSION: '1.0.0-test',
  OTEL_TRACES_EXPORTER: 'console',
  OTEL_METRICS_EXPORTER: 'console',
  OTEL_LOGS_EXPORTER: 'console',
  OTEL_TRACES_SAMPLER: 'always_on',
  OTEL_METRICS_ENABLED: 'true',
  OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED: 'true',
  OTEL_SPAN_ATTRIBUTE_REDACTED_PLACEHOLDER: '[REDACTED]',
};

// Store original environment variables
const originalEnv: Record<string, string | undefined> = {};

// Global setup
beforeEach(() => {
  // Store and set test environment variables
  Object.entries(TEST_ENV_VARS).forEach(([key, value]) => {
    originalEnv[key] = process.env[key];
    process.env[key] = value;
  });

  // Ensure clean module state
  vi.clearAllMocks();
  
  // Reset any global OpenTelemetry state
  if (global.gc) {
    global.gc();
  }
});

// Global cleanup
afterEach(() => {
  // Restore original environment variables
  Object.entries(originalEnv).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
  
  // Clear all mocks
  vi.clearAllMocks();
  vi.resetAllMocks();
});

// Increase test timeout for integration tests
vi.setConfig({
  testTimeout: 10000,
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Suppress console output during tests unless explicitly enabled
if (process.env['TEST_VERBOSE'] !== 'true') {
  const originalConsole = { ...console };
  
  beforeEach(() => {
    // Only suppress debug and log, keep errors and warnings
    console.log = vi.fn();
    console.debug = vi.fn();
    console.info = vi.fn();
  });
  
  afterEach(() => {
    // Restore console
    Object.assign(console, originalConsole);
  });
}

// Export test utilities for convenience
export const testUtils = {
  /**
   * Set custom environment variables for a test
   */
  setTestEnv(env: Record<string, string>): void {
    Object.entries(env).forEach(([key, value]) => {
      process.env[key] = value;
    });
  },

  /**
   * Clear specific environment variables
   */
  clearTestEnv(keys: string[]): void {
    keys.forEach(key => {
      delete process.env[key];
    });
  },

  /**
   * Get current test environment
   */
  getTestEnv(): Record<string, string | undefined> {
    return { ...process.env };
  },

  /**
   * Wait for async operations to complete
   */
  async flushPromises(): Promise<void> {
    await new Promise(resolve => setImmediate(resolve));
  },

  /**
   * Create a timeout promise for testing async operations
   */
  timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Test timeout after ${ms}ms`)), ms);
    });
  },

  /**
   * Create a resolved promise with delay
   */
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};

// Export for use in tests
export * from './otel-mocks';
