import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runBrunoScenario } from '../support/scenarios.mjs';
import { bundleOpenApi } from '../support/openapi.mjs';
import { mutationTestTimeoutMs } from '../support/constants.mjs';
import { startFixture, fixtureEnv, fixtureModules, MATH_ID } from '../fixtures/core.mjs';
import { maximumCollectionLimit } from '../fixtures/common.mjs';
import { capabilitiesPath, capabilityIdPattern } from '../fixtures/capabilities.mjs';
import { capabilityRequests, capabilityListScenario } from './capability-scenarios.mjs';

const descriptor = {
  id: 'example.records.list', module: MATH_ID, version: '1.0.0',
  name: 'List example records', description: 'Synthetic descriptor for runner verification only.',
  effect: 'read', inputSchema: { $ref: '#/components/schemas/CapabilityListInput' },
  outputSchema: { $ref: '#/components/schemas/ModuleCollection' }, requiredPermissions: []
};

test('capability OpenAPI defines the closed descriptor, shared pagination and masked lookup', async () => {
  const api = await bundleOpenApi({ dereferenced: true });
  const schemas = api.components.schemas;
  const capability = schemas.Capability;
  assert.equal(capability.additionalProperties, false);
  assert.deepEqual([...capability.required].sort(), Object.keys(descriptor).sort());
  assert.deepEqual(Object.keys(capability.properties).sort(), Object.keys(descriptor).sort());
  assert.deepEqual(capability.properties.effect.enum, ['read', 'write']);
  assert.equal(capability.properties.requiredPermissions.uniqueItems, true);
  assert.equal(capability.properties.id.pattern, capabilityIdPattern.source);
  for (const folder of ['core/capabilities']) {
    const source = await readFile(`/runner/bruno/${folder}/folder.bru`, 'utf8');
    assert.ok(source.includes(`capabilityIdPattern: ${schemas.CapabilityId.pattern}`));
  }
  for (const field of ['inputSchema', 'outputSchema']) {
    assert.deepEqual(capability.properties[field], schemas.CapabilitySchemaReference);
    assert.equal(capability.properties[field].additionalProperties, false);
    assert.deepEqual(capability.properties[field].required, ['$ref']);
  }
  for (const valid of ['wms.item-families.list', descriptor.id]) assert.match(valid, capabilityIdPattern);
  for (const invalid of ['wms.list', 'Wms.uoms.list', 'wms..list', 'wms.uoms.list\n', 'wms.uoms.list.v1']) {
    assert.doesNotMatch(invalid, capabilityIdPattern);
  }
  for (const path of [capabilitiesPath, `${capabilitiesPath}/{capabilityId}`]) {
    assert.deepEqual(Object.keys(api.paths[path]), ['get']);
    assert.deepEqual(api.paths[path].get.security, [{ bearerAuth: [] }]);
    assert.equal(api.paths[path].get.responses['403'], undefined);
  }
  assert.equal(schemas.CapabilityNotFound.allOf[1].properties.code.const, 'capability_not_found');
  const input = schemas.CapabilityListInput;
  assert.equal(input.additionalProperties, false);
  assert.deepEqual(input.properties.offset, api.components.parameters.Offset.schema);
  assert.deepEqual(input.properties.limit, api.components.parameters.Limit.schema);
});

for (const capabilityFault of ['extra', 'id', 'schema', 'version', 'duplicates', 'malformed-json']) {
  test(`runner rejects capability descriptor fault: ${capabilityFault}`, { timeout: mutationTestTimeoutMs }, async () => {
    const fixture = await startFixture({ capabilityDescriptors: [descriptor], capabilityFault });
    try {
      const result = await runBrunoScenario(fixture.baseUrl, capabilityListScenario, { env: fixtureEnv });
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124);
      assert.equal(fixture.requests.length, capabilityListScenario.length);
      assert.ok(fixture.faultsReached.includes(capabilityFault));
      assert.ok(fixture.requests.at(-1).path.startsWith(capabilitiesPath));
    } finally { await fixture.close(); }
  });
}

for (const errorFault of ['missing-errors', 'empty-errors', 'malformed-detail']) {
  test(`capability errors reject global envelope fault: ${errorFault}`, { timeout: mutationTestTimeoutMs }, async () => {
    const fixture = await startFixture({ errorFault });
    try {
      const result = await runBrunoScenario(fixture.baseUrl, [capabilityRequests['anonymous-list']], { env: fixtureEnv });
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124);
      assert.ok(fixture.faultsReached.includes(errorFault));
    } finally { await fixture.close(); }
  });
}

test('effective catalogue supports empty, absent-provider, opaque-owner and multiple-page registries', { timeout: mutationTestTimeoutMs * 3 }, async () => {
  for (const options of [
    {}, { capabilityDescriptors: [{ ...descriptor, module: 'absent-provider' }] },
    { capabilityDescriptors: [{ ...descriptor, module: ' ' }],
      availableModules: [{ ...fixtureModules()[1], id: ' ' }] },
    { capabilityDescriptors: Array.from({ length: maximumCollectionLimit + 2 }, (_, i) => ({ ...descriptor, id: `example.records.op${i}` })) }
  ]) {
    const fixture = await startFixture(options);
    try {
      const result = await runBrunoScenario(fixture.baseUrl, capabilityListScenario, { env: fixtureEnv });
      assert.equal(result.code, 0, result.output);
      assert.equal(fixture.requests.length, options.capabilityDescriptors?.length > maximumCollectionLimit ? 3 : 2);
      if (options.capabilityDescriptors?.[0].module === 'absent-provider') {
        const headers = { Authorization: 'Bearer synthetic.token_123' };
        const list = await fetch(`${fixture.baseUrl}${capabilitiesPath}`, { headers });
        const body = await list.json();
        assert.deepEqual(body.items, []);
        assert.equal(body.total, 0);
        const detail = await fetch(`${fixture.baseUrl}${capabilitiesPath}/${descriptor.id}`, { headers });
        assert.equal(detail.status, 404);
        assert.deepEqual(await detail.json(), { code: 'capability_not_found', errors: [{ code: 'capability_not_found' }] });
      }
    } finally { await fixture.close(); }
  }
});

test('runner detects duplicate capability identities across page boundaries', { timeout: mutationTestTimeoutMs }, async () => {
  const fixture = await startFixture({ capabilityFault: 'cross-page-duplicate',
    capabilityDescriptors: Array.from({ length: maximumCollectionLimit + 2 }, (_, i) => ({ ...descriptor, id: `example.records.op${i}` })) });
  try {
    const result = await runBrunoScenario(fixture.baseUrl, capabilityListScenario, { env: fixtureEnv });
    assert.notEqual(result.code, 0, result.output);
    assert.notEqual(result.code, 124);
    assert.equal(fixture.requests.length, 3, 'the second page must be examined');
    assert.ok(fixture.faultsReached.includes('cross-page-duplicate'));
  } finally { await fixture.close(); }
});
