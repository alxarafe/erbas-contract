import test from 'node:test';
import assert from 'node:assert/strict';
import { runBrunoScenario } from '../support/scenarios.mjs';
import { mutationTestTimeoutMs } from '../support/constants.mjs';
import { administratorBootstrap } from '../../scripts/conformance/core.mjs';
import { startFixture, fixtureEnv } from '../fixtures/composed.mjs';
import { assistantToken } from '../fixtures/core.mjs';
import { WMS_ID } from '../fixtures/modules/wms/catalogues.mjs';
import {
  AI_ID, assistantPath, assistantUnavailable, assistantExecutionFailed, moduleDisabled,
  directMessage, oneToolMessage, multipleToolsMessage
} from '../fixtures/modules/ai/assistant.mjs';

const adminHeaders = { Authorization: 'Bearer synthetic.token_123', 'Content-Type': 'application/json' };
const url = baseUrl => `${baseUrl}${assistantPath}`;
const envelope = code => ({ code, errors: [{ code }] });

async function invoke(baseUrl, message, headers = adminHeaders) {
  const response = await fetch(url(baseUrl), { method: 'POST', headers, body: JSON.stringify({ message }) });
  return { response, body: await response.json() };
}

async function setModule(baseUrl, id, enabled) {
  const response = await fetch(`${baseUrl}/api/modules/${id}`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ enabled })
  });
  assert.equal(response.status, 200);
}

test('AI assistant returns closed success shapes and successful READ provenance', async () => {
  const fixture = await startFixture();
  try {
    for (const [message, expected] of [
      [directMessage, []],
      [oneToolMessage, ['wms.uoms.list']],
      [multipleToolsMessage, ['wms.uoms.list', 'wms.storage-attributes.list', 'wms.item-families.list']]
    ]) {
      const { response, body } = await invoke(fixture.baseUrl, message);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('www-authenticate'), null);
      assert.deepEqual(Object.keys(body).sort(), ['answer', 'invocationId', 'toolsUsed']);
      assert.equal(typeof body.invocationId, 'string');
      assert.ok(body.invocationId.length > 0);
      assert.equal(typeof body.answer, 'string');
      assert.ok(body.answer.length > 0);
      assert.deepEqual(body.toolsUsed.map(tool => tool.capabilityId), expected);
      const ids = body.toolsUsed.map(tool => tool.invocationId);
      assert.ok(ids.every(id => typeof id === 'string' && id.length > 0));
      assert.equal(new Set(ids).size, ids.length);
      assert.ok(ids.every(id => id !== body.invocationId));
    }
  } finally { await fixture.close(); }
});

test('AI security precedence and module gate are deterministic', async () => {
  const fixture = await startFixture();
  try {
    let result = await invoke(fixture.baseUrl, directMessage, { 'Content-Type': 'application/json' });
    assert.equal(result.response.status, 401);
    assert.equal(result.response.headers.get('www-authenticate'), 'Bearer');
    assert.deepEqual(result.body, envelope('unauthorized'));

    result = await invoke(fixture.baseUrl, directMessage, { Authorization: 'Bearer invalid', 'Content-Type': 'application/json' });
    assert.equal(result.response.status, 401);

    const email = `ai-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
    const password = 'synthetic-ai-password';
    let response = await fetch(`${fixture.baseUrl}/api/users`, {
      method: 'POST', headers: adminHeaders, body: JSON.stringify({ email, password, admin: false })
    });
    assert.equal(response.status, 201);
    response = await fetch(`${fixture.baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
    });
    assert.equal(response.status, 200);
    const userToken = (await response.json()).accessToken;
    result = await invoke(fixture.baseUrl, directMessage, { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' });
    assert.equal(result.response.status, 403);
    assert.deepEqual(result.body, envelope('forbidden'));

    await setModule(fixture.baseUrl, AI_ID, false);
    result = await invoke(fixture.baseUrl, directMessage);
    assert.equal(result.response.status, 503);
    assert.deepEqual(result.body, envelope(moduleDisabled));
    response = await fetch(url(fixture.baseUrl), {
      method: 'POST', headers: adminHeaders, body: '{'
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), envelope(moduleDisabled));
    response = await fetch(url(fixture.baseUrl), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(response.status, 401);
    await setModule(fixture.baseUrl, AI_ID, true);
  } finally { await fixture.close(); }
});

test('AI filters tools by effective module visibility and restores them', async () => {
  const fixture = await startFixture();
  try {
    await setModule(fixture.baseUrl, WMS_ID, false);
    let result = await invoke(fixture.baseUrl, multipleToolsMessage);
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body.toolsUsed, []);
    await setModule(fixture.baseUrl, WMS_ID, true);
    result = await invoke(fixture.baseUrl, oneToolMessage);
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body.toolsUsed.map(tool => tool.capabilityId), ['wms.uoms.list']);
  } finally { await fixture.close(); }
});

