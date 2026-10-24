import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire('/runner/node_modules/@usebruno/cli/package.json');
const { expect } = require('chai');
const pattern = '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*\\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?![\\s\\S])';
const capability = { capabilityId: 'wms.uoms.list', invocationId: 'cap-invocation' };
const primitive = { primitiveId: 'wms.inventory.list', invocationId: 'primitive-invocation' };
async function validate(tools, sequence = 'capability:wms.uoms.list,primitive:wms.inventory.list') {
  const source = await readFile('/runner/bruno/modules/ai/assistant/folder.bru', 'utf8');
  const script = source.slice(source.indexOf('tests {') + 'tests {'.length, source.lastIndexOf('}'));
  const variables = new Map(Object.entries({ expectedStatus: 200, kind: 'assistant',
    expectedCapabilities: 'wms.uoms.list', expectedPrimitives: 'wms.inventory.list', expectedToolSequence: sequence }));
  runInNewContext(script, {
    test: (_name, callback) => callback(), expect,
    bru: { getVar: key => variables.get(key), setVar: (key, value) => variables.set(key, value), getFolderVar: () => pattern },
    res: { getStatus: () => 200, getHeader: key => ({ 'content-type': 'application/json', 'cache-control': 'no-store' })[key],
      getBody: () => ({ invocationId: 'ai-invocation', answer: 'Registered state.', toolsUsed: tools }) }
  });
}

test('shared Bruno accepts ordered mixed provenance with distinct audited identities', async () => {
  await validate([capability, primitive]);
});
for (const [name, tools] of [
  ['both kinds', [capability, { ...primitive, capabilityId: 'wms.inventory.list' }]],
  ['generic identity', [capability, { toolId: 'wms.inventory.list', invocationId: 'primitive-invocation' }]],
  ['extra payload', [capability, { ...primitive, input: {} }]],
  ['missing invocation', [capability, { primitiveId: 'wms.inventory.list' }]],
  ['empty invocation', [capability, { ...primitive, invocationId: '' }]],
  ['duplicate invocation', [capability, { ...primitive, invocationId: capability.invocationId }]],
  ['AI invocation reused', [capability, { ...primitive, invocationId: 'ai-invocation' }]],
  ['incorrect order', [primitive, capability]]
]) test(`shared Bruno rejects primitive provenance defect: ${name}`, async () => {
  await assert.rejects(validate(tools));
});
