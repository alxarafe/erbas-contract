import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { startServer } from '../fixtures/server.mjs';

const fixtures = JSON.parse(await readFile(new URL('../fixtures/modules/ai/provider-exchanges.json', import.meta.url)));
const nativeProfile = 'ollama-native';
const syntheticTimeoutMs = 2000;

// Test-only checks of the published specimens, not a production protocol decoder
// or a provider certification harness. CORE validation remains backend-owned.
function completion(profile, body) {
  assert.ok(body && !Object.hasOwn(body, 'error'));
  const native = profile.id === nativeProfile;
  if (native) assert.equal(body.done, true);
  else {
    assert.ok(Array.isArray(body.choices) && body.choices.length > 0);
    assert.notEqual(body.choices[0].finish_reason, 'length');
  }
  const message = native ? body.message : body.choices[0].message;
  assert.equal(message?.role, 'assistant');
  if (message.tool_calls !== undefined) assert.ok(Array.isArray(message.tool_calls));
  if (message.tool_calls?.length) {
    assert.equal(message.tool_calls.length, 1, 'these MVP specimens are sequential');
    const call = message.tool_calls[0];
    if (!native) {
      assert.equal(call.type, 'function');
      assert.equal(typeof call.id, 'string');
      assert.ok(call.id.length > 0);
    }
    assert.equal(typeof call.function.name, 'string');
    assert.ok(call.function.name.length > 0);
    if (!native) assert.equal(typeof call.function.arguments, 'string');
    const argumentsObject = native ? call.function.arguments : JSON.parse(call.function.arguments);
    assert.ok(argumentsObject && typeof argumentsObject === 'object' && !Array.isArray(argumentsObject));
    return { message, call, argumentsObject };
  }
  assert.equal(typeof message.content, 'string');
  assert.ok(message.content.trim());
  return { message };
}

function syntheticArguments(input) {
  assert.ok(Object.keys(input).every(key => Object.hasOwn(fixtures.toolSchema.properties, key)));
  if (Object.hasOwn(input, 'limit')) {
    const rule = fixtures.toolSchema.properties.limit;
    assert.ok(Number.isInteger(input.limit));
    assert.ok(input.limit >= rule.minimum && input.limit <= rule.maximum);
  }
}

for (const profile of fixtures.profiles) {
  test(`${profile.id}: text, schema and correlated READ history preserve actual synthetic evidence`, async () => {
    assert.ok(completion(profile, profile.text.response).message.content);
    const request = profile.read.request;
    assert.equal(request.model, profile.text.request.model);
    assert.equal(request.stream, false);
    assert.deepEqual(request.tools[0].function.parameters, fixtures.toolSchema);
    assert.equal(request.tools[0].type, 'function');
    const parsed = completion(profile, profile.read.response);
    assert.equal(parsed.call.function.name, request.tools[0].function.name);
    syntheticArguments(parsed.argumentsObject);
    const history = profile.read.followUp.messages;
    assert.deepEqual(history.slice(0, request.messages.length), request.messages);
    assert.deepEqual(history.at(-2), parsed.message);
    assert.equal(history.at(-1).role, 'tool');
    assert.equal(history.at(-1).tool_call_id, parsed.call.id);
    if (profile.id === nativeProfile) assert.equal(history.at(-1).tool_name, parsed.call.function.name);
    assert.deepEqual(JSON.parse(history.at(-1).content).items, fixtures.records);
    const final = completion(profile, profile.read.final).message.content;
    for (const record of fixtures.records) {
      assert.ok(final.includes(record.code));
      assert.ok(final.includes(record.label));
    }
  });

  test(`${profile.id}: invalid argument types remain invalid, never repaired implicitly`, () => {
    const parsed = completion(profile, profile.invalidArguments.response);
    assert.equal(typeof parsed.argumentsObject.limit, 'string');
    const original = structuredClone(parsed.argumentsObject);
    assert.throws(() => syntheticArguments(parsed.argumentsObject));
    assert.deepEqual(parsed.argumentsObject, original);
    assert.throws(() => syntheticArguments({ unexpected: true }));
    assert.throws(() => syntheticArguments({ limit: fixtures.toolSchema.properties.limit.maximum + 1 }));
    syntheticArguments({});
  });

  test(`${profile.id}: malformed or incomplete responses cannot become tool executions`, () => {
    for (const body of profile.malformedResponses) assert.throws(() => completion(profile, body));
    if (profile.id === nativeProfile) {
      const body = structuredClone(profile.read.response);
      delete body.message.tool_calls[0].id;
      assert.ok(completion(profile, body).call, 'native IDs may be absent; name/order correlation must be handled by adapters');
    } else {
      const body = structuredClone(profile.read.response);
      delete body.choices[0].message.tool_calls[0].id;
      assert.throws(() => completion(profile, body));
    }
  });

  test(`${profile.id}: local HTTP exchange, unavailability and connection loss need no external service`, { timeout: syntheticTimeoutMs * 4 }, async () => {
    const exchanges = [
      { request: profile.text.request, status: 200, body: profile.text.response },
      { request: profile.read.request, status: 200, body: profile.read.response },
      { request: profile.read.followUp, status: 200, body: profile.read.final },
      ...profile.httpErrors.map(error => ({ request: profile.read.request, ...error }))
    ];
    const received = [];
    const server = await startServer(async (request, response, url) => {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      received.push({ method: request.method, path: url.pathname, body: JSON.parse(Buffer.concat(chunks)) });
      const exchange = exchanges[received.length - 1];
      if (received.length === exchanges.length + 2) return; // Explicit no-response timeout specimen.
      if (!exchange) { request.socket.destroy(); return; }
      response.writeHead(exchange.status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(exchange.body));
    }, { requests: received, faultsReached: [] });
    const send = request => fetch(server.baseUrl + profile.path, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(syntheticTimeoutMs) });
    try {
      for (const exchange of exchanges) {
        const response = await send(exchange.request);
        assert.equal(response.status, exchange.status);
        assert.deepEqual(await response.json(), exchange.body);
        assert.deepEqual(received.at(-1), { method: 'POST', path: profile.path, body: exchange.request });
        if (!response.ok) assert.ok(Object.hasOwn(exchange.body, 'error'));
      }
      assert.equal(profile.transportFailure, 'connection-closed');
      await assert.rejects(send(profile.read.request));
      await assert.rejects(fetch(server.baseUrl + profile.path, { method: 'POST',
        body: JSON.stringify(profile.read.request), signal: AbortSignal.timeout(50) }), { name: 'TimeoutError' });
    } finally { await server.close(); }
  });
}
