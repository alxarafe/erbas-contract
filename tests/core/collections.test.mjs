import test from 'node:test';
import assert from 'node:assert/strict';
import { runBrunoScenario } from '../support/scenarios.mjs';
import { mutationTestTimeoutMs } from '../support/constants.mjs';
import { collectionScenarios } from './scenarios.mjs';
import { runBruno, conformanceScopes } from '../../scripts/conformance.mjs';
import { startFixture, fixtureEnv, userCollection, modulesPath } from '../fixtures/core.mjs';
for (const collectionFault of ['total', 'limit', 'offset', 'order', 'window', 'negative-offset',
  'excessive-limit', 'extra', 'order-extra']) {
  test(`runner rejects collection fault: ${collectionFault}`, { timeout: mutationTestTimeoutMs }, async () => {
    const fixture = await startFixture({ collectionFault });
    try {
      const scenario = collectionScenarios[collectionFault];
      // Early collection faults already bail at the bootstrap list request.
      const result = ['offset', 'window', 'negative-offset', 'excessive-limit'].includes(collectionFault)
        ? await runBrunoScenario(fixture.baseUrl, scenario, { env: fixtureEnv })
        : await runBruno(fixture.baseUrl, { env: fixtureEnv, scope: conformanceScopes.collections });
      assert.equal(fixture.requests.length, scenario.length);
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124);
      assert.ok(!result.output.includes(fixtureEnv.ERBAS_TEST_PASSWORD));
      assert.ok(!result.output.includes('synthetic.token_123'));
      const expectedPath = ['offset', 'window'].includes(collectionFault) ? '/api/users?offset=1&limit=1'
        : collectionFault === 'negative-offset' ? '/api/users?offset=-1'
        : collectionFault === 'excessive-limit' ? '/api/users?limit=101' : '/api/users';
      assert.equal(fixture.requests.at(-1).path, expectedPath, 'failure must reach the targeted pagination fault');
      assert.ok(fixture.faultsReached.includes(collectionFault), 'pagination fault must be applied');
      assert.ok(fixture.requests.every(request => !request.path.startsWith(modulesPath)), 'Collections scope must exclude Modules');
    } finally { await fixture.close(); }
  });
}

test('empty collection has complete metadata and fixed order', () => {
  assert.deepEqual(userCollection([]), { items: [], offset: 0, limit: 50, total: 0,
    order: [{ field: 'id', direction: 'asc' }] });
});

test('fixture orders before slicing rather than relying on insertion order', async () => {
  const fixture = await startFixture();
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic.token_123' };
  try {
    const created = [];
    for (const email of ['z@example.test', 'a@example.test']) {
      const response = await fetch(`${fixture.baseUrl}/api/users`, { method: 'POST', headers,
        body: JSON.stringify({ email, password: 'synthetic-password', admin: false }) });
      assert.equal(response.status, 201);
      created.push(await response.json());
    }
    // Admin was inserted first, and emails oppose ID order. Only ID sorting yields this window.
    const response = await fetch(`${fixture.baseUrl}/api/users?offset=1&limit=1`, { headers });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { items: [created[1]], offset: 1, limit: 1, total: 3,
      order: [{ field: 'id', direction: 'asc' }] });
    const beyond = await fetch(`${fixture.baseUrl}/api/users?offset=100`, { headers });
    assert.equal(beyond.status, 200);
    assert.deepEqual(await beyond.json(), { items: [], offset: 100, limit: 50, total: 3,
      order: [{ field: 'id', direction: 'asc' }] });
  } finally { await fixture.close(); }
});
