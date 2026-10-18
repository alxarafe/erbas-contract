import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bundleOpenApi } from '../../support/openapi.mjs';
import { runBrunoScenario } from '../../support/scenarios.mjs';
import { mutationTestTimeoutMs } from '../../support/constants.mjs';
import { administratorBootstrap } from '../../../scripts/conformance/core.mjs';
import { startFixture, fixtureEnv } from '../../fixtures/composed.mjs';
import { capabilitiesPath, invocationSuffix, capabilityExecutionFailed } from '../../fixtures/capabilities.mjs';
import { uomsPath, storageAttributesPath } from '../../fixtures/modules/wms/catalogues.mjs';
import { itemFamiliesPath } from '../../fixtures/modules/wms/associations.mjs';
import { invocationRequests as requests } from './invocation-scenarios.mjs';

const declarations = JSON.parse(await readFile('/runner/openapi/modules/wms/capabilities.json', 'utf8'));
const fixtureHeaders = { Authorization: 'Bearer synthetic.token_123', 'Content-Type': 'application/json' };
const cataloguePaths = [uomsPath, storageAttributesPath, itemFamiliesPath];
const invocationUrl = (baseUrl, id = declarations[0].id) => `${baseUrl}${capabilitiesPath}/${id}${invocationSuffix}`;

async function seedCatalogues(baseUrl) {
  for (const [index, descriptor] of declarations.entries()) {
    const resource = descriptor.id.split('.')[1];
    for (const code of ['FIRST', 'SECOND', 'THIRD']) {
      const label = resource === 'uoms' ? 'description' : 'name';
      const response = await fetch(`${baseUrl}${cataloguePaths[index]}`, {
        method: 'POST', headers: fixtureHeaders, body: JSON.stringify({ code, [label]: code })
      });
      assert.equal(response.status, 201);
    }
  }
}

test('CORE-CAP-002 OpenAPI reuses input and global errors without changing provider declarations', async () => {
  const api = await bundleOpenApi({ dereferenced: true });
  const operation = api.paths[`${capabilitiesPath}/{capabilityId}${invocationSuffix}`].post;
  assert.deepEqual(operation.security, [{ bearerAuth: [] }]);
  assert.deepEqual(Object.keys(operation.responses).sort(), ['200', '400', '401', '404', '500']);
  const schemas = api.components.schemas;
  const folder = await readFile('/runner/bruno/modules/wms/invocations/folder.bru', 'utf8');
  for (const [name, value] of Object.entries({
    capabilitiesPath, invocationSuffix,
    defaultLimit: api.components.parameters.Limit.schema.default,
    maximumLimit: api.components.parameters.Limit.schema.maximum,
    uomCodePattern: schemas.WmsUomCode.pattern,
    catalogueCodePattern: schemas.WmsCatalogueCode.pattern,
    entityIdPattern: schemas.WmsEntityId.pattern,
    nilUuid: schemas.WmsEntityId.not.const,
    labelMaximum: schemas.WmsCatalogueName.maxLength
  })) assert.ok(folder.includes(`  ${name}: ${value}`), name);
  const input = operation.requestBody.content['application/json'].schema;
  assert.equal(operation.requestBody.required, true);
  assert.equal(input.additionalProperties, false);
  assert.deepEqual(input.required, ['input']);
  assert.deepEqual(Object.keys(input.properties), ['input']);
  assert.deepEqual(input.properties.input, schemas.CapabilityListInput);
  const result = operation.responses['200'].content['application/json'].schema;
  assert.equal(result.additionalProperties, false);
  assert.deepEqual(result.required, ['invocationId', 'capabilityId', 'output']);
  assert.deepEqual(Object.keys(result.properties), result.required);
  assert.deepEqual(result.properties.invocationId.type, 'string');
  assert.equal(result.properties.invocationId.minLength, 1);
  assert.deepEqual(result.properties.capabilityId, schemas.CapabilityId);
  for (const [status, schema] of [['400', 'InvalidLoginRequest'], ['401', 'Unauthorized'], ['404', 'CapabilityNotFound'], ['500', 'CapabilityExecutionFailed']]) {
    assert.deepEqual(operation.responses[status].content['application/json'].schema, schemas[schema]);
  }
  const failure = schemas.CapabilityExecutionFailed;
  assert.deepEqual(failure.allOf[0], schemas.ErrorResponse);
  assert.equal(failure.allOf[1].properties.code.const, capabilityExecutionFailed);
  const detail = failure.allOf[1].properties.errors;
  assert.equal(detail.minItems, 1);
  assert.equal(detail.maxItems, 1);
  assert.equal(detail.items.additionalProperties, false);
  assert.deepEqual(detail.items.properties, { code: { const: capabilityExecutionFailed } });
  assert.equal(operation.responses['500'].headers['Cache-Control'].schema.const, 'no-store');
  assert.equal(operation.responses['500'].headers['WWW-Authenticate'], undefined);
  for (const [index, descriptor] of declarations.entries()) {
    assert.equal(descriptor.effect, 'read');
    assert.deepEqual(schemas[descriptor.inputSchema.$ref.split('/').at(-1)], input.properties.input);
    assert.deepEqual(schemas[descriptor.outputSchema.$ref.split('/').at(-1)],
      api.paths[cataloguePaths[index]].get.responses['200'].content['application/json'].schema);
  }
});

