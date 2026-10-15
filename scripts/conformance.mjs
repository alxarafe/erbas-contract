import { coreScopes, coreFullPaths, coreScopePaths, administratorBootstrap } from './conformance/core.mjs';
import { wmsScopes, wmsFullPaths, wmsScopePaths, wmsScopeTimeoutMs } from './conformance/modules/wms.mjs';
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

// Scope names are the only selection API; callers never assemble CLI paths.
export const conformanceScopes = Object.freeze({ full: 'full', ...coreScopes, ...wmsScopes });
const collectionDirectory = '/runner/bruno';
const scopedConformanceTimeoutMs = 30000;
const fullConformanceTimeoutMs = 120000;

async function scopePaths(scope) {
  if (scope === conformanceScopes.full) return [...coreFullPaths, ...wmsFullPaths];
  const core = await coreScopePaths(scope, collectionDirectory);
  if (core) return core;
  const module = wmsScopePaths(scope);
  if (module) return [...administratorBootstrap, ...module];
  throw new Error('Unknown conformance scope.');
}

export async function runBruno(baseUrl, { scope = conformanceScopes.full, env = process.env } = {}) {
  requireCredentials(env);
  const paths = await scopePaths(scope);
  const timeoutMs = scope === conformanceScopes.full
    ? fullConformanceTimeoutMs
    : wmsScopeTimeoutMs(scope) ?? scopedConformanceTimeoutMs;
  const result = await runProcess(process.execPath, [
    // Bruno 4.2.0 executes explicit paths in argument order, retaining folder checks.
    '/runner/node_modules/@usebruno/cli/bin/bru.js', 'run', ...paths,
    '--env-var', `baseUrl=${normalizeBaseUrl(baseUrl)}`, '--sandbox', 'safe', '--bail'
  ], { cwd: collectionDirectory, timeoutMs, env, capture: true });
  // Assertion and transport diagnostics may contain credentials or tokens.
  const reason = /timeout|timed out/i.test(result.output) ? ' HTTP timeout.' : '';
  return { code: result.code, output: result.code === 0 ? 'Shared conformance passed.' : `Shared conformance failed.${reason} Diagnostics withheld to protect credentials and tokens.` };
}
