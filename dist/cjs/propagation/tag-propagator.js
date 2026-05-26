"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagPropagator = void 0;
const logger_context_storage_1 = require("../logger/logger-context-storage");
class TagPropagator {
    inject(_context, carrier, setter) {
        const tag = (0, logger_context_storage_1.getLoggerContextValue)('tag');
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
exports.TagPropagator = TagPropagator;
//# sourceMappingURL=tag-propagator.js.map