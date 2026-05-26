"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerContextMiddleware = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const logger_context_storage_1 = require("../logger/logger-context-storage");
let LoggerContextMiddleware = class LoggerContextMiddleware {
    use(_req, _res, next) {
        (0, logger_context_storage_1.initializeRequestLoggerContext)(() => {
            next();
        });
    }
};
exports.LoggerContextMiddleware = LoggerContextMiddleware;
exports.LoggerContextMiddleware = LoggerContextMiddleware = tslib_1.__decorate([
    (0, common_1.Injectable)()
], LoggerContextMiddleware);
//# sourceMappingURL=logger-context.middleware.js.map