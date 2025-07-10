#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Validate that the dual package build is working correctly
 */
function validateBuild() {
  console.log('🔍 Validating dual package build...');

  const distPath = path.join(__dirname, '..', 'dist');
  const cjsPath = path.join(distPath, 'cjs');
  const esmPath = path.join(distPath, 'esm');

  // Check that both directories exist
  if (!fs.existsSync(cjsPath)) {
    console.error('❌ CommonJS build directory not found');
    process.exit(1);
  }

  if (!fs.existsSync(esmPath)) {
    console.error('❌ ESM build directory not found');
    process.exit(1);
  }

  // Check main entry files
  const cjsIndex = path.join(cjsPath, 'index.js');
  const esmIndex = path.join(esmPath, 'index.js');
  const cjsTypes = path.join(cjsPath, 'index.d.ts');
  const esmTypes = path.join(esmPath, 'index.d.ts');

  if (!fs.existsSync(cjsIndex)) {
    console.error('❌ CommonJS index.js not found');
    process.exit(1);
  }

  if (!fs.existsSync(esmIndex)) {
    console.error('❌ ESM index.js not found');
    process.exit(1);
  }

  if (!fs.existsSync(cjsTypes)) {
    console.error('❌ CommonJS index.d.ts not found');
    process.exit(1);
  }

  if (!fs.existsSync(esmTypes)) {
    console.error('❌ ESM index.d.ts not found');
    process.exit(1);
  }

  // Validate CommonJS exports
  const cjsContent = fs.readFileSync(cjsIndex, 'utf8');
  if (!cjsContent.includes('exports.') && !cjsContent.includes('module.exports')) {
    console.error('❌ CommonJS build does not contain proper exports');
    process.exit(1);
  }

  // Validate ESM exports
  const esmContent = fs.readFileSync(esmIndex, 'utf8');
  if (!esmContent.includes('export ')) {
    console.error('❌ ESM build does not contain proper exports');
    process.exit(1);
  }

  // Check for proper ESM import extensions
  const esmImportsRegex = /from\s+['"](\.[^'"]*?)['"](?!\.[jt]s)/g;
  const invalidImports = [];
  let match;

  while ((match = esmImportsRegex.exec(esmContent)) !== null) {
    if (!match[1].endsWith('.js')) {
      invalidImports.push(match[1]);
    }
  }

  if (invalidImports.length > 0) {
    console.error('❌ ESM build contains invalid imports without .js extension:', invalidImports);
    process.exit(1);
  }

  // Check package.json exports
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (!packageJson.exports || !packageJson.exports['.']) {
    console.error('❌ package.json missing proper exports field');
    process.exit(1);
  }

  const exports = packageJson.exports['.'];
  if (!exports.require || !exports.import) {
    console.error('❌ package.json exports missing require/import conditions');
    process.exit(1);
  }

  // Check that export paths exist
  const requirePath = path.join(__dirname, '..', exports.require.default || exports.require);
  const importPath = path.join(__dirname, '..', exports.import.default || exports.import);

  if (!fs.existsSync(requirePath)) {
    console.error('❌ package.json require export path does not exist:', requirePath);
    process.exit(1);
  }

  if (!fs.existsSync(importPath)) {
    console.error('❌ package.json import export path does not exist:', importPath);
    process.exit(1);
  }

  console.log('✅ Dual package build validation passed!');
  console.log('📦 CommonJS build: dist/cjs/');
  console.log('📦 ESM build: dist/esm/');
  console.log('🎯 Export validation: package.json exports are correct');
}

validateBuild();
