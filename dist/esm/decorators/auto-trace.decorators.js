import { SpanStatusCode, trace } from '@opentelemetry/api';
import 'reflect-metadata';
const TRACE_ALL_METHODS_KEY = 'trace:all-methods';
const TRACE_METHOD_KEY = 'trace:method';
const NO_TRACE_KEY = 'trace:no-trace';
const NO_TRACE_CLASS_KEY = 'trace:no-trace-class';
const NO_LOG_KEY = 'log:no-log';
const NO_LOG_CLASS_KEY = 'log:no-log-class';
const noTraceClasses = new Set();
export function getNoTraceClasses() {
    return noTraceClasses;
}
export function resetNoTraceClasses() {
    noTraceClasses.clear();
}
export function createTracedMethod(originalMethod, className, methodName, options) {
    const spanName = options?.spanName ?? `${className}.${methodName}`;
    return function (...args) {
        const tracer = trace.getTracer('auto-trace-decorators');
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
                        span.setStatus({ code: SpanStatusCode.OK });
                        return value;
                    })
                        .catch((error) => {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        span.setStatus({
                            code: SpanStatusCode.ERROR,
                            message: errorMessage,
                        });
                        span.recordException(error);
                        throw error;
                    })
                        .finally(() => {
                        span.end();
                    });
                }
                span.setStatus({ code: SpanStatusCode.OK });
                span.end();
                return result;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: errorMessage,
                });
                span.recordException(error);
                span.end();
                throw error;
            }
        });
    };
}
export function getTraceableMethodNames(prototype, options = {}) {
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
export function getTraceOptions(target, propertyKey) {
    return Reflect.getMetadata(TRACE_METHOD_KEY, target, propertyKey);
}
export function isNoTraceClassEnabled(target) {
    return Reflect.getMetadata(NO_TRACE_CLASS_KEY, target) === true;
}
export function isNoTraceEnabled(target, propertyKey) {
    return Reflect.getMetadata(NO_TRACE_KEY, target, propertyKey) === true;
}
export function isNoLogClassEnabled(target) {
    return Reflect.getMetadata(NO_LOG_CLASS_KEY, target) === true;
}
export function isNoLogEnabled(target, propertyKey) {
    return Reflect.getMetadata(NO_LOG_KEY, target, propertyKey) === true;
}
export function isTraceClassEnabled(target) {
    return Reflect.getMetadata(TRACE_ALL_METHODS_KEY, target) === true;
}
export function NoTrace() {
    return function (target, propertyKey, descriptor) {
        Reflect.defineMetadata(NO_TRACE_KEY, true, target, propertyKey);
        return descriptor;
    };
}
export function NoTraceClass() {
    return function (target) {
        Reflect.defineMetadata(NO_TRACE_CLASS_KEY, true, target);
        noTraceClasses.add(target);
        return target;
    };
}
export function NoLog() {
    return function (target, propertyKey, descriptor) {
        Reflect.defineMetadata(NO_LOG_KEY, true, target, propertyKey);
        return descriptor;
    };
}
export function NoLogClass() {
    return function (target) {
        Reflect.defineMetadata(NO_LOG_CLASS_KEY, true, target);
        return target;
    };
}
export function Trace(spanName) {
    return function (target, propertyKey, descriptor) {
        const options = {
            ...(spanName !== undefined && { spanName }),
        };
        Reflect.defineMetadata(TRACE_METHOD_KEY, options, target, propertyKey);
        return descriptor;
    };
}
export function TraceClass(options = {}) {
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