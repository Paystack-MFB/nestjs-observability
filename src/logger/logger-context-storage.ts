/**
 * Logger Context Storage
 *
 * Uses Node.js AsyncLocalStorage to maintain request-scoped logger context
 * across async boundaries. This is separate from OpenTelemetry's context,
 * which handles trace/span IDs but doesn't propagate custom application data
 * through Express/Fastify middleware chains reliably.
 *
 * AsyncLocalStorage guarantees that context set in middleware is available
 * in all downstream handlers and async operations within the same request.
 */

import { AsyncLocalStorage } from 'async_hooks';

/**
 * The logger context map stored in AsyncLocalStorage
 * Key: string (context key like 'userId', 'requestId', etc.)
 * Value: any (context value)
 */
export type LoggerContextMap = Map<string, unknown>;

/**
 * AsyncLocalStorage instance for logger context
 * Each async execution context (request) gets its own isolated context map
 */
const loggerContextStorage = new AsyncLocalStorage<LoggerContextMap>();

/**
 * Get the current logger context map
 * Returns the context Map if one is active, undefined otherwise
 */
export function getLoggerContext(): LoggerContextMap | undefined {
  return loggerContextStorage.getStore();
}

/**
 * Set a value in the current logger context
 * @param key - Context key
 * @param value - Context value
 * @returns true if context was available, false if no active context
 */
export function setLoggerContextValue(key: string, value: unknown): boolean {
  const context = loggerContextStorage.getStore();
  if (!context) {
    return false;
  }
  context.set(key, value);
  return true;
}

/**
 * Get a value from the current logger context
 * @param key - Context key
 * @returns Context value if available, undefined otherwise
 */
export function getLoggerContextValue(key: string): unknown {
  const context = loggerContextStorage.getStore();
  if (!context) {
    return undefined;
  }
  return context.get(key);
}

/**
 * Check if logger context is currently active
 */
export function isLoggerContextAvailable(): boolean {
  return loggerContextStorage.getStore() !== undefined;
}

/**
 * Run a function within a new logger context scope
 * Creates a new context map and ensures it's available throughout
 * the function execution and all async operations within it
 *
 * @param fn - Function to execute within the context
 * @returns Result of the function
 *
 * @example
 * ```typescript
 * const result = await runWithLoggerContext(async () => {
 *   setLoggerContextValue('userId', user.id);
 *   // All async operations here have access to the context
 *   return await fetchUserData();
 * });
 * ```
 */
export function runWithLoggerContext<T>(fn: () => T | Promise<T>): T | Promise<T> {
  const contextMap = new Map<string, unknown>();
  return loggerContextStorage.run(contextMap, fn);
}

/**
 * Initialize logger context for a request
 * This should be called in middleware to create a fresh context
 * for the request and execute the rest of the middleware chain within it
 *
 * @param fn - Function to execute within the context (usually next())
 */
export function initializeRequestLoggerContext(fn: () => void): void {
  const contextMap = new Map<string, unknown>();
  loggerContextStorage.run(contextMap, fn);
}

/**
 * Run a function with a specific logger context map
 * This enables child logger isolation by running with a dedicated context map
 * The provided map becomes the active context for the duration of the function call
 * and all async operations within it
 *
 * @param contextMap - The specific context map to use
 * @param fn - Function to execute with this context
 * @returns Result of the function
 *
 * @example
 * ```typescript
 * const childMap = new Map(parentMap);
 * const result = await runWithSpecificLoggerContext(childMap, async () => {
 *   setLoggerContextValue('userId', 'child-001');
 *   // All async operations use childMap, not parentMap
 *   return await someAsyncWork();
 * });
 * ```
 */
export function runWithSpecificLoggerContext<T>(
  contextMap: LoggerContextMap,
  fn: () => T | Promise<T>
): T | Promise<T> {
  return loggerContextStorage.run(contextMap, fn);
}
