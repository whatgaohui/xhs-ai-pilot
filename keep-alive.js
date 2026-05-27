const { spawn } = require('child_process');
const fs = require('fs');

const logStream = fs.createWriteStream('/home/z/my-project/dev.log', { flags: 'w' });

function startServer(name, command, args, cwd, logFile) {
  const child = spawn(command, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  const serviceLog = fs.createWriteStream(logFile, { flags: 'a' });

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
    logStream.write(data);
    serviceLog.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stdout.write(data);
    logStream.write(data);
    serviceLog.write(data);
  });

  child.on('exit', (code, signal) => {
    const msg = `[${name}] Process exited with code ${code}, signal ${signal}. Restarting in 5s...\n`;
    process.stdout.write(msg);
    logStream.write(msg);
    serviceLog.write(msg);
    setTimeout(() => startServer(name, command, args, cwd, logFile), 5000);
  });

  child.on('error', (err) => {
    const msg = `[${name}] Process error: ${err.message}\n`;
    process.stdout.write(msg);
    logStream.write(msg);
    serviceLog.write(msg);
  });

  return child;
}

// Start Next.js dev server
startServer(
  'next',
  'npx',
  ['next', 'dev', '-p', '3000', '-H', '0.0.0.0', '--turbopack'],
  '/home/z/my-project',
  '/home/z/my-project/next-out.log'
);

// Start File Server microservice
startServer(
  'file-server',
  'bun',
  ['--hot', 'index.ts'],
  '/home/z/my-project/mini-services/file-server',
  '/home/z/my-project/file-server.log'
);

// Start XHS Scraper microservice
startServer(
  'xhs-scraper',
  'bun',
  ['--hot', 'index.ts'],
  '/home/z/my-project/mini-services/xhs-scraper',
  '/home/z/my-project/xhs-scraper.log'
);

// Keep this process alive
setInterval(() => {}, 60000);
