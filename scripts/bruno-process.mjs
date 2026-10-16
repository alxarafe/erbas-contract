import { runProcess } from './process.mjs';

export function normalizeBaseUrl(input) {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('baseUrl must be an HTTP(S) URL without credentials, query, or fragment.');
  }
  return url.href.replace(/\/+$/, '');
}

export function requireCredentials(env = process.env) {
  if (!env.ERBAS_TEST_EMAIL || !env.ERBAS_TEST_PASSWORD) {
    throw new Error('ERBAS_TEST_EMAIL and ERBAS_TEST_PASSWORD are required for full conformance.');
  }
}

export const collectionDirectory = '/runner/bruno';

// Internal execution shared by public scopes and synthetic test scenarios.
export async function executeBruno(baseUrl, paths, { env, timeoutMs }) {
  requireCredentials(env);
  const result = await runProcess(process.execPath, [
    // Bruno 4.2.0 executes explicit paths in argument order, retaining folder checks.
    '/runner/node_modules/@usebruno/cli/bin/bru.js', 'run', ...paths,
    '--env-var', `baseUrl=${normalizeBaseUrl(baseUrl)}`, '--sandbox', 'safe', '--bail'
  ], { cwd: collectionDirectory, timeoutMs, env, capture: true });
  // Assertion and transport diagnostics may contain credentials or tokens.
  const reason = /timeout|timed out/i.test(result.output) ? ' HTTP timeout.' : '';
  return { code: result.code, output: result.code === 0 ? 'Shared conformance passed.' : `Shared conformance failed.${reason} Diagnostics withheld to protect credentials and tokens.` };
}
