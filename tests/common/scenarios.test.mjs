import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionInventory } from '../support/inventory.mjs';
import { runBrunoScenario } from '../support/scenarios.mjs';
import { mutationTestTimeoutMs } from '../support/constants.mjs';
import { authScenarios, userScenarios, disabledTokenScenario, collectionScenarios, moduleScenarios } from '../core/scenarios.mjs';
import { uomScenarios, storageScenarios, itemFamilyScenarios, associationScenarios } from '../modules/wms/scenarios.mjs';
import { startFixture, fixtureEnv } from '../fixtures/composed.mjs';

test('synthetic scenarios select only original individual requests from the single collection', async () => {
  const { files } = await collectionInventory();
  const scenarios = [disabledTokenScenario, ...[
    authScenarios, userScenarios, collectionScenarios, moduleScenarios,
    uomScenarios, storageScenarios, itemFamilyScenarios, associationScenarios
  ].flatMap(group => Object.values(group))];
  for (const scenario of scenarios) {
    assert.ok(scenario.length > 0);
    for (const request of scenario) assert.ok(files.includes(request), request);
  }
});

// A healthy fixture must pass these exact chains, including inherited scripts
// and checks. Otherwise rejection could merely expose missing prerequisites.
for (const [name, scenario] of [
  ['canonical descriptor discovery', moduleScenarios['math-absent']],
  ['PUT atomicity', associationScenarios['partial-put']],
  ['PATCH atomicity', associationScenarios['partial-patch']]
]) {
  test(`minimal scenario passes without its fault: ${name}`, { timeout: mutationTestTimeoutMs }, async () => {
    const fixture = await startFixture();
    try {
      const result = await runBrunoScenario(fixture.baseUrl, scenario, { env: fixtureEnv });
      assert.equal(result.code, 0, result.output);
      assert.equal(fixture.requests.length, scenario.length);
    } finally { await fixture.close(); }
  });
}

test('scenario failure diagnostics withhold credentials and bearer tokens', { timeout: mutationTestTimeoutMs }, async () => {
  const token = 'synthetic.token_123';
  const fixture = await startFixture({ auth: { 200: { body: JSON.stringify({
    accessToken: token, diagnostics: `${fixtureEnv.ERBAS_TEST_EMAIL} ${fixtureEnv.ERBAS_TEST_PASSWORD}`
  }) } } });
  try {
    const result = await runBrunoScenario(fixture.baseUrl, authScenarios[200], { env: fixtureEnv });
    assert.notEqual(result.code, 0);
    assert.notEqual(result.code, 124);
    assert.equal(fixture.requests.length, authScenarios[200].length);
    assert.ok(fixture.faultsReached.includes('200'));
    for (const secret of [fixtureEnv.ERBAS_TEST_EMAIL, fixtureEnv.ERBAS_TEST_PASSWORD, token]) {
      assert.ok(!result.output.includes(secret));
    }
  } finally { await fixture.close(); }
});
