import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

const repository = '/runner';
const openapiDirectory = join(repository, 'openapi');
const wmsOpenapiDirectory = 'modules/wms/';
const wmsBrunoDirectory = 'modules/wms/';
const coreModularityDirectory = 'core/modularity/';
const rootOpenapi = 'erbas.yaml';
const contractVersion = '0.8.0';
const yamlFiles = (await readdir(openapiDirectory, { recursive: true })).filter(file => file.endsWith('.yaml'));
const brunoFiles = await readdir(join(repository, 'bruno'), { recursive: true });
const refs = source => [...source.matchAll(/\$ref:\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
const targetOf = (file, ref) => relative(openapiDirectory, resolve(openapiDirectory, dirname(file), ref.split('#')[0] || file.split('/').at(-1)));

for (const owner of ['common', 'core']) {
  test(`OpenAPI ${owner} references only its allowed source owners`, async () => {
    const files = yamlFiles.filter(file => file.startsWith(owner + '/'));
    assert.ok(files.length > 0);
    for (const file of files) {
      for (const ref of refs(await readFile(join(openapiDirectory, file), 'utf8'))) {
        const target = targetOf(file, ref);
        assert.ok(target.startsWith('common/') || owner === 'core' && target.startsWith('core/'), `${file} -> ${ref}`);
      }
    }
  });
}

test('WMS OpenAPI business definitions are owned by modules/wms', async () => {
  assert.ok(yamlFiles.some(file => file.startsWith(wmsOpenapiDirectory)));
  for (const file of yamlFiles.filter(file => file !== rootOpenapi)) {
    const source = await readFile(join(openapiDirectory, file), 'utf8');
    const declaresWms = /^  (?:\/api\/wms(?:\/|:)|(?:Create|Created|Replace|Patch)?Wms\w+:)/m.test(source);
    if (declaresWms) assert.ok(file.startsWith(wmsOpenapiDirectory), file);
  }
  const root = await readFile(join(openapiDirectory, rootOpenapi), 'utf8');
  for (const [, name, ref] of root.matchAll(/^    (\w*Wms\w*):\n      \$ref: '([^']+)'/gm)) {
    assert.ok(targetOf(rootOpenapi, ref).startsWith(wmsOpenapiDirectory), name);
  }
});

test('WMS Bruno requests live only below modules/wms', async () => {
  let found = 0;
  for (const file of brunoFiles.filter(file => file.endsWith('.bru'))) {
    const source = await readFile(join(repository, 'bruno', file), 'utf8');
    const wmsRequest = /url:.*(?:\/api\/wms\/|\{\{(?:uomsPath|storageAttributesPath|itemFamiliesPath)\}\})/.test(source);
    if (wmsRequest) { assert.ok(file.startsWith(wmsBrunoDirectory), file); found++; }
  }
  assert.ok(found > 0);
});

test('CORE module-administration requests are owned by core/modularity', () => {
  const requests = brunoFiles.filter(file => /(?:^|\/)modules-.*\.bru$/.test(file));
  assert.ok(requests.length > 0);
  for (const file of requests) assert.ok(file.startsWith(coreModularityDirectory), file);
});

test('one root Bruno collection composes all physical owners', () => {
  assert.deepEqual(brunoFiles.filter(file => file.endsWith('bruno.json')), ['bruno.json']);
});

test('neutral and CORE fixture code contains no functional module routes, constants or imports', async () => {
  for (const file of ['server.mjs', 'common.mjs', 'core.mjs']) {
    const source = await readFile(join(repository, 'tests/fixtures', file), 'utf8');
    assert.doesNotMatch(source, /['"](?:erbas\.wms|\/api\/wms(?:\/|['"])|wms_(?:uom|storage_attribute|item_family))/);
    assert.doesNotMatch(source, /\b(?:const|let|function)\s+(?:WMS_ID|uoms|storageAttributes|itemFamilies|associationFixture)\b/);
    assert.doesNotMatch(source, /from\s+['"][^'"]*(?:modules\/|composed\.mjs)/);
  }
});

test('OpenAPI has one composition root with external path/component references', async () => {
  const roots = [];
  for (const file of yamlFiles) if (/^openapi:/m.test(await readFile(join(openapiDirectory, file), 'utf8'))) roots.push(file);
  assert.deepEqual(roots, [rootOpenapi]);
  const source = await readFile(join(openapiDirectory, rootOpenapi), 'utf8');
  const paths = source.slice(source.indexOf('paths:\n'), source.indexOf('components:\n'));
  assert.match(paths, /modules\/wms\//);
  assert.doesNotMatch(paths, /^    (?:get|post|put|patch|delete):/m);
  for (const block of paths.split(/^  (?=\/)/m).slice(1)) assert.match(block, /^[^\n]+\n    \$ref: '[^']+'\n$/);
  const components = source.slice(source.indexOf('components:\n'));
  assert.doesNotMatch(components, /^      (?!\$ref:).+/m);
});

test('the single public contract version remains 0.8.0', async () => {
  const source = await readFile(join(openapiDirectory, rootOpenapi), 'utf8');
  assert.equal(source.match(/^  version: (.+)$/m)?.[1], contractVersion);
});

test('CORE tests and runner scopes do not own functional module definitions', async () => {
  const files = (await readdir(join(repository, 'tests/core'))).map(file => 'tests/core/' + file);
  files.push('scripts/conformance/core.mjs');
  for (const file of files) {
    const source = await readFile(join(repository, file), 'utf8');
    assert.doesNotMatch(source, /from\s+['"][^'"]*modules\/wms\//, file);
    assert.doesNotMatch(source, /\b(?:WMS_ID|uomsPath|storageAttributesPath|itemFamiliesPath)\b/, file);
  }
});
