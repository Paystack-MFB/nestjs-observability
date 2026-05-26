"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoggerContext = getLoggerContext;
exports.setLoggerContextValue = setLoggerContextValue;
exports.getLoggerContextValue = getLoggerContextValue;
exports.isLoggerContextAvailable = isLoggerContextAvailable;
exports.runWithLoggerContext = runWithLoggerContext;
exports.initializeRequestLoggerContext = initializeRequestLoggerContext;
exports.runWithSpecificLoggerContext = runWithSpecificLoggerContext;
const async_hooks_1 = require("async_hooks");
const loggerContextStorage = new async_hooks_1.AsyncLocalStorage();
function getLoggerContext() {
    return loggerContextStorage.getStore();
}
function setLoggerContextValue(key, value) {
    const context = loggerContextStorage.getStore();
    if (!context) {
        return false;
    }
    context.set(key, value);
    return true;
}
function getLoggerContextValue(key) {
    const context = loggerContextStorage.getStore();
    if (!context) {
        return undefined;
    }
    return context.get(key);
}
function isLoggerContextAvailable() {
    return loggerContextStorage.getStore() !== undefined;
}
function runWithLoggerContext(fn) {
    const contextMap = new Map();
    return loggerContextStorage.run(contextMap, fn);
}
function initializeRequestLoggerContext(fn) {
    const contextMap = new Map();
    loggerContextStorage.run(contextMap, fn);
}
function runWithSpecificLoggerContext(contextMap, fn) {
    return loggerContextStorage.run(contextMap, fn);
}
//# sourceMappingURL=logger-context-storage.js.map