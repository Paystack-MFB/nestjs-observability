import { DynamicModule, OnApplicationBootstrap } from '@nestjs/common';
import { ApplicationConfig } from '@nestjs/core';
export declare class IgnoredRouteScanner implements OnApplicationBootstrap {
    private readonly applicationConfig?;
    constructor(applicationConfig?: ApplicationConfig | undefined);
    onApplicationBootstrap(): void;
    private resolveVersionSegments;
}
export declare class ObservabilityModule {
    static forRoot(): DynamicModule;
}
//# sourceMappingURL=observability.module.d.ts.map