import { Type } from '@nestjs/common';
import 'reflect-metadata';
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
export declare function TraceableClass(): (target: Type<any>) => Type<any>;
//# sourceMappingURL=traceable-class.decorator.d.ts.map