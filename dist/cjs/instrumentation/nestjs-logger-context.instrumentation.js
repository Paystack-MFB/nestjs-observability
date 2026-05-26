"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestJSLoggerContextInstrumentation = void 0;
const instrumentation_1 = require("@opentelemetry/instrumentation");
const api_1 = require("@opentelemetry/api");
const version_1 = require("../version");
const tag_extractor_1 = require("../utils/tag-extractor");
const logger_context_storage_1 = require("../logger/logger-context-storage");
class NestJSLoggerContextInstrumentation extends instrumentation_1.InstrumentationBase {
    constructor(config) {
        super('@paystackhq/nestjs-logger-context', version_1.VERSION, config ?? {});
    }
    init() {
        return [
            new instrumentation_1.InstrumentationNodeModuleDefinition('@nestjs/core', ['>=9.0.0 <12.0.0'], (moduleExports) => {
                this.patchNestFactory(moduleExports);
                return moduleExports;
            }, () => {
            }),
        ];
    }
    patchNestFactory(moduleExports) {
        const originalCreate = moduleExports.NestFactory?.create;
        if (typeof originalCreate !== 'function') {
            return;
        }
        const self = this;
        const patchedCreate = function (...args) {
            const appPromise = originalCreate.apply(this, args);
            return Promise.resolve(appPromise).then((app) => {
                self.injectMiddleware(app);
                return app;
            });
        };
        moduleExports.NestFactory.create = patchedCreate;
    }
    injectMiddleware(app) {
        try {
            const httpAdapter = app.getHttpAdapter?.();
            const instance = httpAdapter?.getInstance?.();
            if (!instance) {
                api_1.diag.warn('Could not get HTTP adapter instance, logger context middleware not injected');
                return;
            }
            const loggerContextMiddleware = (req, _res, next) => {
                this.initializeLoggerContext(req, next);
            };
            const instanceTyped = instance;
            if (typeof instanceTyped.use === 'function') {
                instanceTyped.use(loggerContextMiddleware);
                api_1.diag.debug('Injected logger context middleware into Express adapter');
            }
            else if (typeof instanceTyped.addHook === 'function') {
                instanceTyped.addHook('onRequest', (request, _reply) => {
                    return new Promise((resolve) => {
                        this.initializeLoggerContext(request, () => {
                            resolve();
                        });
                    });
                });
                api_1.diag.debug('Injected logger context middleware into Fastify adapter');
            }
            else {
                api_1.diag.warn('Unknown HTTP adapter type, logger context middleware not injected');
            }
        }
        catch (error) {
            api_1.diag.error('Failed to inject logger context middleware', error);
        }
    }
    initializeLoggerContext(req, next) {
        (0, logger_context_storage_1.initializeRequestLoggerContext)(() => {
            const headers = req?.headers;
            const tag = (0, tag_extractor_1.extractTag)(headers);
            (0, logger_context_storage_1.setLoggerContextValue)('tag', tag);
            next();
        });
    }
}
exports.NestJSLoggerContextInstrumentation = NestJSLoggerContextInstrumentation;
//# sourceMappingURL=nestjs-logger-context.instrumentation.js.map