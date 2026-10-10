import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startFixture, fixtureEnv } from './fixtures/http-server.mjs';
import { runBruno, normalizeBaseUrl, requireCredentials } from '../scripts/conformance.mjs';
import { validateOpenApi } from '../scripts/validate.mjs';
import { runProcess } from '../scripts/process.mjs';


test('credentials are mandatory and never included in validation errors', () => {
  for (const env of [{}, { ERBAS_TEST_EMAIL: 'synthetic' }, { ERBAS_TEST_PASSWORD: 'synthetic' }]) {
    assert.throws(() => requireCredentials(env), /required for full conformance/);
  }
  requireCredentials(fixtureEnv);
});

test('full suite exercises Health, AUTH-001 and USERS-001 scenarios', { timeout: 15000 }, async () => {
  const fixture = await startFixture();
  try {
    const result = await runBruno(fixture.baseUrl, { env: fixtureEnv });
    assert.equal(result.code, 0, result.output);
    assert.equal(fixture.requests.length, 67);
    const login = fixture.requests.slice(1, 15);
    assert.ok(login.every(r => r.method === 'POST' && r.path === '/api/auth/login'
      && r.accept === 'application/json' && r.contentType.toLowerCase() === 'application/json'));
    assert.equal(login.filter(r => r.expected === 200).length, 1);
    assert.equal(login.filter(r => r.expected === 401).length, 3);
    assert.equal(login.filter(r => r.expected === 400).length, 10);
    assert.equal(login.filter(r => r.malformed).length, 1);
    const users = fixture.requests.slice(15);
    assert.equal(users.length, 52);
    assert.equal(users.filter(r => r.expected === 201).length, 3);
    assert.equal(users.filter(r => r.expected === 403).length, 4);
    assert.equal(users.filter(r => r.expected === 400).length, 20);
    assert.equal(users.filter(r => r.expected === 404).length, 2);
    assert.equal(users.filter(r => r.expected === 409).length, 1);
  } finally { await fixture.close(); }
});

const authFailures = [
  ["token containing trailing newline", { "200": { "body": "{\"accessToken\":\"bad\\n\"}" } }],
  [
    "success rejected",
    {
      "200": {
        "status": 401
      }
    }
  ],
  [
    "empty token",
    {
      "200": {
        "body": "{\"accessToken\":\"\"}"
      }
    }
  ],
  [
    "missing token",
    {
      "200": {
        "body": "{}"
      }
    }
  ],
  [
    "numeric token",
    {
      "200": {
        "body": "{\"accessToken\":42}"
      }
    }
  ],
  [
    "array response",
    {
      "200": {
        "body": "[]"
      }
    }
  ],
  [
    "malformed login JSON",
    {
      "200": {
        "body": "{"
      }
    }
  ],
  [
    "additional token fields",
    {
      "200": {
        "body": "{\"accessToken\":\"synthetic\",\"refreshToken\":\"synthetic\"}"
      }
    }
  ],
  [
    "token containing whitespace",
    {
      "200": {
        "body": "{\"accessToken\":\"bad token\"}"
      }
    }
  ],
  [
    "wrong login content type",
    {
      "200": {
        "contentType": "application/problem+json"
      }
    }
  ],
  [
    "malformed login media parameter",
    {
      "200": {
        "contentType": "application/json; charset="
      }
    }
  ],
  [
    "missing no-store",
    {
      "200": {
        "headers": {
          "Cache-Control": "public"
        }
      }
    }
  ],
  [
    "incorrect credentials accepted",
    {
      "401": {
        "status": 200
      }
    }
  ],
  [
    "credential error exposes account",
    {
      "401": {
        "body": "{\"code\":\"unknown_user\"}"
      }
    }
  ],
  [
    "missing challenge",
    {
      "401": {
        "headers": {
          "WWW-Authenticate": "Basic"
        }
      }
    }
  ],
  [
    "invalid payload unauthorized",
    {
      "400": {
        "status": 401
      }
    }
  ],
  [
    "invalid payload accepted",
    {
      "400": {
        "status": 200
      }
    }
  ],
  [
    "incorrect invalid request body",
    {
      "400": {
        "body": "{\"code\":\"invalid_credentials\"}"
      }
    }
  ],
  [
    "redirect login",
    {
      "200": {
        "status": 302,
        "headers": {
          "Location": "/health"
        }
      }
    }
  ],
  [
    "login HTTP timeout",
    {
      "200": {
        "hang": true
      }
    }
  ]
];
for (const [name, auth] of authFailures) {
  test(name, { timeout: 15000 }, async () => {
    const fixture = await startFixture({ auth });
    try {
      const result = await runBruno(fixture.baseUrl, { env: fixtureEnv });
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124);
      assert.ok(!result.output.includes(fixtureEnv.ERBAS_TEST_PASSWORD));
      assert.ok(!result.output.includes('synthetic.token_123'));
    } finally { await fixture.close(); }
  });
}


const scenarios = [
  ['valid response', {}, true],
  ['valid whitespace', { body: ' {\n  "status" : "ok"\n}\n' }, true],
  ['valid escaped JSON value', { body: '{"status":"\\u006f\\u006b"}' }, true],
  ['valid charset parameter', { contentType: 'application/json; charset=utf-8' }, true],
  ['valid quoted parameter and media type case', { contentType: 'Application/JSON; charset="utf-8"; profile="a;b"' }, true],
  ['incorrect HTTP status', { status: 503 }, false],
  ['incorrect content type', { contentType: 'text/plain' }, false],
  ['malformed content type parameter', { contentType: 'application/json; charset=' }, false],
  ['incorrect status value', { body: '{"status":"down"}' }, false],
  ['additional property', { body: '{"status":"ok","extra":true}' }, false],
  ['missing status property', { body: '{}' }, false],
  ['malformed JSON', { body: '{' }, false],
  ['redirect to a conforming response', { redirect: true }, false],
  ['HTTP timeout', { hang: true }, false]
];

