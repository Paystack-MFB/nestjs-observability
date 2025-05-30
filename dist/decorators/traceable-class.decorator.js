import 'reflect-metadata';
import { LoggerService } from '../logger/logger.service';
/**
 * Decorator to automatically inject a logger into a class
 * and set up the context name based on the class name
 *
 * Usage:
 * @Injectable()
 * @TraceableClass()
 * export class MyService {
 *   constructor(private readonly logger: LoggerService) {}
 *
 *   @Trace()
 *   async myMethod() { ... }
 * }
 */
export function TraceableClass() {
    return function (target) {
        // Ensure the class has a logger property
        const paramTypes = Reflect.getOwnMetadata('design:paramtypes', target);
        const hasLogger = paramTypes?.some((param) => param === LoggerService) ?? false;
        if (!hasLogger) {
            console.warn(`Class ${target.name} is decorated with @TraceableClass but doesn't have LoggerService injected. ` +
                `Make sure to inject LoggerService in the constructor.`);
        }
        return target;
    };
}
//# sourceMappingURL=traceable-class.decorator.js.map