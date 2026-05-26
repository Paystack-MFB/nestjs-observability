import { Span } from '@opentelemetry/api';
export interface AttributeSanitizationConfig {
    additionalSensitivePatterns: RegExp[];
    customRedactedPlaceholder?: string;
}
export declare function addSensitivePatterns(patterns: RegExp[]): void;
export declare function addSpanAttribute(key: string, value: unknown): void;
export declare function addSpanAttributes(attributes: Record<string, unknown>): void;
export declare function addSpanAttributesUnsafe(attributes: Record<string, unknown>): void;
export declare function addSpanAttributeUnsafe(key: string, value: unknown): void;
export declare function addSpanEvent(name: string, attributes?: Record<string, unknown>): void;
export declare function configureAttributeSanitization(config: Partial<AttributeSanitizationConfig>): void;
export declare function getCurrentSpan(): Span | undefined;
export declare function getCurrentSpanId(): string | undefined;
export declare function getCurrentTraceId(): string | undefined;
export declare function getSanitizationConfig(): Readonly<AttributeSanitizationConfig>;
export declare function hasActiveSpan(): boolean;
export declare function isSensitiveKey(key: string): boolean;
export declare function recordSpanException(exception: Error): void;
export declare function setSpanStatus(status: 'ERROR' | 'OK', message?: string): void;
//# sourceMappingURL=span-attributes.d.ts.map