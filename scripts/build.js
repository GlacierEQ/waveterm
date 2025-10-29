#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { version } = require('../package.json');

// Environment setup
process.env.NODE_ENV = 'production';
process.env.GENERATE_SOURCEMAP = 'false';

// Clean previous builds
console.log('🚀 Starting WaveTerm build process...');
console.log('🧹 Cleaning previous builds...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
if (fs.existsSync('release')) {
  fs.rmSync('release', { recursive: true, force: true });
}

// Install dependencies if needed
console.log('📦 Installing dependencies...');
execSync('npm install --production=false', { stdio: 'inherit' });

// Build the app
console.log('🔨 Building application...');

try {
  // Build renderer process
  console.log('  Building renderer process...');
  execSync('vite build --mode production', { stdio: 'inherit' });

  // Build main process
  console.log('  Building main process...');
  execSync('tsc -p tsconfig.node.json', { stdio: 'inherit' });

  // Package the app
  console.log('📦 Packaging application...');
  const platform = process.platform === 'darwin' ? 'mac' : 
                  process.platform === 'win32' ? 'win' : 'linux';
  
  execSync(`npm run package:${platform}`, { stdio: 'inherit' });

  console.log(`\n✅ Build successful! Version: ${version}`);
  console.log(`📦 Output directory: ${path.resolve('release', version)}`);
  
} catch (error) {
  console.error('\n❌ Build failed:', error);
  process.exit(1);
}
