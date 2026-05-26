"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testUtils = void 0;
const tslib_1 = require("tslib");
require("reflect-metadata");
const vitest_1 = require("vitest");
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
(0, vitest_1.beforeEach)(() => {
    Object.entries(TEST_ENV_VARS).forEach(([key, value]) => {
        originalEnv[key] = process.env[key];
        process.env[key] = value;
    });
    process.setMaxListeners(50);
    vitest_1.vi.clearAllMocks();
    if (global.gc) {
        global.gc();
    }
});
(0, vitest_1.afterEach)(() => {
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
    vitest_1.vi.clearAllMocks();
    vitest_1.vi.resetAllMocks();
});
vitest_1.vi.setConfig({
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
    (0, vitest_1.beforeEach)(() => {
        console.log = vitest_1.vi.fn();
        console.debug = vitest_1.vi.fn();
        console.info = vitest_1.vi.fn();
    });
    (0, vitest_1.afterEach)(() => {
        Object.assign(console, originalConsole);
    });
}
exports.testUtils = {
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
tslib_1.__exportStar(require("./otel-mocks"), exports);
//# sourceMappingURL=test-setup.js.map