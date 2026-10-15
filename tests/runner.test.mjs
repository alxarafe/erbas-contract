import test from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startFixture, fixtureEnv, disabledTokenFault, userCollection, fixtureModules, modulesPath, moduleNotFound, moduleDependencyConflict, MATH_ID, STATISTICS_ID, maximumCollectionLimit } from './fixtures/http-server.mjs';
import { runBruno, conformanceScopes, normalizeBaseUrl, requireCredentials } from '../scripts/conformance.mjs';
import { validateOpenApi } from '../scripts/validate.mjs';
import { runProcess } from '../scripts/process.mjs';
import { WMS_ID, uomsPath, storageAttributesPath, storageAttributeCodePattern, storageAttributeCodeConflict } from './fixtures/http-server.mjs';

const publishedRequestCount = 130;
const wmsRequestCount = 52;
const storageAttributeRequestCount = 84;
const v060RequestCount = publishedRequestCount + wmsRequestCount;
const fullRequestCount = v060RequestCount + storageAttributeRequestCount;
const v060NamedCheckCount = 714;
const fullNamedCheckCount = v060NamedCheckCount + storageAttributeRequestCount * 4;

// Allow the 45-second full-suite Bruno watchdog plus cleanup time on slower
// hosted runners. Short runs keep their existing test budgets.
const fullSuiteTestTimeoutMs = 50000;

for (const wmsFault of ['accepted-duplicate', 'lost-state', 'order', 'unicode-length',
  'gate-before-auth', 'ignored-gate', 'extra', 'pagination',
  'untrimmed-description', 'untrimmed-persistence', 'length-before-trim']) {
  test(`runner rejects WMS fault: ${wmsFault}`, { timeout: 15000 }, async () => {
    const fixture = await startFixture({ wmsFault });
    try {
      const result = await runBruno(fixture.baseUrl, { env: fixtureEnv, scope: conformanceScopes.wms });
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124, 'watchdog must not hide the target fault');
      assert.ok(fixture.faultsReached.includes(wmsFault), 'configured WMS defect must be reached');
      assert.equal(fixture.requests.at(-1).path.split('?')[0], uomsPath);
      if (wmsFault === 'untrimmed-persistence') assert.equal(fixture.requests.at(-1).method, 'GET');
      if (['untrimmed-description', 'length-before-trim'].includes(wmsFault)) {
        assert.equal(fixture.requests.at(-1).method, 'POST');
      }
      assert.ok(!result.output.includes(fixtureEnv.ERBAS_TEST_PASSWORD));
      assert.ok(!result.output.includes('synthetic.token_123'));
      assert.ok(fixture.requests.every(r => !r.path.includes('/api/users?')
        && (!r.path.startsWith(modulesPath) || r.path === `${modulesPath}/${WMS_ID}`)));
    } finally { await fixture.close(); }
  });
}

