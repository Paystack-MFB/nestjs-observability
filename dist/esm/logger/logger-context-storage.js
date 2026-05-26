import { AsyncLocalStorage } from 'async_hooks';
const loggerContextStorage = new AsyncLocalStorage();
export function getLoggerContext() {
    return loggerContextStorage.getStore();
}
export function setLoggerContextValue(key, value) {
    const context = loggerContextStorage.getStore();
    if (!context) {
        return false;
    }
    context.set(key, value);
    return true;
}
export function getLoggerContextValue(key) {
    const context = loggerContextStorage.getStore();
    if (!context) {
        return undefined;
    }
    return context.get(key);
}
export function isLoggerContextAvailable() {
    return loggerContextStorage.getStore() !== undefined;
}
export function runWithLoggerContext(fn) {
    const contextMap = new Map();
    return loggerContextStorage.run(contextMap, fn);
}
export function initializeRequestLoggerContext(fn) {
    const contextMap = new Map();
    loggerContextStorage.run(contextMap, fn);
}
export function runWithSpecificLoggerContext(contextMap, fn) {
    return loggerContextStorage.run(contextMap, fn);
}
//# sourceMappingURL=logger-context-storage.js.map