"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sdk = exports.NodeSDK = exports.setSDK = exports.getSDK = exports.gracefulShutdown = exports.initializeSDK = exports.startSDK = exports.createSDK = exports.createTextMapPropagator = exports.createResource = exports.createInstrumentations = exports.createTraceExporter = exports.createMetricReader = exports.createLogProcessor = exports.resetIgnoredRoutes = exports.isRouteIgnored = exports.getIgnoredRoutes = exports.addIgnoredRoute = exports.getHttpRequestLoggingEnabled = exports.getServiceVersion = exports.getServiceName = exports.getServiceEnvironment = exports.getServiceAttributes = void 0;
exports.start = start;
var sdk_core_1 = require("./sdk-core");
Object.defineProperty(exports, "getServiceAttributes", { enumerable: true, get: function () { return sdk_core_1.getServiceAttributes; } });
Object.defineProperty(exports, "getServiceEnvironment", { enumerable: true, get: function () { return sdk_core_1.getServiceEnvironment; } });
Object.defineProperty(exports, "getServiceName", { enumerable: true, get: function () { return sdk_core_1.getServiceName; } });
Object.defineProperty(exports, "getServiceVersion", { enumerable: true, get: function () { return sdk_core_1.getServiceVersion; } });
Object.defineProperty(exports, "getHttpRequestLoggingEnabled", { enumerable: true, get: function () { return sdk_core_1.getHttpRequestLoggingEnabled; } });
Object.defineProperty(exports, "addIgnoredRoute", { enumerable: true, get: function () { return sdk_core_1.addIgnoredRoute; } });
Object.defineProperty(exports, "getIgnoredRoutes", { enumerable: true, get: function () { return sdk_core_1.getIgnoredRoutes; } });
Object.defineProperty(exports, "isRouteIgnored", { enumerable: true, get: function () { return sdk_core_1.isRouteIgnored; } });
Object.defineProperty(exports, "resetIgnoredRoutes", { enumerable: true, get: function () { return sdk_core_1.resetIgnoredRoutes; } });
Object.defineProperty(exports, "createLogProcessor", { enumerable: true, get: function () { return sdk_core_1.createLogProcessor; } });
Object.defineProperty(exports, "createMetricReader", { enumerable: true, get: function () { return sdk_core_1.createMetricReader; } });
Object.defineProperty(exports, "createTraceExporter", { enumerable: true, get: function () { return sdk_core_1.createTraceExporter; } });
Object.defineProperty(exports, "createInstrumentations", { enumerable: true, get: function () { return sdk_core_1.createInstrumentations; } });
Object.defineProperty(exports, "createResource", { enumerable: true, get: function () { return sdk_core_1.createResource; } });
Object.defineProperty(exports, "createTextMapPropagator", { enumerable: true, get: function () { return sdk_core_1.createTextMapPropagator; } });
Object.defineProperty(exports, "createSDK", { enumerable: true, get: function () { return sdk_core_1.createSDK; } });
Object.defineProperty(exports, "startSDK", { enumerable: true, get: function () { return sdk_core_1.startSDK; } });
Object.defineProperty(exports, "initializeSDK", { enumerable: true, get: function () { return sdk_core_1.initializeSDK; } });
Object.defineProperty(exports, "gracefulShutdown", { enumerable: true, get: function () { return sdk_core_1.gracefulShutdown; } });
Object.defineProperty(exports, "getSDK", { enumerable: true, get: function () { return sdk_core_1.getSDK; } });
Object.defineProperty(exports, "setSDK", { enumerable: true, get: function () { return sdk_core_1.setSDK; } });
Object.defineProperty(exports, "NodeSDK", { enumerable: true, get: function () { return sdk_core_1.NodeSDK; } });
const sdk_core_2 = require("./sdk-core");
function start() {
    try {
        const sdkInstance = (0, sdk_core_2.initializeSDK)();
        (0, sdk_core_2.setSDK)(sdkInstance);
        const candidate = sdkInstance;
        if (typeof candidate.start === 'function') {
            candidate.start();
        }
        process.on('SIGTERM', () => {
            void (0, sdk_core_2.gracefulShutdown)('SIGTERM');
        });
        process.on('SIGINT', () => {
            void (0, sdk_core_2.gracefulShutdown)('SIGINT');
        });
    }
    catch (error) {
        console.error('Failed to initialize OpenTelemetry SDK:', error);
        process.exit(1);
    }
}
start();
exports.sdk = (0, sdk_core_2.getSDK)();
//# sourceMappingURL=register.js.map