test('AI-only authorization does not grant business capability permissions', async () => {
  const fixture = await startFixture({ assistant: true });
  try {
    const headers = { Authorization: `Bearer ${assistantToken}`, 'Content-Type': 'application/json' };
    const result = await invoke(fixture.baseUrl, multipleToolsMessage, headers);
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body.toolsUsed, []);
  } finally { await fixture.close(); }
});

for (const [fault, expectedStatus, expectedCode, message] of [
  ['unavailable', 503, assistantUnavailable, directMessage],
  ['execution-failure', 500, assistantExecutionFailed, directMessage],
  ['tool-failure', 500, assistantExecutionFailed, oneToolMessage],
  ['reevaluate-tool', 500, assistantExecutionFailed, oneToolMessage]
]) {
  test(`AI safe failure: ${fault}`, async () => {
    const fixture = await startFixture({ assistantFault: fault });
    try {
      const result = await invoke(fixture.baseUrl, message);
      assert.equal(result.response.status, expectedStatus);
      assert.deepEqual(result.body, envelope(expectedCode));
      assert.equal(result.response.headers.get('cache-control'), 'no-store');
      assert.equal(result.response.headers.get('www-authenticate'), null);
      assert.ok(fixture.faultsReached.includes(fault));
    } finally { await fixture.close(); }
  });
}

for (const [fault, requests] of [
  ['empty-id', [administratorBootstrap[0], 'modules/ai/assistant/ai-584-direct-answer.bru']],
  ['subject', [administratorBootstrap[0], 'modules/ai/assistant/ai-584-direct-answer.bru']],
  ['extra', [administratorBootstrap[0], 'modules/ai/assistant/ai-584-direct-answer.bru']],
  ['duplicate-id', [administratorBootstrap[0], 'modules/ai/assistant/ai-585-one-tool.bru']],
  ['tool-empty-id', [administratorBootstrap[0], 'modules/ai/assistant/ai-585-one-tool.bru']],
  ['tool-wrong-capability', [administratorBootstrap[0], 'modules/ai/assistant/ai-585-one-tool.bru']],
  ['tool-input', [administratorBootstrap[0], 'modules/ai/assistant/ai-585-one-tool.bru']],
  ['tool-write', [administratorBootstrap[0], 'modules/ai/assistant/ai-585-one-tool.bru']],
  ['tool-unauthorized', [administratorBootstrap[0], 'modules/ai/assistant/ai-585-one-tool.bru']],
  ['tool-order', [administratorBootstrap[0], 'modules/ai/assistant/ai-586-multiple-tools.bru']]
]) {
  test(`Bruno rejects AI defect: ${fault}`, { timeout: mutationTestTimeoutMs }, async () => {
    const fixture = await startFixture({ assistantFault: fault });
    try {
      const result = await runBrunoScenario(fixture.baseUrl, requests, { env: fixtureEnv });
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124);
      assert.ok(fixture.faultsReached.includes(fault));
    } finally { await fixture.close(); }
  });
}
