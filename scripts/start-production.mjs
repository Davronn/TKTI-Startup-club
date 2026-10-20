import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const publicPort = String(process.env.PORT || 10000);
const apiPort = String(process.env.API_PORT || 4000);

if (publicPort === apiPort) {
  throw new Error('PORT va API_PORT har xil bo\u2018lishi kerak');
}

const children = [];
let shuttingDown = false;

function launch(label, executable, args, env = process.env) {
  const child = spawn(executable, args, {
    env,
    stdio: 'inherit',
    windowsHide: true,
  });

  child.on('error', (error) => {
    console.error(`${label} ishga tushmadi`, error);
    shutdown('SIGTERM', 1);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`${label} to\u2018xtadi (code=${code}, signal=${signal})`);
    shutdown('SIGTERM', code ?? 1);
  });

  children.push(child);
  return child;
}

function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
  setTimeout(() => process.exit(exitCode), 1_000).unref();
}

const nextCli = require.resolve('next/dist/bin/next');

launch('API', process.execPath, ['apps/api/dist/main.js'], {
  ...process.env,
  PORT: apiPort,
});
launch('Web', process.execPath, [nextCli, 'start', 'apps/web', '-H', '0.0.0.0', '-p', publicPort]);

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
