"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNoTraceClasses = getNoTraceClasses;
exports.resetNoTraceClasses = resetNoTraceClasses;
exports.createTracedMethod = createTracedMethod;
exports.getTraceableMethodNames = getTraceableMethodNames;
exports.getTraceOptions = getTraceOptions;
exports.isNoTraceClassEnabled = isNoTraceClassEnabled;
exports.isNoTraceEnabled = isNoTraceEnabled;
exports.isNoLogClassEnabled = isNoLogClassEnabled;
exports.isNoLogEnabled = isNoLogEnabled;
exports.isTraceClassEnabled = isTraceClassEnabled;
exports.NoTrace = NoTrace;
exports.NoTraceClass = NoTraceClass;
exports.NoLog = NoLog;
exports.NoLogClass = NoLogClass;
exports.Trace = Trace;
exports.TraceClass = TraceClass;
const api_1 = require("@opentelemetry/api");
require("reflect-metadata");
const TRACE_ALL_METHODS_KEY = 'trace:all-methods';
const TRACE_METHOD_KEY = 'trace:method';
const NO_TRACE_KEY = 'trace:no-trace';
const NO_TRACE_CLASS_KEY = 'trace:no-trace-class';
const NO_LOG_KEY = 'log:no-log';
const NO_LOG_CLASS_KEY = 'log:no-log-class';
const noTraceClasses = new Set();
function getNoTraceClasses() {
    return noTraceClasses;
}
function resetNoTraceClasses() {
    noTraceClasses.clear();
}
function createTracedMethod(originalMethod, className, methodName, options) {
    const spanName = options?.spanName ?? `${className}.${methodName}`;
    return function (...args) {
        const tracer = api_1.trace.getTracer('auto-trace-decorators');
        return tracer.startActiveSpan(spanName, (span) => {
            span.setAttributes({
                'class.name': className,
                'instrumentation.type': 'decorator',
                'method.name': methodName,
            });
            try {
                const result = originalMethod.apply(this, args);
                if (result && typeof result === 'object' && 'then' in result) {
                    return result
                        .then((value) => {
                        span.setStatus({ code: api_1.SpanStatusCode.OK });
                        return value;
                    })
                        .catch((error) => {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        span.setStatus({
                            code: api_1.SpanStatusCode.ERROR,
                            message: errorMessage,
                        });
                        span.recordException(error);
                        throw error;
                    })
                        .finally(() => {
                        span.end();
                    });
                }
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                span.end();
                return result;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: errorMessage,
                });
                span.recordException(error);
                span.end();
                throw error;
            }
        });
    };
}
function getTraceableMethodNames(prototype, options = {}) {
    const { excludePrivate = true } = options;
    return Object.getOwnPropertyNames(prototype)
        .filter((name) => name !== 'constructor')
        .filter((name) => typeof prototype[name] === 'function')
        .filter((name) => !isNoTraceEnabled(prototype, name))
        .filter((name) => {
        if (!excludePrivate)
            return true;
        return !name.startsWith('_') && !name.startsWith('#');
    })
        .filter((name) => {
        const excludedMethods = [
            'onModuleInit',
            'onModuleDestroy',
            'onApplicationBootstrap',
            'onApplicationShutdown',
            'onApplicationReady',
            'beforeApplicationShutdown',
            'setContext',
            'setLogLevel',
            'toString',
            'valueOf',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
            'toLocaleString',
        ];
        return !excludedMethods.includes(name);
    });
}
function getTraceOptions(target, propertyKey) {
    return Reflect.getMetadata(TRACE_METHOD_KEY, target, propertyKey);
}
function isNoTraceClassEnabled(target) {
    return Reflect.getMetadata(NO_TRACE_CLASS_KEY, target) === true;
}
function isNoTraceEnabled(target, propertyKey) {
    return Reflect.getMetadata(NO_TRACE_KEY, target, propertyKey) === true;
}
function isNoLogClassEnabled(target) {
    return Reflect.getMetadata(NO_LOG_CLASS_KEY, target) === true;
}
function isNoLogEnabled(target, propertyKey) {
    return Reflect.getMetadata(NO_LOG_KEY, target, propertyKey) === true;
}
function isTraceClassEnabled(target) {
    return Reflect.getMetadata(TRACE_ALL_METHODS_KEY, target) === true;
}
function NoTrace() {
    return function (target, propertyKey, descriptor) {
        Reflect.defineMetadata(NO_TRACE_KEY, true, target, propertyKey);
        return descriptor;
    };
}
function NoTraceClass() {
    return function (target) {
        Reflect.defineMetadata(NO_TRACE_CLASS_KEY, true, target);
        noTraceClasses.add(target);
        return target;
    };
}
function NoLog() {
    return function (target, propertyKey, descriptor) {
        Reflect.defineMetadata(NO_LOG_KEY, true, target, propertyKey);
        return descriptor;
    };
}
function NoLogClass() {
    return function (target) {
        Reflect.defineMetadata(NO_LOG_CLASS_KEY, true, target);
        return target;
    };
}
function Trace(spanName) {
    return function (target, propertyKey, descriptor) {
        const options = {
            ...(spanName !== undefined && { spanName }),
        };
        Reflect.defineMetadata(TRACE_METHOD_KEY, options, target, propertyKey);
        return descriptor;
    };
}
function TraceClass(options = {}) {
    return function (target) {
        Reflect.defineMetadata(TRACE_ALL_METHODS_KEY, true, target);
        const className = target.name;
        const prototype = target.prototype;
        const methodNames = getTraceableMethodNames(prototype, options);
        for (const methodName of methodNames) {
            const originalMethod = prototype[methodName];
            if (typeof originalMethod === 'function') {
                const traceOptions = getTraceOptions(prototype, methodName);
                const effectiveOptions = {};
                if (traceOptions?.spanName !== undefined) {
                    effectiveOptions.spanName = traceOptions.spanName;
                }
                else if (options.spanNamePrefix) {
                    effectiveOptions.spanName = `${options.spanNamePrefix}.${methodName}`;
                }
                const typedOriginalMethod = originalMethod;
                const tracedMethod = createTracedMethod(typedOriginalMethod, className, methodName, effectiveOptions);
                prototype[methodName] = tracedMethod;
            }
        }
        return target;
    };
}
//# sourceMappingURL=auto-trace.decorators.js.map