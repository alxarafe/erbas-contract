import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { runProcess } from './process.mjs';

export function validateOpenApi(file = '/runner/openapi/erbas.yaml', options = {}) {
  return runProcess(process.execPath, [
    '/runner/node_modules/@redocly/cli/bin/cli.js', 'lint', file,
    '--config', '/runner/redocly.yaml', '--format', 'stylish'
  ], options);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await validateOpenApi();
  process.exitCode = result.code;
}
