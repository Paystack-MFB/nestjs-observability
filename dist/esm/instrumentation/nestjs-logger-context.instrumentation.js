import { InstrumentationBase, InstrumentationNodeModuleDefinition, } from '@opentelemetry/instrumentation';
import { diag } from '@opentelemetry/api';
import { VERSION } from '../version.js';
import { extractTag } from '../utils/tag-extractor.js';
import { initializeRequestLoggerContext, setLoggerContextValue } from '../logger/logger-context-storage.js';
export class NestJSLoggerContextInstrumentation extends InstrumentationBase {
    constructor(config) {
        super('@paystackhq/nestjs-logger-context', VERSION, config ?? {});
    }
    init() {
        return [
            new InstrumentationNodeModuleDefinition('@nestjs/core', ['>=9.0.0 <12.0.0'], (moduleExports) => {
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
                diag.warn('Could not get HTTP adapter instance, logger context middleware not injected');
                return;
            }
            const loggerContextMiddleware = (req, _res, next) => {
                this.initializeLoggerContext(req, next);
            };
            const instanceTyped = instance;
            if (typeof instanceTyped.use === 'function') {
                instanceTyped.use(loggerContextMiddleware);
                diag.debug('Injected logger context middleware into Express adapter');
            }
            else if (typeof instanceTyped.addHook === 'function') {
                instanceTyped.addHook('onRequest', (request, _reply) => {
                    return new Promise((resolve) => {
                        this.initializeLoggerContext(request, () => {
                            resolve();
                        });
                    });
                });
                diag.debug('Injected logger context middleware into Fastify adapter');
            }
            else {
                diag.warn('Unknown HTTP adapter type, logger context middleware not injected');
            }
        }
        catch (error) {
            diag.error('Failed to inject logger context middleware', error);
        }
    }
    initializeLoggerContext(req, next) {
        initializeRequestLoggerContext(() => {
            const headers = req?.headers;
            const tag = extractTag(headers);
            setLoggerContextValue('tag', tag);
            next();
        });
    }
}
//# sourceMappingURL=nestjs-logger-context.instrumentation.js.map