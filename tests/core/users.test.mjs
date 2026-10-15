import test from 'node:test';
import assert from 'node:assert/strict';
import { runBruno, conformanceScopes } from '../../scripts/conformance.mjs';
import { startFixture, fixtureEnv, disabledTokenFault, modulesPath } from '../fixtures/core.mjs';
const userFailures = [
  ['current user exposes password', { 'me:200': { body: '{"id":"x","email":"fixture@example.test","enabled":true,"admin":true,"password":"synthetic"}' } }],
  ['administrator identity is not admin', { 'me:200': { body: '{"id":"x","email":"fixture@example.test","enabled":true,"admin":false}' } }],
  ['unauthorized challenge missing', { 'me:401': { headers: { 'WWW-Authenticate': 'Basic' } } }],
  ['protected error cacheable', { 'me:401': { headers: { 'Cache-Control': 'public' } } }],
  ['forbidden includes challenge', { 'list:403': { headers: { 'WWW-Authenticate': 'Bearer' } } }],
  ['created user disabled', { 'create:201': { body: '{"id":"x","email":"wrong@example.test","enabled":false,"admin":false}' } }],
  ['list returns a bare array', { 'list:200': { body: '[]' } }],
  ['get returns different user', { 'get:200': { body: '{}' } }],
  ['patch returns stale state', { 'patch:200': { body: '{}' } }],
  ['duplicate email accepted', { 'create:409': { status: 201 } }],
  ['missing user exposes detail', { 'get:404': { body: '{"code":"user_not_found","errors":[{"code":"user_not_found"}],"detail":"internal"}' } }],
  ['invalid creation accepted', { 'create:400': { status: 201 } }],
  ['invalid patch accepted', { 'patch:400': { status: 200 } }],
  ['protected response has wrong media type', { 'me:200': { contentType: 'text/plain' } }],
  ['protected redirect', { 'me:200': { status: 302, headers: { Location: '/health' } } }],
  ['protected HTTP timeout', { 'me:200': { hang: true } }]
];
for (const [name, users] of userFailures) {
  test(name, { timeout: 15000 }, async () => {
    const fixture = await startFixture({ users });
    try {
      const result = await runBruno(fixture.baseUrl, { env: fixtureEnv, scope: conformanceScopes.users });
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124);
      assert.ok(fixture.faultsReached.includes(Object.keys(users)[0]), 'fault must reach the targeted Users response');
      assert.ok(fixture.requests.every(request => !request.path.includes('?') && !request.path.startsWith(modulesPath)), 'Users scope must exclude Collections and Modules');
      assert.ok(!result.output.includes(fixtureEnv.ERBAS_TEST_PASSWORD));
      assert.ok(!result.output.includes('synthetic.token_123'));
    } finally { await fixture.close(); }
  });
}

test('runner rejects tokens belonging to disabled users', { timeout: 15000 }, async () => {
  const fixture = await startFixture({ acceptDisabledTokens: true });
  try {
    const result = await runBruno(fixture.baseUrl, { env: fixtureEnv, scope: conformanceScopes.users });
    assert.notEqual(result.code, 0, result.output);
    assert.ok(fixture.faultsReached.includes(disabledTokenFault), 'fault must reach a disabled token');
  } finally { await fixture.close(); }
});

test('last enabled administrator invariant and self updates in synthetic fixture', async () => {
  const fixture = await startFixture();
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic.token_123' };
  const patch = async (id, body, status, expected) => {
    const response = await fetch(`${fixture.baseUrl}/api/users/${id}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), expected);
  };
  try {
    for (const body of [{ enabled: false }, { admin: false }, { enabled: false, admin: false }]) {
      await patch('synthetic-admin', body, 409, { code: 'last_admin', errors: [{ code: 'last_admin' }] });
    }
    const response = await fetch(`${fixture.baseUrl}/api/users`, { method: 'POST', headers,
      body: JSON.stringify({ email: 'second-admin@example.test', password: 'synthetic-password', admin: true }) });
    assert.equal(response.status, 201);
    const second = await response.json();
    await patch(second.id, { enabled: false }, 200, { ...second, enabled: false });
    await patch('synthetic-admin', { admin: false }, 409, { code: 'last_admin', errors: [{ code: 'last_admin' }] });
    await patch(second.id, { enabled: true }, 200, second);
    await patch('synthetic-admin', { enabled: false }, 200,
      { id: 'synthetic-admin', email: fixtureEnv.ERBAS_TEST_EMAIL, enabled: false, admin: true });
    const disabled = await fetch(`${fixture.baseUrl}/api/auth/me`, { headers });
    assert.equal(disabled.status, 401);
    assert.deepEqual(await disabled.json(), { code: 'unauthorized', errors: [{ code: 'unauthorized' }] });
    const login = await fetch(`${fixture.baseUrl}/api/auth/login`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: second.email, password: 'synthetic-password' }) });
    assert.equal(login.status, 200);
    const { accessToken } = await login.json();
    const restored = await fetch(`${fixture.baseUrl}/api/users/synthetic-admin`, { method: 'PATCH',
      headers: { ...headers, Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ enabled: true }) });
    assert.equal(restored.status, 200);
    await patch('synthetic-admin', { admin: false }, 200,
      { id: 'synthetic-admin', email: fixtureEnv.ERBAS_TEST_EMAIL, enabled: true, admin: false });
  } finally { await fixture.close(); }
});
