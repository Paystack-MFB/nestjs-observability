import { DynamicModule } from '@nestjs/common';
import { ObservabilityConfig } from './config/observability.config';
export declare class ObservabilityModule {
    static forRoot(config?: Partial<ObservabilityConfig>): DynamicModule;
    static forRootAsync(options: {
        useFactory: (...args: any[]) => ObservabilityConfig | Promise<ObservabilityConfig>;
        inject?: any[];
    }): DynamicModule;
    /**
     * Register the module with providers and controllers
     */
    private static registerModule;
}
//# sourceMappingURL=observability.module.d.ts.map