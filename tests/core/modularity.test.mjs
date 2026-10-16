import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runBrunoScenario } from '../support/scenarios.mjs';
import { mutationTestTimeoutMs, loginPath } from '../support/constants.mjs';
import { moduleScenarios } from './scenarios.mjs';
import { requireCredentials } from '../../scripts/conformance.mjs';
import { startFixture, fixtureEnv, userCollection, fixtureModules, modulesPath, moduleNotFound, moduleDependencyConflict, MATH_ID, STATISTICS_ID, maximumCollectionLimit } from '../fixtures/core.mjs';
test('canonical module IDs agree with Bruno and require no ID environment variables', async () => {
  const folder = await readFile('/runner/bruno/core/modularity/folder.bru', 'utf8');
  assert.ok(folder.includes(`MATH_ID: ${MATH_ID}`));
  assert.ok(folder.includes(`STATISTICS_ID: ${STATISTICS_ID}`));
  requireCredentials({ ERBAS_TEST_EMAIL: fixtureEnv.ERBAS_TEST_EMAIL,
    ERBAS_TEST_PASSWORD: fixtureEnv.ERBAS_TEST_PASSWORD });
});

const moduleFailures = [
  ...['extra', 'missing', 'api-version', 'dependencies', 'enabled', 'order', 'pagination',
    'math-absent', 'statistics-absent', 'statistics-no-math', 'statistics-wrong-dependency',
    'accepted-enable-conflict', 'accepted-conflict', 'partial-disable-conflict', 'partial-enable-conflict',
    'stale-state'].map(moduleFault => [moduleFault, { moduleFault,
      // An otherwise valid collection must still fail when a canonical ID is
      // omitted; do not rely on the minimum-total assertion to detect absence.
      ...(moduleFault.endsWith('-absent') ? { availableModules: [...fixtureModules(),
        { ...fixtureModules()[1], id: 'unrelated-development-module' }] } : {}) }]),
  ['unauthenticated response', { modules: { 'list:401': { status: 200 } } }],
  ['non-admin response', { modules: { 'list:403': { status: 200 } } }],
  ['accepted invalid patch', { modules: { 'patch:400': { status: 200 } } }],
  ['missing module status', { modules: { 'patch:404': { status: 200 } } }],
  ['missing module body', { modules: { 'patch:404': { body: '{"code":"user_not_found","errors":[{"code":"user_not_found"}]}' } } }],
  ['dependency conflict body', { modules: { 'patch:409': { body: '{"code":"conflict","errors":[{"code":"conflict"}]}' } } }],
  ['missing module no-store', { modules: { 'list:200': { headers: { 'Cache-Control': 'public' } } } }],
  ['module challenge on success', { modules: { 'patch:200': { headers: { 'WWW-Authenticate': 'Bearer' } } } }]
];

for (const [name, options] of moduleFailures) {
  test(`runner rejects module fault: ${name}`, { timeout: mutationTestTimeoutMs }, async () => {
    const fixture = await startFixture(options);
    try {
      const scenario = moduleScenarios[name];
      const result = await runBrunoScenario(fixture.baseUrl, scenario, { env: fixtureEnv });
      assert.equal(fixture.requests.length, scenario.length);
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124);
      assert.ok(fixture.requests.at(-1).path.startsWith(modulesPath), 'fault must reach module administration');
      const target = options.moduleFault ?? Object.keys(options.modules)[0];
      assert.ok(fixture.faultsReached.includes(target), 'fault must reach the targeted module operation');
      if (name.endsWith('-absent')) {
        assert.deepEqual(fixture.requests.map(({ method, path }) => [method, path]), [
          ['POST', loginPath],
          ['GET', modulesPath],
          ['GET', `${modulesPath}?offset=0&limit=${maximumCollectionLimit}`]
        ], 'descriptor discovery must execute only login, reference and discovery GETs');
      }
      assert.ok(!result.output.includes(fixtureEnv.ERBAS_TEST_PASSWORD));
      assert.ok(!result.output.includes('synthetic.token_123'));
    } finally { await fixture.close(); }
  });
}

test('module fixture handles empty availability, case-sensitive lookup and retained atomic state', async () => {
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic.token_123' };
  const empty = await startFixture({ availableModules: [] });
  try {
    const response = await fetch(`${empty.baseUrl}${modulesPath}`, { headers });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), userCollection([]));
  } finally { await empty.close(); }
  const fixture = await startFixture();
  const patch = async (id, enabled) => fetch(`${fixture.baseUrl}${modulesPath}/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers, body: JSON.stringify({ enabled }) });
  try {
    const changedCase = await patch(MATH_ID.toUpperCase(), true);
    assert.equal(changedCase.status, 404);
    assert.deepEqual(await changedCase.json(), { code: moduleNotFound, errors: [{ code: moduleNotFound }] });
    const conflict = await patch(MATH_ID, false);
    assert.equal(conflict.status, 409);
    assert.deepEqual(await conflict.json(), { code: moduleDependencyConflict, errors: [{ code: moduleDependencyConflict }] });
    const response = await fetch(`${fixture.baseUrl}${modulesPath}?limit=1&offset=1`, { headers });
    assert.deepEqual(await response.json(), userCollection(fixtureModules(), 1, 1));
    const original = await fetch(`${fixture.baseUrl}${modulesPath}`, { headers });
    assert.ok((await original.json()).items.every(module => module.enabled));
  } finally { await fixture.close(); }
});
