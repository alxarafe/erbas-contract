import { spawn } from 'node:child_process';

// Every subprocess is bounded. Its process group is terminated on cancellation.
export function runProcess(command, args, { cwd = '/runner', timeoutMs = 30000, capture = false, env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd, env, detached: true, stdio: capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit']
    });
    let output = '';
    let forcedCode;
    let forceKill;
    const kill = (signal) => {
      try { process.kill(-child.pid, signal); } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    };
    const stop = (code) => {
      forcedCode ??= code;
      kill('SIGTERM');
      forceKill ??= setTimeout(() => kill('SIGKILL'), 1000);
    };
    const interrupt = () => stop(130);
    const terminate = () => stop(143);
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', terminate);
    const timer = setTimeout(() => stop(124), timeoutMs);
    const finish = () => {
      clearTimeout(timer);
      clearTimeout(forceKill);
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', terminate);
    };
    if (capture) {
      const collect = (data) => { output = (output + data.toString()).slice(-1000000); };
      child.stdout.on('data', collect);
      child.stderr.on('data', collect);
    }
    child.once('error', (error) => { finish(); reject(error); });
    child.once('close', (code) => {
      finish();
      resolve({ code: forcedCode ?? code ?? 1, output });
    });
  });
}
