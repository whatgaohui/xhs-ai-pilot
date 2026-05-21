const { spawn } = require('child_process');
const fs = require('fs');

const logStream = fs.createWriteStream('/home/z/my-project/dev.log', { flags: 'w' });

function startServer() {
  const child = spawn('npx', ['next', 'dev', '-p', '3000', '-H', '0.0.0.0', '--webpack'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
    logStream.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stdout.write(data);
    logStream.write(data);
  });

  child.on('exit', (code, signal) => {
    const msg = `Process exited with code ${code}, signal ${signal}. Restarting in 5s...\n`;
    process.stdout.write(msg);
    logStream.write(msg);
    setTimeout(startServer, 5000);
  });

  child.on('error', (err) => {
    const msg = `Process error: ${err.message}\n`;
    process.stdout.write(msg);
    logStream.write(msg);
  });
}

startServer();

// Keep this process alive
setInterval(() => {}, 60000);