test('credentials are mandatory and never included in validation errors', () => {
  for (const env of [{}, { ERBAS_TEST_EMAIL: 'synthetic' }, { ERBAS_TEST_PASSWORD: 'synthetic' }]) {
    assert.throws(() => requireCredentials(env), /required for full conformance/);
  }
  requireCredentials(fixtureEnv);
});

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
    assert.equal(fixture.requests.slice(v060RequestCount).length, storageAttributeRequestCount);
    assert.ok(fixture.requests.slice(v060RequestCount).every(r => r.path.startsWith(storageAttributesPath) || r.path === `${modulesPath}/${WMS_ID}`));
    const response = await fetch(`${fixture.baseUrl}${modulesPath}`, { headers: { Authorization: 'Bearer synthetic.token_123' } });
    assert.ok((await response.json()).items.every(module => module.enabled));
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
      const result = await runBruno(fixture.baseUrl, { env: fixtureEnv, scope: conformanceScopes.auth });
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124);
      assert.ok(fixture.faultsReached.includes(Object.keys(auth)[0]), 'fault must reach the targeted AUTH response');
      assert.ok(fixture.requests.every(request => request.path === '/api/auth/login'), 'AUTH scope must exclude other groups');
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
  test(name, { timeout: success ? fullSuiteTestTimeoutMs : 15000 }, async () => {
    const fixture = await startFixture(fixtureOptions);
    try {
      const started = Date.now();
      const result = await runBruno(fixture.baseUrl, { env: fixtureEnv, scope: conformanceScopes.health });
      if (success) assert.equal(result.code, 0, result.output);
      else assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124, 'CLI watchdog hid the expected HTTP test result');
      assert.equal(fixture.requests.filter(r => r.path === '/health' || r.path === '/target').length, 1, 'Health must not be retried or redirected');
      assert.equal(fixture.requests.length, 1, 'Health scope must exclude other groups');
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
  ['list returns a bare array', { 'list:200': { body: '[]' } }],
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
  const files = (await readdir('/runner/bruno', { recursive: true }))
    .filter(file => file.endsWith('.bru') && !file.endsWith('folder.bru'));
  assert.equal(files.length, fullRequestCount);
  let checks = 0;
  const moduleChecks = ((await readFile('/runner/bruno/modules/folder.bru', 'utf8')).match(/\btest\("/g) ?? []).length;
  const wmsChecks = ((await readFile('/runner/bruno/wms/folder.bru', 'utf8')).match(/\btest\("/g) ?? []).length;
  const storageChecks = ((await readFile('/runner/bruno/storage-attributes/folder.bru', 'utf8')).match(/\btest\("/g) ?? []).length;
  const sequences = [];
  for (const file of files) {
    const source = await readFile(join('/runner/bruno', file), 'utf8');
    checks += (source.match(/\btest\("/g) ?? []).length;
    if (file.startsWith('modules/')) checks += moduleChecks;
    if (file.startsWith('wms/')) checks += wmsChecks;
    if (file.startsWith('storage-attributes/')) checks += storageChecks;
    sequences.push(Number(source.match(/seq: (\d+)/)[1]));
  }
  assert.equal(checks, fullNamedCheckCount);
  assert.deepEqual(sequences.sort((a, b) => a - b), Array.from({ length: files.length }, (_, i) => i + 1));
});

for (const collectionFault of ['total', 'limit', 'offset', 'order', 'window', 'negative-offset',
  'excessive-limit', 'extra', 'order-extra']) {
  const timeout = ['offset', 'window', 'negative-offset', 'excessive-limit'].includes(collectionFault)
    ? fullSuiteTestTimeoutMs : 15000;
  test(`runner rejects collection fault: ${collectionFault}`, { timeout }, async () => {
    const fixture = await startFixture({ collectionFault });
    try {
      const result = await runBruno(fixture.baseUrl, { env: fixtureEnv, scope: conformanceScopes.collections });
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


test('canonical module IDs agree with Bruno and require no ID environment variables', async () => {
  const folder = await readFile('/runner/bruno/modules/folder.bru', 'utf8');
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
  ['missing module body', { modules: { 'patch:404': { body: '{"code":"user_not_found"}' } } }],
  ['dependency conflict body', { modules: { 'patch:409': { body: '{"code":"conflict"}' } } }],
  ['missing module no-store', { modules: { 'list:200': { headers: { 'Cache-Control': 'public' } } } }],
  ['module challenge on success', { modules: { 'patch:200': { headers: { 'WWW-Authenticate': 'Bearer' } } } }]
];

for (const [name, options] of moduleFailures) {
  test(`runner rejects module fault: ${name}`, { timeout: fullSuiteTestTimeoutMs }, async () => {
    const fixture = await startFixture(options);
    try {
      const result = await runBruno(fixture.baseUrl, { env: fixtureEnv, scope: conformanceScopes.modules });
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124);
      assert.ok(fixture.requests.at(-1).path.startsWith(modulesPath), 'fault must reach module administration');
      const target = options.moduleFault ?? Object.keys(options.modules)[0];
      assert.ok(fixture.faultsReached.includes(target), 'fault must reach the targeted module operation');
      if (name.endsWith('-absent')) {
        assert.equal(fixture.requests.at(-1).path,
          `${modulesPath}?offset=0&limit=${maximumCollectionLimit}`,
          'absence must fail GET descriptor discovery, not an unrelated assertion');
      }
      assert.ok(!result.output.includes(fixtureEnv.ERBAS_TEST_PASSWORD));
    } finally { await fixture.close(); }
  });
}

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
    assert.deepEqual(items.map(module => module.id), [MATH_ID, STATISTICS_ID, WMS_ID]);
    assert.ok(items.every(module => module.enabled));
  } finally { await fixture.close(); }
});

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
    assert.deepEqual(await changedCase.json(), { code: moduleNotFound });
    const conflict = await patch(MATH_ID, false);
    assert.equal(conflict.status, 409);
    assert.deepEqual(await conflict.json(), { code: moduleDependencyConflict });
    const response = await fetch(`${fixture.baseUrl}${modulesPath}?limit=1&offset=1`, { headers });
    assert.deepEqual(await response.json(), userCollection(fixtureModules(), 1, 1));
    const original = await fetch(`${fixture.baseUrl}${modulesPath}`, { headers });
    assert.ok((await original.json()).items.every(module => module.enabled));
  } finally { await fixture.close(); }
});


for (const [storageAttributeFault, targetSequence, method] of [
  ['accepted-duplicate', 197, 'POST'], ['ignored-gate', 189, 'GET'],
  ['order', 196, 'GET'], ['pagination', 183, 'GET'],
  ['unicode-length', 194, 'POST'], ['untrimmed-description', 194, 'POST'],
  ['length-before-trim', 194, 'POST'], ['untrimmed-persistence', 196, 'GET'],
  ['normalized-code', 210, 'POST'], ['accepted-extra', 215, 'POST']
]) {
  test(`runner rejects Storage Attribute fault: ${storageAttributeFault}`, { timeout: 15000 }, async () => {
    const fixture = await startFixture({ storageAttributeFault });
    try {
      const result = await runBruno(fixture.baseUrl, { env: fixtureEnv, scope: conformanceScopes.storageAttributes });
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124, 'watchdog must not hide the defect');
      assert.ok(fixture.faultsReached.includes(storageAttributeFault));
      const bootstrapRequests = 3;
      const firstStorageSequence = v060RequestCount + 1;
      assert.equal(fixture.requests.length, bootstrapRequests + targetSequence - firstStorageSequence + 1);
      assert.equal(fixture.requests.at(-1).path.split('?')[0], storageAttributesPath);
      assert.equal(fixture.requests.at(-1).method, method);
      assert.ok(fixture.requests.every(r => !r.path.startsWith(uomsPath)));
    } finally { await fixture.close(); }
  });
}

test('WMS-002 OpenAPI is additive and precisely defines the shared catalogue', async () => {
  const source = await readFile('/runner/openapi/erbas.yaml', 'utf8');
  const directory = await mkdtemp(join(tmpdir(), 'erbas-schema-'));
  let api;
  try {
    const bundled = join(directory, 'contract.json');
    const result = await runProcess(process.execPath, [
      '/runner/node_modules/@redocly/cli/bin/cli.js', 'bundle', '/runner/openapi/erbas.yaml',
      '--output', bundled, '--ext', 'json'
    ], { timeoutMs: 30000, capture: true });
    assert.equal(result.code, 0, result.output);
    api = JSON.parse(await readFile(bundled, 'utf8'));
  } finally { await rm(directory, { recursive: true, force: true }); }
  const schemas = api.components.schemas;
  const responses = api.components.responses;
  const ref = name => ({ $ref: `#/components/schemas/${name}` });
  assert.equal(api.info.version, '0.7.0');
  const operations = api.paths[storageAttributesPath];
  assert.deepEqual(Object.keys(operations).sort(), ['get', 'post']);
  assert.ok(!Object.keys(api.paths).some(path => path.startsWith(storageAttributesPath + '/')));
  for (const operation of Object.values(operations)) {
    assert.deepEqual(operation.security, [{ bearerAuth: [] }]);
    for (const [status, response] of Object.entries({400: 'InvalidRequest', 401: 'Unauthorized', 403: 'Forbidden', 503: 'WmsDisabled'})) {
      assert.deepEqual(operation.responses[status], { $ref: `#/components/responses/${response}` });
    }
    assert.match(operation.description, /Administrator only/);
    assert.match(operation.description, /erbas.wms enabled/);
  }
  assert.deepEqual(operations.get.parameters, ['Offset', 'Limit'].map(name => ({ $ref: `#/components/parameters/${name}` })));
  assert.equal(operations.post.parameters, undefined);
  assert.deepEqual(operations.post.requestBody.content['application/json'].schema, ref('CreateWmsStorageAttribute'));
  for (const [status, response, schema, method] of [
    ['200', 'WmsStorageAttributeList', 'WmsStorageAttributeCollection', 'get'],
    ['201', 'CreatedWmsStorageAttribute', 'WmsStorageAttribute', 'post'],
    ['409', 'WmsStorageAttributeCodeConflict', 'WmsStorageAttributeCodeConflict', 'post']
  ]) {
    assert.deepEqual(operations[method].responses[status], { $ref: `#/components/responses/${response}` });
    assert.deepEqual(responses[response].content['application/json'].schema, ref(schema));
    assert.equal(responses[response].headers['Cache-Control'].schema.const, 'no-store');
  }
  for (const [name, fields] of [
    ['CreateWmsStorageAttribute', ['code', 'name']], ['WmsStorageAttribute', ['id', 'code', 'name']],
    ['WmsStorageAttributeCollection', ['items', 'offset', 'limit', 'total', 'order']],
    ['WmsStorageAttributeCodeConflict', ['code']]
  ]) {
    assert.equal(schemas[name].additionalProperties, false);
    assert.deepEqual(schemas[name].required, fields);
    assert.deepEqual(Object.keys(schemas[name].properties), fields);
  }
  assert.equal(schemas.WmsStorageAttributeCode.pattern, storageAttributeCodePattern.source);
  assert.equal(schemas.WmsStorageAttributeCode.maxLength, 30);
  assert.equal(schemas.WmsStorageAttributeCode.minLength, 1);
  assert.equal(schemas.WmsStorageAttributeName.maxLength, 255);
  assert.equal(schemas.WmsStorageAttributeName.minLength, 1);
  assert.equal(schemas.WmsStorageAttributeNameInput.maxLength, undefined);
  assert.equal(schemas.WmsStorageAttributeName.not.pattern, '\\u0000');
  assert.match(schemas.WmsStorageAttributeName.description, /unpaired surrogates/);
  assert.deepEqual(schemas.WmsStorageAttribute.properties.id, ref('WmsEntityId'));
  assert.equal(schemas.WmsEntityId.format, 'uuid');
  assert.deepEqual(schemas.WmsStorageAttributeCollection.properties.order, schemas.WmsUomCollection.properties.order);
  for (const field of ['offset', 'limit', 'total']) assert.deepEqual(schemas.WmsStorageAttributeCollection.properties[field], schemas.WmsUomCollection.properties[field]);
  assert.equal(schemas.WmsStorageAttributeCodeConflict.properties.code.const, storageAttributeCodeConflict);
  // The sole v0.6.0 schema change is equivalent UUID component extraction.
  let preserved = source.slice(source.indexOf('paths:\n'));
  preserved = preserved.replace(/  \/api\/wms\/storage-attributes:[\s\S]*?(?=components:\n)/, '');
  preserved = preserved.replace(/    CreatedWmsStorageAttribute:[\s\S]*?(?=    WmsDisabled:)/, '');
  preserved = preserved.replace(/    WmsEntityId:[\s\S]*?(?=    ModuleDisabled:)/, '');
  const uuidSource = source.slice(source.indexOf('    WmsEntityId:\n') + '    WmsEntityId:\n'.length, source.indexOf('    WmsStorageAttributeCode:\n'));
  preserved = preserved.replace("          $ref: '#/components/schemas/WmsEntityId'\n", () => uuidSource.split('\n').filter(Boolean).map(line => '    ' + line + '\n').join(''));
  assert.equal(createHash('sha256').update(preserved).digest('hex'), 'e3783894ef2a92278fade1ebc6b115af5e16053bea9e184fa565bce6ed10ab8c');
});
