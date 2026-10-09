import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
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

test('full suite exercises Health and all AUTH-001 scenarios', { timeout: 15000 }, async () => {
  const fixture = await startFixture();
  try {
    const result = await runBruno(fixture.baseUrl, { env: fixtureEnv });
    assert.equal(result.code, 0, result.output);
    assert.equal(fixture.requests.length, 15);
    const login = fixture.requests.slice(1);
    assert.ok(login.every(r => r.method === 'POST' && r.path === '/api/auth/login'
      && r.accept === 'application/json' && r.contentType.toLowerCase() === 'application/json'));
    assert.equal(login.filter(r => r.expected === 200).length, 1);
    assert.equal(login.filter(r => r.expected === 401).length, 3);
    assert.equal(login.filter(r => r.expected === 400).length, 10);
    assert.equal(login.filter(r => r.malformed).length, 1);
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
      assert.equal(fixture.requests.filter(r => r.path !== '/api/auth/login').length, 1, 'Health must not be retried or redirected');
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
