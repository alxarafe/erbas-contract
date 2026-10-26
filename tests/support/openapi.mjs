import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runProcess } from '../../scripts/process.mjs';

export async function bundleOpenApi({ dereferenced = false } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'erbas-schema-'));
  try {
    let input = '/runner/openapi/erbas.yaml';
    if (dereferenced) {
      // JSON cannot encode the new recursive navigation tree after complete
      // dereferencing. Existing frozen-component checks examine the non-navigation
      // subgraph; navigation is checked independently in its normal bundled form.
      const source = (await readFile(input, 'utf8'))
        .replace(/^  \/api\/meta\/navigation:\n    \$ref: '[^']+'\n/m, '')
        .replace(/^    Navigation\w+:\n      \$ref: '[^']+'\n/gm, '')
        .replaceAll("$ref: './", "$ref: '/runner/openapi/");
      input = join(directory, 'non-navigation.yaml');
      await writeFile(input, source);
    }
    const output = join(directory, 'contract.json');
    const result = await runProcess(process.execPath, [
      '/runner/node_modules/@redocly/cli/bin/cli.js', 'bundle', input,
      ...(dereferenced ? ['--dereferenced'] : []), '--output', output, '--ext', 'json'
    ], { timeoutMs: 30000, capture: true });
    if (result.code !== 0) throw new Error(result.output);
    return JSON.parse(await readFile(output, 'utf8'));
  } finally { await rm(directory, { recursive: true, force: true }); }
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
