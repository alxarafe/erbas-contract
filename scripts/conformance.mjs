import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
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
export const conformanceScopes = Object.freeze({
  full: 'full', health: 'health', auth: 'auth', users: 'users',
  collections: 'collections', modules: 'modules', wms: 'wms'
});
const collectionDirectory = '/runner/bruno';
const administratorLogin = 'login-success.bru';
const createNormalUser = 'users-19-create-normal-user.bru';
const listUsers = 'users-20-list-users.bru';
const normalUserLogin = 'users-22-normal-user-login.bru';
const passwordBoundaryRequests = ['users-66-password-boundary-12.bru', 'users-67-password-boundary-256.bru'];

async function scopePaths(scope) {
  switch (scope) {
    case conformanceScopes.full: return ['.', conformanceScopes.modules, conformanceScopes.wms];
    case conformanceScopes.health: return ['health.bru'];
    case conformanceScopes.modules:
      return [administratorLogin, createNormalUser, normalUserLogin, conformanceScopes.modules];
    case conformanceScopes.wms:
      return [administratorLogin, createNormalUser, normalUserLogin, conformanceScopes.wms];
    case conformanceScopes.auth:
    case conformanceScopes.users:
    case conformanceScopes.collections: {
      const prefix = scope === conformanceScopes.auth ? 'login-'
        : scope === conformanceScopes.users ? 'users-' : 'collections-';
      const requests = [];
      for (const file of await readdir(collectionDirectory)) {
        if (file.startsWith(prefix) && file.endsWith('.bru')) {
          const source = await readFile(join(collectionDirectory, file), 'utf8');
          requests.push({ file, sequence: Number(source.match(/seq: (\d+)/)[1]) });
        }
      }
      const selected = requests.sort((a, b) => a.sequence - b.sequence).map(request => request.file);
      if (scope === conformanceScopes.auth) return selected;
      if (scope === conformanceScopes.users) return [administratorLogin, ...selected];
      return [administratorLogin, createNormalUser, listUsers, ...passwordBoundaryRequests, ...selected];
    }
    default: throw new Error('Unknown conformance scope.');
  }
}

export async function runBruno(baseUrl, { scope = conformanceScopes.full, env = process.env } = {}) {
  requireCredentials(env);
  const paths = await scopePaths(scope);
  const result = await runProcess(process.execPath, [
    // Bruno 4.2.0 executes explicit paths in argument order, retaining folder checks.
    '/runner/node_modules/@usebruno/cli/bin/bru.js', 'run', ...paths,
    '--env-var', `baseUrl=${normalizeBaseUrl(baseUrl)}`, '--sandbox', 'safe', '--bail'
  ], { cwd: collectionDirectory, timeoutMs: 30000, env, capture: true });
  // Assertion and transport diagnostics may contain credentials or tokens.
  const reason = /timeout|timed out/i.test(result.output) ? ' HTTP timeout.' : '';
  return { code: result.code, output: result.code === 0 ? 'Shared conformance passed.' : `Shared conformance failed.${reason} Diagnostics withheld to protect credentials and tokens.` };
}
