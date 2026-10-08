import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startFixture } from './fixtures/http-server.mjs';
import { runBruno, normalizeBaseUrl } from '../scripts/conformance.mjs';
import { validateOpenApi } from '../scripts/validate.mjs';
import { runProcess } from '../scripts/process.mjs';

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
      const result = await runBruno(fixture.baseUrl, { capture: true });
      if (success) assert.equal(result.code, 0, result.output);
      else assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124, 'CLI watchdog hid the expected HTTP test result');
      assert.equal(fixture.requests.length, 1, 'Request must not be retried or redirected');
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
