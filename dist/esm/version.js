export function getPackageVersion() {
    try {
        const packageJson = require('../package.json');
        return packageJson.version ?? '1.0.0';
    }
    catch {
        return '1.0.0';
    }
}
export const VERSION = getPackageVersion();
//# sourceMappingURL=version.js.map