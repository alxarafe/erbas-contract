import test from 'node:test';
import assert from 'node:assert/strict';
import { runBruno, conformanceScopes } from '../scripts/conformance.mjs';
import { fullSuiteTestTimeoutMs } from './support/constants.mjs';
import { startFixture, fixtureEnv, fixtureModules } from './fixtures/composed.mjs';
import { modulesPath, maximumCollectionLimit, MATH_ID, STATISTICS_ID } from './fixtures/core.mjs';
import { WMS_ID, uomsPath, storageAttributesPath } from './fixtures/modules/wms/catalogues.mjs';
import { AI_ID } from './fixtures/modules/ai/assistant.mjs';
import { baselineRequestCount as fullRequestCount } from './support/constants.mjs';
import { wmsRequestCount, storageAttributeRequestCount } from './modules/wms/support.mjs';

const publishedRequestCount = 130;
const v060RequestCount = publishedRequestCount + wmsRequestCount;
const v070RequestCount = v060RequestCount + storageAttributeRequestCount;

test('full suite exercises published operations and CONTRACT-003', { timeout: fullSuiteTestTimeoutMs }, async () => {
  const fixture = await startFixture();
  try {
    const result = await runBruno(fixture.baseUrl, { env: fixtureEnv });
    assert.equal(result.code, 0, result.output);
    assert.equal(fixture.requests.length, fullRequestCount);
    const login = fixture.requests.slice(1, 15);
    assert.ok(login.every(r => r.method === 'POST' && r.path === '/api/auth/login'
      && r.accept === 'application/json' && r.contentType.toLowerCase() === 'application/json'));
    assert.equal(login.filter(r => r.expected === 200).length, 1);
    assert.equal(login.filter(r => r.expected === 401).length, 3);
    assert.equal(login.filter(r => r.expected === 400).length, 10);
    assert.equal(login.filter(r => r.malformed).length, 1);
    const users = fixture.requests.slice(15, 67);
    assert.equal(users.length, 52);
    assert.equal(users.filter(r => r.expected === 201).length, 3);
    assert.equal(users.filter(r => r.expected === 403).length, 4);
    assert.equal(users.filter(r => r.expected === 400).length, 20);
    assert.equal(users.filter(r => r.expected === 404).length, 2);
    assert.equal(users.filter(r => r.expected === 409).length, 1);
    const collections = fixture.requests.slice(67, 82);
    assert.equal(collections.length, 15);
    assert.ok(collections.every(r => r.method === 'GET' && r.path.startsWith('/api/users')));
    assert.equal(collections.filter(r => r.expected === 200).length, 8);
    assert.equal(collections.filter(r => r.expected === 400).length, 7);
    const modules = fixture.requests.slice(82, publishedRequestCount);
    assert.equal(modules.length, 48);
    assert.ok(modules.every(r => r.path.startsWith(modulesPath)));
    assert.equal(modules.filter(r => r.expected === 409).length, 2);
    assert.equal(modules.filter(r => r.expected === 404).length, 1);
    const wms = fixture.requests.slice(publishedRequestCount, v060RequestCount);
    assert.equal(wms.length, wmsRequestCount);
    assert.ok(wms.every(r => r.path.startsWith(uomsPath) || r.path === `${modulesPath}/${WMS_ID}`));
    assert.equal(wms.filter(r => r.expected === 201).length, 4);
    assert.equal(wms.filter(r => r.expected === 409).length, 2);
    assert.equal(wms.filter(r => r.expected === 503).length, 3);
    assert.equal(fixture.requests.slice(v060RequestCount, v070RequestCount).length, storageAttributeRequestCount);
    assert.ok(fixture.requests.slice(v060RequestCount, v070RequestCount).every(r => r.path.startsWith(storageAttributesPath) || r.path === `${modulesPath}/${WMS_ID}`));
    const response = await fetch(`${fixture.baseUrl}${modulesPath}`, { headers: { Authorization: 'Bearer synthetic.token_123' } });
    assert.ok((await response.json()).items.every(module => module.enabled));
  } finally { await fixture.close(); }
});

test('canonical descriptors are discovered beyond the first 100 modules', { timeout: fullSuiteTestTimeoutMs }, async () => {
  const availableModules = Array.from({ length: maximumCollectionLimit + 1 }, (_, index) => ({
    ...fixtureModules()[1], id: `a-${index}`
  }));
  availableModules.push(...fixtureModules());
  const fixture = await startFixture({ availableModules });
  try {
    const result = await runBruno(fixture.baseUrl, { env: fixtureEnv, scope: conformanceScopes.modules });
    assert.equal(result.code, 0, result.output);
    assert.equal(fixture.requests.length, 52);
    assert.ok(fixture.requests.some(request => request.path === `${modulesPath}?offset=${maximumCollectionLimit}&limit=${maximumCollectionLimit}`));
    const response = await fetch(`${fixture.baseUrl}${modulesPath}?offset=${maximumCollectionLimit + 1}`, {
      headers: { Authorization: 'Bearer synthetic.token_123' }
    });
    const items = (await response.json()).items;
    assert.deepEqual(items.map(module => module.id), [AI_ID, MATH_ID, STATISTICS_ID, WMS_ID]);
    assert.ok(items.every(module => module.enabled));
  } finally { await fixture.close(); }
});


test('the runner preserves rejection of unknown scopes, including Object prototype names', async () => {
  for (const scope of ['unknown', 'constructor', 'toString', '__proto__']) {
    await assert.rejects(runBruno('http://example.test', { scope, env: fixtureEnv }), /Unknown conformance scope/);
  }
});
