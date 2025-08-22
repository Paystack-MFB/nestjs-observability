#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Copy package.json to dist directory for proper module resolution
 */
function copyPackageJson() {
  console.log('📦 Copying package.json to dist directory...');

  const sourcePath = path.join(__dirname, '..', 'package.json');
  const targetPath = path.join(__dirname, '..', 'dist', 'package.json');
  const esmPackagePath = path.join(__dirname, '..', 'dist', 'esm', 'package.json');

  if (!fs.existsSync(sourcePath)) {
    console.error('❌ Source package.json not found');
    process.exit(1);
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

    // Remove scripts and devDependencies for the distributed package
    const { scripts, devDependencies, ...distPackageJson } = packageJson;

    // Ensure the dist directory exists
    const distDir = path.dirname(targetPath);
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    fs.writeFileSync(targetPath, JSON.stringify(distPackageJson, null, 2));
    console.log('✅ package.json copied to dist/');

    // Create ESM package.json for proper module resolution
    const esmDir = path.join(__dirname, '..', 'dist', 'esm');
    if (fs.existsSync(esmDir)) {
      const esmPackageJson = {
        type: 'module'
      };
      
      fs.writeFileSync(esmPackagePath, JSON.stringify(esmPackageJson, null, 2));
      console.log('✅ ESM package.json created in dist/esm/');
    }
  } catch (error) {
    console.error('❌ Failed to copy package.json:', error.message);
    process.exit(1);
  }
}

copyPackageJson();
