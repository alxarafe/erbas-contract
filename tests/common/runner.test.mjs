import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runBrunoScenario } from '../support/scenarios.mjs';
import { authScenarios } from '../core/scenarios.mjs';
import { mutationTestTimeoutMs } from '../support/constants.mjs';
import { normalizeBaseUrl, requireCredentials } from '../../scripts/conformance.mjs';
import { runProcess } from '../../scripts/process.mjs';
import { validateOpenApi } from '../../scripts/validate.mjs';
import { startFixture, fixtureEnv } from '../fixtures/core.mjs';
test('credentials are mandatory and never included in validation errors', () => {
  for (const env of [{}, { ERBAS_TEST_EMAIL: 'synthetic' }, { ERBAS_TEST_PASSWORD: 'synthetic' }]) {
    assert.throws(() => requireCredentials(env), /required for full conformance/);
  }
  requireCredentials(fixtureEnv);
});

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

for (const errorFault of ['missing-errors', 'empty-errors', 'malformed-detail']) {
  test(`runner rejects canonical error envelope fault: ${errorFault}`, { timeout: mutationTestTimeoutMs }, async () => {
    const fixture = await startFixture({ errorFault });
    try {
      const result = await runBrunoScenario(fixture.baseUrl, authScenarios[401], { env: fixtureEnv });
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124);
      assert.ok(fixture.faultsReached.includes(errorFault));
      assert.equal(fixture.requests.at(-1).expected, 401, 'legacy invalid credentials status remains unchanged');
    } finally { await fixture.close(); }
  });
}
