import { runProcess } from './process.mjs';

export function normalizeBaseUrl(input) {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('baseUrl must be an HTTP(S) URL without credentials, query, or fragment.');
  }
  return url.href.replace(/\/+$/, '');
}

export function runBruno(baseUrl, options = {}) {
  return runProcess(process.execPath, [
    '/runner/node_modules/@usebruno/cli/bin/bru.js', 'run', '.',
    '--env-var', `baseUrl=${normalizeBaseUrl(baseUrl)}`, '--sandbox', 'safe', '--bail'
  ], { cwd: '/runner/bruno', timeoutMs: 10000, ...options });
}
