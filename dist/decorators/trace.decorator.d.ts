/**
 * Decorator to trace a method execution
 *
 * @param spanName Optional custom span name (defaults to method name)
 * @param options Additional options for the span
 * @returns Method decorator
 */
export declare function Trace(spanName?: string, options?: {
    captureArgs?: boolean;
    logError?: boolean;
    logStart?: boolean;
    logSuccess?: boolean;
}): (target: object, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=trace.decorator.d.ts.map