import { Type } from '@nestjs/common';
import 'reflect-metadata';

/**
 * Check if a class is marked as traceable
 */
export function isTraceableClass(target: Type): boolean {
  return Reflect.getMetadata('traceable', target) === true;
}

/**
 * Simplified decorator to mark a class as traceable
 *
 * This decorator serves as a marker and can be used for future enhancements
 * like automatic logger injection or trace context setup.
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
  return function <T extends Type>(target: T): T {
    // Add metadata to mark this class as traceable
    Reflect.defineMetadata('traceable', true, target);

    return target;
  };
}
