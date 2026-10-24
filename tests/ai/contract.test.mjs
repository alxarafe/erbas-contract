import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bundleOpenApi } from '../support/openapi.mjs';
import {
  AI_ID, assistantPath, assistantPermission, assistantMessageMaximum,
  assistantUnavailable, assistantExecutionFailed, moduleDisabled
} from '../fixtures/modules/ai/assistant.mjs';
import { capabilityIdPattern } from '../fixtures/capabilities.mjs';
import { WMS_ID } from '../fixtures/modules/wms/catalogues.mjs';

test('AI-001 OpenAPI exposes one closed, provider-agnostic assistant operation', async () => {
  const api = await bundleOpenApi({ dereferenced: true });
  const operation = api.paths[assistantPath].post;
  assert.deepEqual(operation.security, [{ bearerAuth: [] }]);
  assert.deepEqual(Object.keys(operation.responses).sort(), ['200', '400', '401', '403', '500', '503']);
  const schemas = api.components.schemas;
  const request = operation.requestBody.content['application/json'].schema;
  assert.equal(operation.requestBody.required, true);
  assert.equal(request.additionalProperties, false);
  assert.deepEqual(request.required, ['message']);
  assert.deepEqual(Object.keys(request.properties), ['message']);
  assert.equal(request.properties.message.type, 'string');
  assert.equal(request.properties.message.minLength, 1);
  assert.equal(request.properties.message.maxLength, assistantMessageMaximum);
  assert.equal(request.properties.message.pattern, '\\S');
  assert.deepEqual(request.properties.message.not, { pattern: '[\\u0000\\uD800-\\uDFFF]' });

  const result = operation.responses['200'].content['application/json'].schema;
  assert.equal(result.additionalProperties, false);
  assert.deepEqual(result.required, ['invocationId', 'answer', 'toolsUsed']);
  assert.deepEqual(Object.keys(result.properties), result.required);
  assert.equal(result.properties.invocationId.type, 'string');
  assert.equal(result.properties.invocationId.minLength, 1);
  assert.equal(result.properties.answer.type, 'string');
  assert.equal(result.properties.answer.minLength, 1);
  assert.deepEqual(result.properties.toolsUsed.items, schemas.AiAssistantToolUsage);
  assert.deepEqual(schemas.AiAssistantCapabilityUsage.required, ['capabilityId', 'invocationId']);
  assert.deepEqual(Object.keys(schemas.AiAssistantCapabilityUsage.properties), schemas.AiAssistantCapabilityUsage.required);
  assert.deepEqual(schemas.AiAssistantCapabilityUsage.properties.capabilityId, schemas.CapabilityId);
  assert.equal(schemas.AiAssistantCapabilityUsage.properties.invocationId.type, 'string');
  assert.equal(schemas.AiAssistantCapabilityUsage.properties.invocationId.minLength, 1);

  assert.deepEqual(schemas.AiAssistantToolUsage.oneOf, [schemas.AiAssistantCapabilityUsage, schemas.AiAssistantPrimitiveUsage]);
  assert.equal(schemas.AiAssistantCapabilityUsage.additionalProperties, false);
  assert.equal(schemas.AiAssistantPrimitiveUsage.additionalProperties, false);
  assert.deepEqual(schemas.AiAssistantPrimitiveUsage.required, ['primitiveId', 'invocationId']);
  assert.deepEqual(Object.keys(schemas.AiAssistantPrimitiveUsage.properties), ['primitiveId', 'invocationId']);
  assert.equal(schemas.AiAssistantPrimitiveUsage.properties.primitiveId.pattern, schemas.CapabilityId.pattern);
  assert.equal(schemas.AiAssistantPrimitiveUsage.properties.invocationId.minLength, 1);

  for (const [status, name] of [['400', 'InvalidLoginRequest'], ['401', 'Unauthorized'], ['403', 'Forbidden']]) {
    assert.deepEqual(operation.responses[status].content['application/json'].schema, schemas[name]);
  }
  assert.equal(operation.responses['400'].description, 'Malformed JSON or a structurally invalid assistant request after authorization and module gating. WWW-Authenticate must be absent.');
  assert.equal(operation.responses['403'].description, 'Authenticated user does not possess ai.assistant.invoke. WWW-Authenticate must be absent.');
  for (const [status, name, code] of [['500', 'AiAssistantExecutionFailed', assistantExecutionFailed]]) {
    const failure = schemas[name];
    assert.deepEqual(operation.responses[status].content['application/json'].schema, failure);
    assert.equal(failure.allOf[1].properties.code.const, code);
    const detail = failure.allOf[1].properties.errors;
    assert.equal(detail.minItems, 1);
    assert.equal(detail.maxItems, 1);
    assert.equal(detail.items.allOf[1].properties.code.const, code);
    assert.equal(operation.responses[status].headers['Cache-Control'].schema.const, 'no-store');
    assert.equal(operation.responses[status].headers['WWW-Authenticate'], undefined);
  }
  const unavailable = schemas.AiAssistantUnavailable;
  assert.equal(unavailable.allOf[1].properties.code.const, assistantUnavailable);
  assert.equal(unavailable.allOf[1].properties.errors.items.allOf[1].properties.code.const, assistantUnavailable);
  const disabled = schemas.ModuleDisabled;
  assert.equal(disabled.allOf[1].properties.code.const, moduleDisabled);
  const combined = operation.responses['503'].content['application/json'].schema;
  assert.deepEqual(combined.oneOf, [disabled, unavailable]);
  assert.equal(operation.responses['503'].headers['Cache-Control'].schema.const, 'no-store');
  assert.equal(operation.responses['503'].headers['WWW-Authenticate'], undefined);
  assert.equal(operation.responses['200'].headers['Cache-Control'].schema.const, 'no-store');
  assert.equal(operation.responses['200'].headers['WWW-Authenticate'], undefined);
});

test('AI-001 Bruno and fixture constants match normative contract values', async () => {
  const api = await bundleOpenApi({ dereferenced: true });
  const folder = await readFile('/runner/bruno/modules/ai/assistant/folder.bru', 'utf8');
  for (const [name, value] of Object.entries({
    assistantPath,
    AI_ID,
    WMS_ID,
    capabilityIdPattern: api.components.schemas.CapabilityId.pattern,
    assistantMessageMaximum
  })) assert.ok(folder.includes(`  ${name}: ${value}`), name);
  assert.equal(assistantPermission, 'ai.assistant.invoke');
  assert.equal(api.components.schemas.AiAssistantInvocationRequest.properties.message.description.includes('4000'), true);
  assert.equal(api.components.schemas.AiAssistantInvocationRequest.properties.message.description.includes('Unicode scalar'), true);
  assert.equal(api.components.schemas.AiAssistantInvocation.properties.toolsUsed.description.includes('execution order'), true);
});

test('AI-001 contract sources contain no provider or model selection fields', async () => {
  const source = await readFile('/runner/openapi/modules/ai/contract.yaml', 'utf8');
  assert.doesNotMatch(source, /\b(?:groq|qwen|openai|anthropic|api[_-]?key|temperature|reasoning[_ -]?effort)\b/i);
  assert.doesNotMatch(source, /\b(?:model|provider|history|conversationId|prompt)\s*:/i);
});
