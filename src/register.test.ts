import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  getHttpRequestLoggingEnabled,
  getIgnoreIncomingRoutes,
  getServiceEnvironment,
  getServiceName,
  getServiceVersion,
} from './register';

describe('register helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Create a fresh copy of process.env for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getServiceName', () => {
    it('should return service name from OTEL_SERVICE_NAME', () => {
      process.env['OTEL_SERVICE_NAME'] = 'test-service';
      expect(getServiceName()).toBe('test-service');
    });

    it('should return unknown-service as default', () => {
      delete process.env['OTEL_SERVICE_NAME'];
      expect(getServiceName()).toBe('unknown-service');
    });
  });

  describe('getServiceVersion', () => {
    it('should return service version from OTEL_SERVICE_VERSION', () => {
      process.env['OTEL_SERVICE_VERSION'] = '2.0.0';
      expect(getServiceVersion()).toBe('2.0.0');
    });

    it('should return 1.0.0 as default', () => {
      delete process.env['OTEL_SERVICE_VERSION'];
      expect(getServiceVersion()).toBe('1.0.0');
    });
  });

  describe('getServiceEnvironment', () => {
    it('should return service environment from OTEL_SERVICE_ENV', () => {
      process.env['OTEL_SERVICE_ENV'] = 'production';
      expect(getServiceEnvironment()).toBe('production');
    });

    it('should return local as default', () => {
      delete process.env['OTEL_SERVICE_ENV'];
      expect(getServiceEnvironment()).toBe('local');
    });
  });

  describe('getHttpRequestLoggingEnabled', () => {
    it('should return true when OTEL_LOG_HTTP_REQUESTS is "true"', () => {
      process.env['OTEL_LOG_HTTP_REQUESTS'] = 'true';
      expect(getHttpRequestLoggingEnabled()).toBe(true);
    });

    it('should return true when OTEL_LOG_HTTP_REQUESTS is "1"', () => {
      process.env['OTEL_LOG_HTTP_REQUESTS'] = '1';
      expect(getHttpRequestLoggingEnabled()).toBe(true);
    });

    it('should return false when OTEL_LOG_HTTP_REQUESTS is "false"', () => {
      process.env['OTEL_LOG_HTTP_REQUESTS'] = 'false';
      expect(getHttpRequestLoggingEnabled()).toBe(false);
    });

    it('should return false when OTEL_LOG_HTTP_REQUESTS is "0"', () => {
      process.env['OTEL_LOG_HTTP_REQUESTS'] = '0';
      expect(getHttpRequestLoggingEnabled()).toBe(false);
    });

    it('should return false when OTEL_LOG_HTTP_REQUESTS is not set (default)', () => {
      delete process.env['OTEL_LOG_HTTP_REQUESTS'];
      expect(getHttpRequestLoggingEnabled()).toBe(false);
    });

    it('should return false for any other value', () => {
      process.env['OTEL_LOG_HTTP_REQUESTS'] = 'yes';
      expect(getHttpRequestLoggingEnabled()).toBe(false);
    });
  });

  describe('getIgnoreIncomingRoutes', () => {
    it('should return empty array when env var is not set', () => {
      delete process.env['OTEL_IGNORE_INCOMING_ROUTES'];
      expect(getIgnoreIncomingRoutes()).toEqual([]);
    });

    it('should return empty array when env var is empty string', () => {
      process.env['OTEL_IGNORE_INCOMING_ROUTES'] = '';
      expect(getIgnoreIncomingRoutes()).toEqual([]);
    });

    it('should parse a single route', () => {
      process.env['OTEL_IGNORE_INCOMING_ROUTES'] = '/health';
      expect(getIgnoreIncomingRoutes()).toEqual(['/health']);
    });

    it('should parse comma-separated routes', () => {
      process.env['OTEL_IGNORE_INCOMING_ROUTES'] = '/health,/readiness,/liveness';
      expect(getIgnoreIncomingRoutes()).toEqual(['/health', '/readiness', '/liveness']);
    });

    it('should trim whitespace from routes', () => {
      process.env['OTEL_IGNORE_INCOMING_ROUTES'] = ' /health , /readiness , /liveness ';
      expect(getIgnoreIncomingRoutes()).toEqual(['/health', '/readiness', '/liveness']);
    });

    it('should filter out empty strings from trailing commas', () => {
      process.env['OTEL_IGNORE_INCOMING_ROUTES'] = '/health,,/readiness,';
      expect(getIgnoreIncomingRoutes()).toEqual(['/health', '/readiness']);
    });
  });
});
