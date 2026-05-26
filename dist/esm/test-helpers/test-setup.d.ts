import 'reflect-metadata';
export declare const testUtils: {
    clearTestEnv(keys: string[]): void;
    delay(ms: number): Promise<void>;
    flushPromises(): Promise<void>;
    getTestEnv(): Record<string, string | undefined>;
    setTestEnv(env: Record<string, string>): void;
    timeout(ms: number): Promise<never>;
};
export * from './otel-mocks.js';
//# sourceMappingURL=test-setup.d.ts.map