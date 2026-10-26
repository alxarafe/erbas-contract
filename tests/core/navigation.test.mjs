import test from 'node:test';
import assert from 'node:assert/strict';
import { bundleOpenApi } from '../support/openapi.mjs';
import { runBruno, conformanceScopes } from '../../scripts/conformance.mjs';
import { startFixture, fixtureEnv } from '../fixtures/composed.mjs';
import { mutationTestTimeoutMs } from '../support/constants.mjs';

test('navigation is a separate recursive public contract with explicit targets and cache validation', async () => {
  const api = await bundleOpenApi();
  assert.ok(api.paths['/api/meta/navigation'].get.responses['304']);
  assert.ok(api.components.schemas.NavigationResponse);
  const response = api.components.schemas.NavigationResponse;
  assert.deepEqual(response.required, ['version', 'items']);
  assert.ok(response.properties.items.items.$ref.includes('NavigationItem'));
  assert.ok(api.components.schemas.NavigationItem.properties.children.items.$ref.includes('NavigationItem'));
  // Ordinary bundling retains the recursive hierarchy instead of flattening it.
  assert.ok(JSON.stringify(api).includes('NavigationItem'));
  assert.ok(!JSON.stringify(api.components.schemas.ResourceMetadata).includes('navigation'));
});

test('navigation conformance supports stable private cache validation and identity changes', { timeout: mutationTestTimeoutMs }, async () => {
  const fixture = await startFixture();
  try {
    const result = await runBruno(fixture.baseUrl, { scope: conformanceScopes.navigation, env: fixtureEnv });
    assert.equal(result.code, 0, result.output);
    assert.equal(fixture.requests.filter(request => request.path === '/api/meta/navigation').length, 6);
  } finally { await fixture.close(); }
});
for (const navigationFault of ['empty-group', 'schema-leak', 'context-cache']) {
  test(`navigation runner rejects ${navigationFault}`, { timeout: mutationTestTimeoutMs }, async () => {
    const fixture = await startFixture({ navigationFault });
    try {
      const result = await runBruno(fixture.baseUrl, { scope: conformanceScopes.navigation, env: fixtureEnv });
      assert.notEqual(result.code, 0); assert.notEqual(result.code, 124); assert.ok(fixture.faultsReached.includes(navigationFault));
    } finally { await fixture.close(); }
  });
}
