import { Context, TextMapGetter, TextMapPropagator, TextMapSetter } from '@opentelemetry/api';
export declare class TagPropagator implements TextMapPropagator {
    inject(_context: Context, carrier: unknown, setter: TextMapSetter): void;
    extract(context: Context, _carrier: unknown, _getter: TextMapGetter): Context;
    fields(): string[];
}
//# sourceMappingURL=tag-propagator.d.ts.map