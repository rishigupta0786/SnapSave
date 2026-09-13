const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, 'app', 'api');
const tempApiPath = path.join(__dirname, 'temp_api');
const oldTempApiPath = path.join(__dirname, 'app', '_api');

// Clean up any stray oldTempApiPath (_api) left from previous runs
if (fs.existsSync(oldTempApiPath)) {
  console.log('Cleaning up old _api directory...');
  try {
    fs.rmSync(oldTempApiPath, { recursive: true, force: true });
  } catch (e) {
    console.error('Failed to clean up _api:', e);
  }
}

let renamed = false;
let exitCode = 0;

try {
  if (fs.existsSync(apiPath)) {
    console.log('Temporarily moving api folder to avoid build:export errors...');
    fs.renameSync(apiPath, tempApiPath);
    renamed = true;
  } else if (fs.existsSync(tempApiPath)) {
    // Already moved in a previous interrupted run?
    renamed = true;
  }

  console.log('Running next build...');
  const buildResult = spawnSync('npx', ['next', 'build'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, MOBILE_BUILD: 'true' }
  });

  if (buildResult.status !== 0) {
    console.error('Next build failed.');
    exitCode = buildResult.status || 1;
  } else {
    console.log('Syncing Capacitor with android...');
    const syncResult = spawnSync('npx', ['cap', 'sync', 'android'], {
      stdio: 'inherit',
      shell: true
    });

    if (syncResult.status !== 0) {
      console.error('Capacitor sync failed.');
      exitCode = syncResult.status || 1;
    } else {
      console.log('Mobile build and sync completed successfully!');
    }
  }
} catch (err) {
  console.error('An error occurred during build:', err);
  exitCode = 1;
} finally {
  if (renamed && fs.existsSync(tempApiPath)) {
    console.log('Restoring api folder...');
    try {
      fs.renameSync(tempApiPath, apiPath);
    } catch (e) {
      console.error('Failed to restore api folder:', e);
    }
  }
  process.exit(exitCode);
}
