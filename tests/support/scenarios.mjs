import { executeBruno } from '../../scripts/bruno-process.mjs';

const syntheticScenarioTimeoutMs = 10000;

// Test-only selection: each entry names an original request, never a folder.
// Bruno retains its folder variables, scripts and assertions for explicit paths.
export function runBrunoScenario(baseUrl, requests, { env = process.env } = {}) {
  return executeBruno(baseUrl, requests, { env, timeoutMs: syntheticScenarioTimeoutMs });
}
