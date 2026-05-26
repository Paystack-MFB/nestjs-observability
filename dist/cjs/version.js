"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = void 0;
exports.getPackageVersion = getPackageVersion;
function getPackageVersion() {
    try {
        const packageJson = require('../package.json');
        return packageJson.version ?? '1.0.0';
    }
    catch {
        return '1.0.0';
    }
}
exports.VERSION = getPackageVersion();
//# sourceMappingURL=version.js.map