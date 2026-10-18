import { coreScopes, coreFullPaths, coreCapabilityPaths, coreScopePaths, administratorBootstrap } from './conformance/core.mjs';
import { wmsScopes, wmsFullPaths, wmsCapabilityPaths, wmsScopePaths, wmsScopeTimeoutMs } from './conformance/modules/wms.mjs';
import { executeBruno, requireCredentials, collectionDirectory } from './bruno-process.mjs';
export { normalizeBaseUrl, requireCredentials } from './bruno-process.mjs';

// Scope names are the only selection API; callers never assemble CLI paths.
export const conformanceScopes = Object.freeze({ full: 'full', ...coreScopes, ...wmsScopes });
const scopedConformanceTimeoutMs = 30000;
const fullConformanceTimeoutMs = 120000;

async function scopePaths(scope) {
  if (scope === conformanceScopes.full) return [...coreFullPaths, ...wmsFullPaths, ...coreCapabilityPaths, ...wmsCapabilityPaths];
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
  return executeBruno(baseUrl, paths, { env, timeoutMs });
}
