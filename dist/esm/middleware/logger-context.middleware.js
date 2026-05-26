import { __decorate } from "tslib";
import { Injectable } from '@nestjs/common';
import { initializeRequestLoggerContext } from '../logger/logger-context-storage.js';
let LoggerContextMiddleware = class LoggerContextMiddleware {
    use(_req, _res, next) {
        initializeRequestLoggerContext(() => {
            next();
        });
    }
};
LoggerContextMiddleware = __decorate([
    Injectable()
], LoggerContextMiddleware);
export { LoggerContextMiddleware };
//# sourceMappingURL=logger-context.middleware.js.map