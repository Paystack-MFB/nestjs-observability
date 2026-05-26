export { getServiceAttributes, getServiceEnvironment, getServiceName, getServiceVersion, getHttpRequestLoggingEnabled, addIgnoredRoute, getIgnoredRoutes, isRouteIgnored, resetIgnoredRoutes, createLogProcessor, createMetricReader, createTraceExporter, createInstrumentations, createResource, createTextMapPropagator, createSDK, startSDK, initializeSDK, gracefulShutdown, getSDK, setSDK, NodeSDK, } from './sdk-core.js';
import { initializeSDK, setSDK, gracefulShutdown, getSDK } from './sdk-core.js';
function start() {
    try {
        const sdkInstance = initializeSDK();
        setSDK(sdkInstance);
        const candidate = sdkInstance;
        if (typeof candidate.start === 'function') {
            candidate.start();
        }
        process.on('SIGTERM', () => {
            void gracefulShutdown('SIGTERM');
        });
        process.on('SIGINT', () => {
            void gracefulShutdown('SIGINT');
        });
    }
    catch (error) {
        console.error('Failed to initialize OpenTelemetry SDK:', error);
        process.exit(1);
    }
}
start();
export { start };
export const sdk = getSDK();
//# sourceMappingURL=register.js.map