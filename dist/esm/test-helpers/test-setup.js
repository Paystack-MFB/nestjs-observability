import 'reflect-metadata';
import { afterEach, beforeEach, vi } from 'vitest';
const TEST_ENV_VARS = {
    NODE_ENV: 'test',
    OTEL_LOGS_EXPORTER: 'console',
    OTEL_METRICS_ENABLED: 'true',
    OTEL_METRICS_EXPORTER: 'console',
    OTEL_SERVICE_NAME: 'test-service',
    OTEL_SERVICE_VERSION: '1.0.0-test',
    OTEL_SPAN_ATTRIBUTE_REDACTED_PLACEHOLDER: '[REDACTED]',
    OTEL_SPAN_ATTRIBUTE_SANITIZATION_ENABLED: 'true',
    OTEL_TRACES_EXPORTER: 'console',
    OTEL_TRACES_SAMPLER: 'always_on',
};
const originalEnv = {};
beforeEach(() => {
    Object.entries(TEST_ENV_VARS).forEach(([key, value]) => {
        originalEnv[key] = process.env[key];
        process.env[key] = value;
    });
    process.setMaxListeners(50);
    vi.clearAllMocks();
    if (global.gc) {
        global.gc();
    }
});
afterEach(() => {
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    Object.entries(originalEnv).forEach(([key, value]) => {
        if (value === undefined) {
            Reflect.deleteProperty(process.env, key);
        }
        else {
            process.env[key] = value;
        }
    });
    vi.clearAllMocks();
    vi.resetAllMocks();
});
vi.setConfig({
    testTimeout: 10000,
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
if (process.env['TEST_VERBOSE'] !== 'true') {
    const originalConsole = { ...console };
    beforeEach(() => {
        console.log = vi.fn();
        console.debug = vi.fn();
        console.info = vi.fn();
    });
    afterEach(() => {
        Object.assign(console, originalConsole);
    });
}
export const testUtils = {
    clearTestEnv(keys) {
        keys.forEach((key) => {
            Reflect.deleteProperty(process.env, key);
        });
    },
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    },
    async flushPromises() {
        await new Promise((resolve) => setImmediate(resolve));
    },
    getTestEnv() {
        return { ...process.env };
    },
    setTestEnv(env) {
        Object.entries(env).forEach(([key, value]) => {
            process.env[key] = value;
        });
    },
    timeout(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Test timeout after ${ms.toString()}ms`));
            }, ms);
        });
    },
};
export * from './otel-mocks.js';
//# sourceMappingURL=test-setup.js.map