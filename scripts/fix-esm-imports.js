#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Fix ESM imports by adding .js extensions to relative imports
 * This is required for proper ESM resolution
 */
function fixEsmImports(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      fixEsmImports(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.d.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');

      // Fix relative imports - add .js extension
      content = content.replace(/from\s+['"](\.[^'"]*?)['"](?!\.[jt]s)/g, "from '$1.js'");

      // Fix relative imports in import() calls
      content = content.replace(/import\s*\(\s*['"](\.[^'"]*?)['"](?!\.[jt]s)/g, "import('$1.js'");

      // Fix export from statements
      content = content.replace(/export\s+.*?\s+from\s+['"](\.[^'"]*?)['"](?!\.[jt]s)/g, (match, relativePath) =>
        match.replace(relativePath, relativePath + '.js')
      );

      fs.writeFileSync(filePath, content);
    }
  }
}

const esmDir = path.join(__dirname, '..', 'dist', 'esm');
if (fs.existsSync(esmDir)) {
  console.log('🔧 Fixing ESM imports...');
  fixEsmImports(esmDir);
  console.log('✅ ESM imports fixed!');
} else {
  console.log('⚠️  ESM dist directory not found, skipping import fixes');
}
