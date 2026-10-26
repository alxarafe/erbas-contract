import test from 'node:test';
import assert from 'node:assert/strict';
import { bundleOpenApi } from '../support/openapi.mjs';
import { runBruno, conformanceScopes } from '../../scripts/conformance.mjs';
import { startFixture, fixtureEnv } from '../fixtures/composed.mjs';
import { mutationTestTimeoutMs } from '../support/constants.mjs';

test('generic resource page is distinct and legacy collection schemas are unchanged', async () => {
  const api = await bundleOpenApi({ dereferenced: true });
  const page = api.components.schemas.ResourcePage;
  assert.deepEqual(page.required, ['items', 'offset', 'limit']);
  assert.equal(page.additionalProperties, false);
  assert.ok(!Object.hasOwn(page.properties, 'order'));
  assert.ok(api.components.schemas.UserCollection.required.includes('order'));
  assert.ok(api.components.schemas.UserCollection.required.includes('total'));
  const routes = api.paths;
  for (const method of ['get', 'post']) assert.ok(routes['/api/resources/{resource}'][method].responses['409']);
  for (const method of ['get', 'patch', 'delete']) assert.ok(routes['/api/resources/{resource}/{id}'][method].responses['409']);
  assert.deepEqual(routes['/api/resources/{resource}'].get.parameters.map(p => p.name), ['offset','limit','search','sort','filter']);
  assert.ok(api.components.schemas.ResourceFieldCapabilities.required.includes('filterOperators'));
  assert.deepEqual(api.components.schemas.ResourceRelation.properties.kind.enum, ['MANY_TO_ONE']);
  assert.ok(routes['/api/resource-actions/{resource}/{action}/execute'].post.responses['204']);
  assert.ok(routes['/api/meta/resources/{resource}'].get.responses['304']);
});

test('generic resource runner exercises metadata, CRUD, conflicts, pages and action protocol', { timeout: mutationTestTimeoutMs }, async () => {
  const fixture = await startFixture();
  try {
    const result = await runBruno(fixture.baseUrl, { scope: conformanceScopes.resources, env: fixtureEnv });
    assert.equal(result.code, 0, result.output);
    const requests = fixture.requests.filter(r => r.path.startsWith('/api/resources/') || r.path.startsWith('/api/meta/resources') || r.path.startsWith('/api/resource-actions/'));
    assert.equal(requests.length, 21);
    assert.ok(requests.some(r => r.method === 'PATCH' && r.expected === 409));
    assert.ok(requests.some(r => r.method === 'DELETE' && r.expected === 204));
  } finally { await fixture.close(); }
});

for (const resourceFault of ['operators', 'conflict', 'total']) {
  test(`generic resource runner rejects ${resourceFault} mismatch`, { timeout: mutationTestTimeoutMs }, async () => {
    const fixture = await startFixture({ resourceFault });
    try {
      const result = await runBruno(fixture.baseUrl, { scope: conformanceScopes.resources, env: fixtureEnv });
      assert.notEqual(result.code, 0); assert.notEqual(result.code, 124);
      assert.ok(fixture.faultsReached.includes(resourceFault));
    } finally { await fixture.close(); }
  });
}