test('shared Bruno invocation suite accepts populated catalogues, security precedence and disable/restore', { timeout: mutationTestTimeoutMs * 2 }, async () => {
  const fixture = await startFixture();
  try {
    await seedCatalogues(fixture.baseUrl);
    const scenario = [...administratorBootstrap, ...Object.values(requests)];
    const result = await runBrunoScenario(fixture.baseUrl, scenario, { env: fixtureEnv });
    assert.equal(result.code, 0, result.output);
    assert.equal(fixture.requests.length, scenario.length + declarations.length * 3);
  } finally { await fixture.close(); }
});

for (const invocationFault of ['wrong-id', 'empty-id', 'extra', 'output', 'pagination']) {
  test(`Bruno rejects invocation defect: ${invocationFault}`, { timeout: mutationTestTimeoutMs }, async () => {
    const fixture = await startFixture({ invocationFault });
    try {
      await seedCatalogues(fixture.baseUrl);
      const result = await runBrunoScenario(fixture.baseUrl,
        [administratorBootstrap[0], requests['uoms-default-baseline'], requests['uoms-default']], { env: fixtureEnv });
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124);
      assert.ok(fixture.faultsReached.includes(invocationFault));
    } finally { await fixture.close(); }
  });
}

for (const executionFailure of ['provider-exception', 'invalid-provider-output']) {
  test(`execution failure is safely indistinguishable: ${executionFailure}`, async () => {
    const fixture = await startFixture({ executionFailure });
    try {
      const response = await fetch(invocationUrl(fixture.baseUrl), {
        method: 'POST', headers: fixtureHeaders, body: JSON.stringify({ input: {} })
      });
      assert.equal(response.status, 500);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('www-authenticate'), null);
      assert.deepEqual(await response.json(), { code: capabilityExecutionFailed, errors: [{ code: capabilityExecutionFailed }] });
      assert.ok(fixture.faultsReached.includes(executionFailure));
      assert.equal(typeof fixture.requests.at(-1).invocationId, 'string');
      assert.ok(fixture.requests.at(-1).invocationId.length > 0);
    } finally { await fixture.close(); }
  });
}

test('unavailable provider remains masked before body validation', async () => {
  const fixture = await startFixture({ availableModules: [] });
  try {
    const response = await fetch(invocationUrl(fixture.baseUrl), { method: 'POST', headers: fixtureHeaders, body: '{' });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { code: 'capability_not_found', errors: [{ code: 'capability_not_found' }] });
  } finally { await fixture.close(); }
});
