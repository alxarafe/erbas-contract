import { validateOpenApi } from './scripts/validate.mjs';
import { normalizeBaseUrl, runBruno, requireCredentials } from './scripts/conformance.mjs';
import { runProcess } from './scripts/process.mjs';

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if ((mode !== 'check' && mode !== 'test') || (mode === 'check' && args.length) || (mode === 'test' && args.length !== 1)) {
    console.error('Usage: check | test BASE_URL');
    return 2;
  }
  if (mode === 'test') { normalizeBaseUrl(args[0]); requireCredentials(); }
  const validation = await validateOpenApi();
  if (validation.code !== 0) return validation.code;
  if (mode === 'test') {
    const result = await runBruno(args[0]);
    console.log(result.output);
    if (result.code === 124) console.error('Conformance runner exceeded its 30-second deadline.');
    return result.code;
  }
  const result = await runProcess(process.execPath, ['--test', '/runner/tests/runner.test.mjs'], { timeoutMs: 300000 });
  if (result.code === 0) console.log('Repository verification passed; no external backend was examined.');
  return result.code;
}

try { process.exitCode = await main(); } catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
