#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Display build information and package configuration
 */
function displayBuildInfo() {
  console.log('📦 NestJS Observability Library - Build Information');
  console.log('═'.repeat(50));

  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  console.log(`📋 Package: ${packageJson.name}`);
  console.log(`📌 Version: ${packageJson.version}`);
  console.log(`📝 Description: ${packageJson.description}`);
  console.log('');

  console.log('🏗️  Build Configuration:');
  console.log(`   Type: ${packageJson.type || 'commonjs'}`);
  console.log(`   Main (CJS): ${packageJson.main}`);
  console.log(`   Module (ESM): ${packageJson.module}`);
  console.log(`   Types: ${packageJson.types}`);
  console.log('');

  console.log('📤 Exports:');
  const exports = packageJson.exports;
  if (exports && exports['.']) {
    console.log('   📦 Main Package (.)');
    const mainExports = exports['.'];
    console.log(`      Types: ${mainExports.types}`);
    if (mainExports.require) {
      console.log(`      Require: ${mainExports.require.default || mainExports.require}`);
      console.log(`      Require Types: ${mainExports.require.types || 'same as main types'}`);
    }
    if (mainExports.import) {
      console.log(`      Import: ${mainExports.import.default || mainExports.import}`);
      console.log(`      Import Types: ${mainExports.import.types || 'generated'}`);
    }
    console.log(`      Default: ${mainExports.default}`);
  }
  
  // Show register module exports
  if (exports && exports['./register']) {
    console.log('   🔧 Register Module (./register)');
    const registerExports = exports['./register'];
    console.log(`      Types: ${registerExports.types}`);
    if (registerExports.require) {
      console.log(`      Require: ${registerExports.require.default || registerExports.require}`);
      console.log(`      Require Types: ${registerExports.require.types || 'same as types'}`);
    }
    if (registerExports.import) {
      console.log(`      Import: ${registerExports.import.default || registerExports.import}`);
      console.log(`      Import Types: ${registerExports.import.types || 'generated'}`);
    }
    console.log(`      Default: ${registerExports.default}`);
  }
  
  // Show other exports
  Object.keys(exports).forEach(exportKey => {
    if (exportKey !== '.' && exportKey !== './register') {
      console.log(`   📄 ${exportKey}: ${exports[exportKey]}`);
    }
  });
  console.log('');

  console.log('🎯 Build Targets:');
  const cjsConfigPath = path.join(__dirname, '..', 'tsconfig.build.cjs.json');
  const esmConfigPath = path.join(__dirname, '..', 'tsconfig.build.esm.json');

  if (fs.existsSync(cjsConfigPath)) {
    const cjsConfig = JSON.parse(fs.readFileSync(cjsConfigPath, 'utf8'));
    console.log(`   CommonJS: ${cjsConfig.compilerOptions.module} → ${cjsConfig.compilerOptions.outDir}`);
  }

  if (fs.existsSync(esmConfigPath)) {
    const esmConfig = JSON.parse(fs.readFileSync(esmConfigPath, 'utf8'));
    console.log(`   ESM: ${esmConfig.compilerOptions.module} → ${esmConfig.compilerOptions.outDir}`);
  }
  console.log('');

  console.log('🔧 Build Scripts:');
  Object.entries(packageJson.scripts)
    .filter(([name]) => name.startsWith('build'))
    .forEach(([name, script]) => {
      console.log(`   ${name}: ${script}`);
    });
  console.log('');

  console.log('🚀 Usage Examples:');
  console.log('   # Build both formats');
  console.log('   pnpm run build');
  console.log('');
  console.log('   # Build only CommonJS');
  console.log('   pnpm run build:cjs');
  console.log('');
  console.log('   # Build only ESM');
  console.log('   pnpm run build:esm');
  console.log('');
  console.log('   # Validate build');
  console.log('   node scripts/validate-build.js');
  console.log('');

  console.log('📚 Import Examples:');
  console.log('   // Main Package - CommonJS');
  console.log('   const { ObservabilityModule } = require("@paystackhq/nestjs-observability");');
  console.log('');
  console.log('   // Main Package - ESM');
  console.log('   import { ObservabilityModule } from "@paystackhq/nestjs-observability";');
  console.log('');
  console.log('   // Register Module - CommonJS');
  console.log('   require("@paystackhq/nestjs-observability/register");');
  console.log('');
  console.log('   // Register Module - ESM');
  console.log('   import "@paystackhq/nestjs-observability/register";');
  console.log('');
  console.log('   // Usage with Node.js register pattern');
  console.log('   node -r @paystackhq/nestjs-observability/register dist/main.js');
  console.log('');
}

displayBuildInfo();