for (const [name, fixtureOptions, success] of scenarios) {
  test(name, { timeout: 15000 }, async () => {
    const fixture = await startFixture(fixtureOptions);
    try {
      const started = Date.now();
      const result = await runBruno(fixture.baseUrl, { env: fixtureEnv });
      if (success) assert.equal(result.code, 0, result.output);
      else assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124, 'CLI watchdog hid the expected HTTP test result');
      assert.equal(fixture.requests.filter(r => r.path === '/health' || r.path === '/target').length, 1, 'Health must not be retried or redirected');
      assert.deepEqual(fixture.requests[0], { method: 'GET', path: '/health', accept: 'application/json' });
      if (fixtureOptions.hang) {
        assert.match(result.output, /timeout|timed out/i);
        assert.ok(Date.now() - started < 10000, 'HTTP timeout was not bounded');
      }
    } finally { await fixture.close(); }
  });
}

test('OpenAPI structural errors fail validation', { timeout: 35000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'erbas-openapi-'));
  try {
    const file = join(directory, 'invalid.yaml');
    await writeFile(file, 'openapi: 3.1.0\ninfo:\n  title: Invalid\n  version: draft\npaths:\n  /health:\n    get:\n      responses: 200\n');
    const result = await validateOpenApi(file, { capture: true });
    assert.notEqual(result.code, 0, result.output);
    assert.notEqual(result.code, 124, result.output);
    assert.match(result.output, /error/i);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('CLI watchdog terminates a stuck subprocess', { timeout: 5000 }, async () => {
  const result = await runProcess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { capture: true, timeoutMs: 100 });
  assert.equal(result.code, 124);
});

test('invalid base URLs are rejected', () => {
  for (const value of ['not-a-url', 'ftp://example.test', 'http://user:password@example.test', 'http://example.test?q=1', 'http://example.test/#fragment']) {
    assert.throws(() => normalizeBaseUrl(value));
  }
  assert.equal(normalizeBaseUrl('http://example.test/'), 'http://example.test');
});

const userFailures = [
  ['current user exposes password', { 'me:200': { body: '{"id":"x","email":"fixture@example.test","enabled":true,"admin":true,"password":"synthetic"}' } }],
  ['administrator identity is not admin', { 'me:200': { body: '{"id":"x","email":"fixture@example.test","enabled":true,"admin":false}' } }],
  ['unauthorized challenge missing', { 'me:401': { headers: { 'WWW-Authenticate': 'Basic' } } }],
  ['protected error cacheable', { 'me:401': { headers: { 'Cache-Control': 'public' } } }],
  ['forbidden includes challenge', { 'list:403': { headers: { 'WWW-Authenticate': 'Bearer' } } }],
  ['created user disabled', { 'create:201': { body: '{"id":"x","email":"wrong@example.test","enabled":false,"admin":false}' } }],
  ['list omits created user', { 'list:200': { body: '[]' } }],
  ['get returns different user', { 'get:200': { body: '{}' } }],
  ['patch returns stale state', { 'patch:200': { body: '{}' } }],
  ['duplicate email accepted', { 'create:409': { status: 201 } }],
  ['missing user exposes detail', { 'get:404': { body: '{"code":"user_not_found","detail":"internal"}' } }],
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
      const result = await runBruno(fixture.baseUrl, { env: fixtureEnv });
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124);
      assert.ok(!result.output.includes(fixtureEnv.ERBAS_TEST_PASSWORD));
      assert.ok(!result.output.includes('synthetic.token_123'));
    } finally { await fixture.close(); }
  });
}

test('runner rejects tokens belonging to disabled users', { timeout: 15000 }, async () => {
  const fixture = await startFixture({ acceptDisabledTokens: true });
  try {
    const result = await runBruno(fixture.baseUrl, { env: fixtureEnv });
    assert.notEqual(result.code, 0, result.output);
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
      await patch('synthetic-admin', body, 409, { code: 'last_admin' });
    }
    const response = await fetch(`${fixture.baseUrl}/api/users`, { method: 'POST', headers,
      body: JSON.stringify({ email: 'second-admin@example.test', password: 'synthetic-password', admin: true }) });
    assert.equal(response.status, 201);
    const second = await response.json();
    await patch(second.id, { enabled: false }, 200, { ...second, enabled: false });
    await patch('synthetic-admin', { admin: false }, 409, { code: 'last_admin' });
    await patch(second.id, { enabled: true }, 200, second);
    await patch('synthetic-admin', { enabled: false }, 200,
      { id: 'synthetic-admin', email: fixtureEnv.ERBAS_TEST_EMAIL, enabled: false, admin: true });
    const disabled = await fetch(`${fixture.baseUrl}/api/auth/me`, { headers });
    assert.equal(disabled.status, 401);
    assert.deepEqual(await disabled.json(), { code: 'unauthorized' });
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

test('documented Bruno request and named-check counts match the sole collection', async () => {
  const files = (await readdir('/runner/bruno')).filter(file => file.endsWith('.bru'));
  assert.equal(files.length, 67);
  let checks = 0;
  for (const file of files) checks += ((await readFile(join('/runner/bruno', file), 'utf8')).match(/\btest\("/g) ?? []).length;
  assert.equal(checks, 253);
});
