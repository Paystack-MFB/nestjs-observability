import { InstrumentationBase, InstrumentationNodeModuleDefinition, InstrumentationConfig } from '@opentelemetry/instrumentation';
export declare class NestJSLoggerContextInstrumentation extends InstrumentationBase {
    constructor(config?: InstrumentationConfig);
    protected init(): InstrumentationNodeModuleDefinition[];
    private patchNestFactory;
    private injectMiddleware;
    private initializeLoggerContext;
}
//# sourceMappingURL=nestjs-logger-context.instrumentation.d.ts.map