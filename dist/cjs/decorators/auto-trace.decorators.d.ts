import { Type } from '@nestjs/common';
import 'reflect-metadata';
export declare function getNoTraceClasses(): ReadonlySet<Type>;
export declare function resetNoTraceClasses(): void;
export interface TraceClassOptions {
    excludePrivate?: boolean;
    spanNamePrefix?: string;
}
export interface TraceOptions {
    spanName?: string;
}
export declare function createTracedMethod(originalMethod: (...args: unknown[]) => unknown, className: string, methodName: string, options?: TraceOptions): (...args: unknown[]) => unknown;
export declare function getTraceableMethodNames(prototype: object, options?: TraceClassOptions): string[];
export declare function getTraceOptions(target: object, propertyKey: string): TraceOptions | undefined;
export declare function isNoTraceClassEnabled(target: Type): boolean;
export declare function isNoTraceEnabled(target: object, propertyKey: string): boolean;
export declare function isNoLogClassEnabled(target: Type): boolean;
export declare function isNoLogEnabled(target: object, propertyKey: string): boolean;
export declare function isTraceClassEnabled(target: Type): boolean;
export declare function NoTrace(): (target: object, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function NoTraceClass(): <T extends Type>(target: T) => T;
export declare function NoLog(): (target: object, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function NoLogClass(): <T extends Type>(target: T) => T;
export declare function Trace(spanName?: string): (target: object, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function TraceClass(options?: TraceClassOptions): <T extends Type>(target: T) => T;
//# sourceMappingURL=auto-trace.decorators.d.ts.map