# Build Configuration

This document explains the build configuration and packaging best practices implemented in the NestJS Observability Library.

## 📦 Dual Package Support

The library supports both **CommonJS** and **ESM** module formats to ensure compatibility across different Node.js environments and bundlers.

### Package Structure

```
dist/
├── cjs/                    # CommonJS build
│   ├── index.js           # Main entry point
│   ├── index.d.ts         # Type definitions
│   └── ...
├── esm/                    # ESM build
│   ├── index.js           # Main entry point
│   ├── index.d.ts         # Type definitions
│   └── ...
```

### Package.json Configuration

```json
{
  "type": "commonjs",
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/cjs/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/cjs/index.d.ts",
      "import": {
        "types": "./dist/esm/index.d.ts",
        "default": "./dist/esm/index.js"
      },
      "require": {
        "types": "./dist/cjs/index.d.ts",
        "default": "./dist/cjs/index.js"
      },
      "default": "./dist/cjs/index.js"
    }
  }
}
```

## 🛠️ Build Process

### TypeScript Configurations

1. **`tsconfig.json`** - Base configuration for development
2. **`tsconfig.build.json`** - Base build configuration
3. **`tsconfig.build.cjs.json`** - CommonJS build configuration
4. **`tsconfig.build.esm.json`** - ESM build configuration

### Build Scripts

```bash
# Build both formats
pnpm run build

# Build only CommonJS
pnpm run build:cjs

# Build only ESM
pnpm run build:esm

# Display build information
pnpm run build:info

# Validate build output
pnpm run validate-build
```

### Build Steps

1. **Clean**: Remove previous build artifacts
2. **Build CJS**: Compile TypeScript to CommonJS format
3. **Build ESM**: Compile TypeScript to ESM format
4. **Fix ESM Imports**: Add `.js` extensions to relative imports
5. **Validate**: Ensure both builds are correct

## 🔧 Scripts

### `scripts/fix-esm-imports.js`

Automatically adds `.js` extensions to relative imports in ESM builds, which is required for proper ESM module resolution.

### `scripts/validate-build.js`

Validates that both CommonJS and ESM builds are correct:

- Checks for required files
- Validates export formats
- Ensures proper import/export statements
- Verifies package.json exports configuration

### `scripts/build-info.js`

Displays comprehensive build information including:

- Package configuration
- Export mappings
- Build targets
- Usage examples

## 📚 Usage Examples

### CommonJS (Node.js)

```javascript
const { ObservabilityModule } = require('@paystackhq/nestjs-observability');
```

### ESM (Modern Node.js)

```javascript
import { ObservabilityModule } from '@paystackhq/nestjs-observability';
```

### TypeScript

```typescript
import { ObservabilityModule } from '@paystackhq/nestjs-observability';
```

## 🎯 Best Practices Implemented

### 1. **Conditional Exports**

- Uses `exports` field for modern module resolution
- Provides different entry points for CommonJS and ESM
- Includes proper type definitions for each format

### 2. **Build Validation**

- Automated validation ensures build integrity
- Checks for proper export formats
- Validates import/export statements

### 3. **Development Experience**

- Incremental builds with TypeScript project references
- Proper source maps for debugging
- Comprehensive error reporting

### 4. **Future-Proof Configuration**

- Ready for ESM migration when ecosystem fully supports it
- Maintains CommonJS compatibility for current NestJS ecosystem
- Follows Node.js dual package guidelines

## 🚀 Publishing

The build process is integrated with the publishing workflow:

```bash
# Build and publish
pnpm run release

# Pre-publish validation
pnpm run prepublishOnly
```

## 🔍 Troubleshooting

### Common Issues

1. **ESM Import Errors**

   - Ensure `.js` extensions are added to relative imports
   - Run `pnpm run fix-esm-imports` manually if needed

2. **Type Definition Issues**

   - Check that both CommonJS and ESM type definitions are generated
   - Verify `composite: true` is set in build configurations

3. **Build Validation Failures**
   - Run `pnpm run validate-build` to identify issues
   - Check that all required files exist in both build directories

### Debugging

```bash
# Check build information
pnpm run build:info

# Validate build output
pnpm run validate-build

# Clean and rebuild
pnpm run clean && pnpm run build
```

This dual package setup ensures maximum compatibility while following modern packaging best practices for 2025.
