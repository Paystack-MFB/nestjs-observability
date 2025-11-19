/**
 * Package version for OpenTelemetry instrumentations and internal use
 *
 * This is read from package.json at runtime to ensure consistency with
 * the published version. Changesets will automatically update package.json
 * on version bumps, so this will always be in sync.
 */
export function getPackageVersion(): string {
  try {
    // Try to read version from package.json
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const packageJson = require('../package.json') as { version?: string };
    return packageJson.version ?? '1.0.0';
  } catch {
    // Fallback version if package.json is not available
    return '1.0.0';
  }
}

export const VERSION = getPackageVersion();
