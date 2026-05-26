export declare const LOGGER_CONTEXT_KEY: symbol;
export declare class LoggerService {
    private static readonly SEVERITY_MAP;
    private readonly otelLogger;
    private childContextMap?;
    constructor();
    private executeInContext;
    getContext(): Record<string, unknown>;
    isContextAvailable(): boolean;
    withContext<T>(fn: () => T | Promise<T>): T | Promise<T>;
    addContext(key: string, value: unknown): void;
    clearContext(): void;
    createChildLogger(): LoggerService;
    debug(message: string, data?: Record<string, unknown>): void;
    error(message: Error | string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    setContext(newContext: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    private emit;
    private sanitizeLogData;
    private sanitizeLogMessage;
}
//# sourceMappingURL=logger.service.d.ts.map