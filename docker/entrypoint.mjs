import { readdir } from 'node:fs/promises';
import { validateOpenApi } from './scripts/validate.mjs';
import { normalizeBaseUrl, runBruno, requireCredentials } from './scripts/conformance.mjs';
import { runProcess } from './scripts/process.mjs';
import { classifyImpact, normalizeScopes, scopedTestFiles } from './scripts/impact.mjs';

const repositoryTestTimeoutMs = 900000;
const fastTests = ['tests/common/boundaries.test.mjs',
  'tests/common/inventory.test.mjs', 'tests/common/openapi.test.mjs',
  'tests/common/runner.test.mjs', 'tests/common/impact.test.mjs'];

async function runTests(files, options = []) {
  return runProcess(process.execPath, ['--test', '--test-concurrency=1', ...options, ...files.map(file => '/runner/' + file)], { timeoutMs: repositoryTestTimeoutMs });
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (!['check', 'fast', 'scope', 'impact', 'test'].includes(mode) ||
      (['check', 'fast'].includes(mode) && args.length) || (mode === 'test' && args.length !== 1)) {
    console.error('Usage: check | fast | scope SCOPE... | impact [PATH...] | test BASE_URL');
    return 2;
  }
  let plan = { level: mode === 'check' ? 'full' : mode };
  if (mode === 'scope') plan = { level: 'scoped', scopes: normalizeScopes(args) };
  if (mode === 'impact') plan = classifyImpact(args);
  if (mode !== 'test') console.log(`Verification plan: ${plan.level}${plan.scopes ? ` (${plan.scopes.join(', ')})` : ''}`);
  if (mode === 'test') { normalizeBaseUrl(args[0]); requireCredentials(); }
  const validation = await validateOpenApi();
  if (validation.code !== 0) return validation.code;
  if (mode === 'test') {
    const result = await runBruno(args[0]);
    console.log(result.output);
    if (result.code === 124) console.error('Conformance runner exceeded its deadline.');
    return result.code;
  }
  let result;
  if (plan.level === 'full') {
    const files = (await readdir('/runner/tests', { recursive: true })).filter(file => file.endsWith('.test.mjs')).sort().map(file => 'tests/' + file);
    result = await runTests(files);
  } else {
    result = await runTests(fastTests);
    if (result.code === 0) result = await runTests(['tests/composition.test.mjs'], ['--test-name-pattern=the runner preserves rejection of unknown scopes']);
    if (result.code === 0 && plan.level === 'scoped') result = await runTests(scopedTestFiles(plan.scopes));
  }
  if (result.code === 0) console.log('Repository verification passed; no external backend was examined.');
  return result.code;
}

try { process.exitCode = await main(); } catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
