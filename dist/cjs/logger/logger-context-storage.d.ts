export type LoggerContextMap = Map<string, unknown>;
export declare function getLoggerContext(): LoggerContextMap | undefined;
export declare function setLoggerContextValue(key: string, value: unknown): boolean;
export declare function getLoggerContextValue(key: string): unknown;
export declare function isLoggerContextAvailable(): boolean;
export declare function runWithLoggerContext<T>(fn: () => T | Promise<T>): T | Promise<T>;
export declare function initializeRequestLoggerContext(fn: () => void): void;
export declare function runWithSpecificLoggerContext<T>(contextMap: LoggerContextMap, fn: () => T | Promise<T>): T | Promise<T>;
//# sourceMappingURL=logger-context-storage.d.ts.map