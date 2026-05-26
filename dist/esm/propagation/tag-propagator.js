import { getLoggerContextValue } from '../logger/logger-context-storage.js';
export class TagPropagator {
    inject(_context, carrier, setter) {
        const tag = getLoggerContextValue('tag');
        if (tag && typeof tag === 'string') {
            setter.set(carrier, 'Tag', tag);
        }
    }
    extract(context, _carrier, _getter) {
        return context;
    }
    fields() {
        return ['Tag'];
    }
}
//# sourceMappingURL=tag-propagator.js.map