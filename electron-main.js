const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let logFilePath;

function logDebug(message) {
  if (!logFilePath) {
    try {
      logFilePath = path.join(app.getPath('userData'), 'electron-debug.log');
    } catch (err) {
      logFilePath = path.join(process.cwd(), 'electron-debug.log');
    }
  }
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(logFilePath, formattedMessage);
  } catch (err) {
    console.error('Failed to write to debug log:', err);
  }
}


// Global Exception Handlers
process.on('uncaughtException', (error) => {
  logDebug(`CRITICAL UNCAUGHT EXCEPTION: ${error.message}\nStack: ${error.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logDebug(`CRITICAL UNHANDLED REJECTION: ${reason}`);
});

let mainWindow;
let nextServerProcess;
const PORT = 3000;

function createMainWindow() {
  logDebug('createMainWindow: Starting browser window creation...');
  const iconPath = path.join(__dirname, 'public', 'favicon.ico');
  logDebug(`createMainWindow: Icon path: ${iconPath} (exists: ${fs.existsSync(iconPath)})`);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "MediaDownloader",
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Remove default menu bar
  logDebug('createMainWindow: Hiding menu bar...');
  mainWindow.setMenuBarVisibility(false);

  // Load Next.js app
  const targetUrl = `http://localhost:${PORT}`;
  logDebug(`createMainWindow: Loading URL: ${targetUrl}`);
  mainWindow.loadURL(targetUrl);

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    logDebug(`createMainWindow WebContents: Failed to load URL: ${validatedURL}, ErrorCode: ${errorCode}, Description: ${errorDescription}`);
  });

  mainWindow.webContents.on('crashed', (event, killed) => {
    logDebug(`createMainWindow WebContents: Main window crashed. Killed: ${killed}`);
  });

  mainWindow.on('closed', () => {
    logDebug('createMainWindow: Main window closed event triggered');
    mainWindow = null;
  });
}

// Function to check if the Next.js server is ready
let pingCount = 0;
function pingNextServer() {
  pingCount++;
  if (pingCount % 10 === 1) {
    logDebug(`pingNextServer: Pinging server on port ${PORT}... (Attempt #${pingCount})`);
  }
  const req = http.request({ host: 'localhost', port: PORT, method: 'GET', timeout: 2000 }, (res) => {
    logDebug(`pingNextServer: Received response for attempt #${pingCount}. Status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      logDebug('pingNextServer: Next.js server is ready. Launching main window...');
      createMainWindow();
    } else {
      setTimeout(pingNextServer, 200);
    }
  });

  req.on('error', (err) => {
    if (pingCount % 10 === 1) {
      logDebug(`pingNextServer: Ping attempt #${pingCount} failed: ${err.message}`);
    }
    setTimeout(pingNextServer, 200);
  });

  req.end();
}

app.whenReady().then(() => {
  const isPackaged = app.isPackaged;
  logDebug(`app.whenReady: App ready. isPackaged = ${isPackaged}`);
  
  if (isPackaged) {
    const nextPath = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
    logDebug(`app.whenReady: Next.js Path resolved to: ${nextPath}`);
    logDebug(`app.whenReady: Checking if nextPath exists inside main process: ${fs.existsSync(nextPath)}`);
    
    logDebug('app.whenReady: Starting Next.js production server using Electron Node execution...');
    try {
      const spawnArgs = [nextPath, 'start', __dirname, '-p', PORT.toString()];
      logDebug(`app.whenReady: Spawning process ${process.execPath} with args: ${JSON.stringify(spawnArgs)}`);
      
      nextServerProcess = spawn(process.execPath, spawnArgs, {
        cwd: process.resourcesPath,
        env: { 
          ...process.env, 
          ELECTRON_RUN_AS_NODE: '1',
          NODE_ENV: 'production' 
        }
      });

      nextServerProcess.on('error', (err) => {
        logDebug(`nextServerProcess: Next.js process spawn ERROR: ${err.message}\nStack: ${err.stack}`);
      });

      nextServerProcess.stdout.on('data', (data) => {
        logDebug(`[Next.js STDOUT]: ${data}`);
      });

      nextServerProcess.stderr.on('data', (data) => {
        logDebug(`[Next.js STDERR]: ${data}`);
      });

      nextServerProcess.on('exit', (code, signal) => {
        logDebug(`nextServerProcess: Next.js process exited with code ${code} and signal ${signal}`);
      });

    } catch (e) {
      logDebug(`app.whenReady: Catch block error spawning process: ${e.message}\nStack: ${e.stack}`);
    }

    // Wait until the server responds on port 3000
    pingNextServer();
  } else {
    logDebug('app.whenReady: Running in dev mode, assuming Next.js dev server is running on port 3000');
    createMainWindow();
  }
});

app.on('window-all-closed', () => {
  logDebug('app event: window-all-closed triggered');
  if (nextServerProcess) {
    logDebug('app event: Terminating Next.js background process...');
    nextServerProcess.kill('SIGKILL');
  }
  
  if (process.platform !== 'darwin') {
    logDebug('app event: Quitting application');
    app.quit();
  }
});

app.on('activate', () => {
  logDebug('app event: activate triggered');
  if (mainWindow === null) {
    createMainWindow();
  }
});
