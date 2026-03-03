import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  addIgnoredRoute,
  getHttpRequestLoggingEnabled,
  getIgnoredRoutes,
  getServiceEnvironment,
  getServiceName,
  getServiceVersion,
  isRouteIgnored,
  resetIgnoredRoutes,
} from './sdk-core';

describe('sdk-core helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Create a fresh copy of process.env for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    resetIgnoredRoutes();
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

  describe('addIgnoredRoute', () => {
    it('should add a route with leading slash', () => {
      addIgnoredRoute('/health');
      expect(getIgnoredRoutes().has('/health')).toBe(true);
    });

    it('should normalize a route without leading slash', () => {
      addIgnoredRoute('health');
      expect(getIgnoredRoutes().has('/health')).toBe(true);
      expect(getIgnoredRoutes().has('health')).toBe(false);
    });

    it('should strip trailing slash', () => {
      addIgnoredRoute('/health/');
      expect(getIgnoredRoutes().has('/health')).toBe(true);
      expect(getIgnoredRoutes().has('/health/')).toBe(false);
    });

    it('should reject root path "/" and warn', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
      addIgnoredRoute('/');
      expect(getIgnoredRoutes().size).toBe(0);
      expect(warnSpy).toHaveBeenCalledWith(
        'addIgnoredRoute: root path "/" rejected to avoid suppressing all HTTP traces'
      );
      warnSpy.mockRestore();
    });

    it('should reject empty string and warn', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
      addIgnoredRoute('');
      expect(getIgnoredRoutes().size).toBe(0);
      expect(warnSpy).toHaveBeenCalledWith(
        'addIgnoredRoute: root path "/" rejected to avoid suppressing all HTTP traces'
      );
      warnSpy.mockRestore();
    });

    it('should deduplicate identical routes', () => {
      addIgnoredRoute('/health');
      addIgnoredRoute('/health');
      expect(getIgnoredRoutes().size).toBe(1);
    });

    it('should deduplicate routes that normalize to the same path', () => {
      addIgnoredRoute('health');
      addIgnoredRoute('/health');
      addIgnoredRoute('/health/');
      expect(getIgnoredRoutes().size).toBe(1);
      expect(getIgnoredRoutes().has('/health')).toBe(true);
    });

    it('should add multiple distinct routes', () => {
      addIgnoredRoute('/health');
      addIgnoredRoute('/readiness');
      expect(getIgnoredRoutes().size).toBe(2);
      expect(getIgnoredRoutes().has('/health')).toBe(true);
      expect(getIgnoredRoutes().has('/readiness')).toBe(true);
    });
  });

  describe('getIgnoredRoutes', () => {
    it('should return empty set when no routes are registered', () => {
      expect(getIgnoredRoutes().size).toBe(0);
    });

    it('should return a live view of the registry', () => {
      const routes = getIgnoredRoutes();
      expect(routes.size).toBe(0);

      addIgnoredRoute('/health');
      expect(routes.size).toBe(1);
      expect(routes.has('/health')).toBe(true);
    });
  });

  describe('resetIgnoredRoutes', () => {
    it('should clear all ignored routes', () => {
      addIgnoredRoute('/health');
      addIgnoredRoute('/readiness');
      expect(getIgnoredRoutes().size).toBe(2);

      resetIgnoredRoutes();
      expect(getIgnoredRoutes().size).toBe(0);
    });
  });

  describe('isRouteIgnored', () => {
    it('should return false when no routes are registered', () => {
      expect(isRouteIgnored('/health')).toBe(false);
    });

    it('should match exact route', () => {
      addIgnoredRoute('/health');
      expect(isRouteIgnored('/health')).toBe(true);
    });

    it('should match sub-paths', () => {
      addIgnoredRoute('/health');
      expect(isRouteIgnored('/health/deep')).toBe(true);
      expect(isRouteIgnored('/health/deep/nested')).toBe(true);
    });

    it('should match routes with query strings', () => {
      addIgnoredRoute('/health');
      expect(isRouteIgnored('/health?foo=bar')).toBe(true);
    });

    it('should not match routes that share a prefix but differ at path boundary', () => {
      addIgnoredRoute('/health');
      expect(isRouteIgnored('/healthcare')).toBe(false);
      expect(isRouteIgnored('/healthz')).toBe(false);
      expect(isRouteIgnored('/health-check')).toBe(false);
    });

    it('should not match unrelated routes', () => {
      addIgnoredRoute('/health');
      expect(isRouteIgnored('/api/users')).toBe(false);
      expect(isRouteIgnored('/')).toBe(false);
    });

    it('should reflect routes added after initial check', () => {
      expect(isRouteIgnored('/health')).toBe(false);
      addIgnoredRoute('/health');
      expect(isRouteIgnored('/health')).toBe(true);
    });
  });
});
