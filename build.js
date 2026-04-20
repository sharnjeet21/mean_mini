/**
 * build.js — runs inside the frontend directory so Angular CLI
 * can find angular.json. Called by the root "build" npm script.
 */
const { execSync } = require('child_process');
const path = require('path');

const frontendDir = path.join(__dirname, 'frontend');

console.log('Installing frontend dependencies...');
execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });

console.log('Building Angular app...');
execSync('npx ng build --configuration production', {
  cwd: frontendDir,
  stdio: 'inherit',
});

console.log('Build complete.');
