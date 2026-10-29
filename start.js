const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\x1b[36m%s\x1b[0m', '=============================================================');
console.log('\x1b[36m%s\x1b[0m', '🚀 Starting ExpensePilot AI Full-Stack Platform...');
console.log('\x1b[36m%s\x1b[0m', '=============================================================');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

// Determine Python executable (prefer backend/.venv/bin/python)
const venvPythonMac = path.join(backendDir, '.venv', 'bin', 'python');
const venvPythonWin = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
let pythonCmd = 'python3';

if (fs.existsSync(venvPythonMac)) {
  pythonCmd = venvPythonMac;
} else if (fs.existsSync(venvPythonWin)) {
  pythonCmd = venvPythonWin;
}

console.log(`📡 Python runtime : ${pythonCmd}`);
console.log(`🌐 Frontend UI   : http://127.0.0.1:5173`);
console.log(`⚙️  Backend API   : http://127.0.0.1:8000`);
console.log(`📚 API Swagger   : http://127.0.0.1:8000/docs`);
console.log('\x1b[36m%s\x1b[0m', '-------------------------------------------------------------\n');

// 1. Spawn Backend Process
const backendProcess = spawn(pythonCmd, ['run.py'], {
  cwd: backendDir,
  env: {
    ...process.env,
    PYTHONUNBUFFERED: '1',
    PYTHONPATH: rootDir
  },
  stdio: 'inherit'
});

// 2. Spawn Frontend Process
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const frontendProcess = spawn(npmCmd, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], {
  cwd: frontendDir,
  env: process.env,
  stdio: 'inherit'
});

// Clean shutdown on exit
function shutdown() {
  console.log('\n\x1b[33m%s\x1b[0m', '🛑 Shutting down ExpensePilot AI services...');
  backendProcess.kill('SIGINT');
  frontendProcess.kill('SIGINT');
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

backendProcess.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`\x1b[31m[BACKEND ERROR] Backend process exited with code ${code}\x1b[0m`);
  }
});

frontendProcess.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`\x1b[31m[FRONTEND ERROR] Frontend process exited with code ${code}\x1b[0m`);
  }
});

