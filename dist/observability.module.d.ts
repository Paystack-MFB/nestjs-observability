import { DynamicModule, Type } from '@nestjs/common';
import { ObservabilityConfig } from './config/observability.config';
export declare class ObservabilityModule {
    static forRoot(config?: Partial<ObservabilityConfig>): DynamicModule;
    static forRootAsync(options: {
        inject?: Type<unknown>[];
        useFactory: (...args: unknown[]) => ObservabilityConfig | Promise<ObservabilityConfig>;
    }): DynamicModule;
    /**
     * Register the module with providers and controllers
     */
    private static registerModule;
}
//# sourceMappingURL=observability.module.d.ts.map