import test from 'node:test';
import assert from 'node:assert/strict';
import { runBrunoScenario } from '../../support/scenarios.mjs';
import { uomScenarios, storageScenarios, associationScenarios, itemFamilyScenarios } from './scenarios.mjs';
import { mutationTestTimeoutMs, loginPath, contractVersion } from '../../support/constants.mjs';
import { startFixture, fixtureEnv } from '../../fixtures/composed.mjs';
import { modulesPath } from '../../fixtures/core.mjs';
import { WMS_ID, uomsPath, storageAttributesPath, storageAttributeCodePattern, storageAttributeCodeConflict } from '../../fixtures/modules/wms/catalogues.mjs';
import { itemFamiliesPath, associationSegment, uuidPattern } from '../../fixtures/modules/wms/associations.mjs';
import { bundleOpenApi } from '../../support/openapi.mjs';
for (const wmsFault of ['accepted-duplicate', 'lost-state', 'order', 'unicode-length',
  'gate-before-auth', 'ignored-gate', 'extra', 'pagination',
  'untrimmed-description', 'untrimmed-persistence', 'length-before-trim']) {
  test(`runner rejects WMS fault: ${wmsFault}`, { timeout: mutationTestTimeoutMs }, async () => {
    const fixture = await startFixture({ wmsFault });
    try {
      const scenario = uomScenarios[wmsFault];
      const result = await runBrunoScenario(fixture.baseUrl, scenario, { env: fixtureEnv });
      assert.equal(fixture.requests.length, scenario.length);
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

for (const [storageAttributeFault, method] of [
  ['accepted-duplicate', 'POST'], ['ignored-gate', 'GET'],
  ['order', 'GET'], ['pagination', 'GET'],
  ['unicode-length', 'POST'], ['untrimmed-description', 'POST'],
  ['length-before-trim', 'POST'], ['untrimmed-persistence', 'GET'],
  ['normalized-code', 'POST'], ['accepted-extra', 'POST']
]) {
  test(`runner rejects Storage Attribute fault: ${storageAttributeFault}`, { timeout: mutationTestTimeoutMs }, async () => {
    const fixture = await startFixture({ storageAttributeFault });
    try {
      const scenario = storageScenarios[storageAttributeFault];
      const result = await runBrunoScenario(fixture.baseUrl, scenario, { env: fixtureEnv });
      assert.equal(fixture.requests.length, scenario.length);
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124, 'watchdog must not hide the defect');
      assert.ok(fixture.faultsReached.includes(storageAttributeFault));
      assert.equal(fixture.requests.at(-1).path.split('?')[0], storageAttributesPath);
      assert.equal(fixture.requests.at(-1).method, method);
      assert.ok(fixture.requests.every(r => !r.path.startsWith(uomsPath)));
    } finally { await fixture.close(); }
  });
}

test('OpenAPI preserves the Storage Attribute catalogue and precisely defines WMS-003', async () => {
  const api = await bundleOpenApi();
  const schemas = api.components.schemas;
  const responses = api.components.responses;
  const ref = name => ({ $ref: `#/components/schemas/${name}` });
  assert.equal(api.info.version, contractVersion);
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
  ]) {
    assert.equal(schemas[name].additionalProperties, false);
    assert.deepEqual(schemas[name].required, fields);
    assert.deepEqual(Object.keys(schemas[name].properties), fields);
  }
  assert.equal(schemas.WmsCatalogueCode.pattern, storageAttributeCodePattern.source);
  assert.equal(schemas.WmsCatalogueCode.maxLength, 30);
  assert.equal(schemas.WmsCatalogueCode.minLength, 1);
  assert.equal(schemas.WmsCatalogueName.maxLength, 255);
  assert.equal(schemas.WmsCatalogueName.minLength, 1);
  assert.equal(schemas.WmsCatalogueNameInput.maxLength, undefined);
  assert.equal(schemas.WmsCatalogueName.not.pattern, '\\u0000');
  assert.match(schemas.WmsCatalogueName.description, /unpaired surrogates/);
  assert.deepEqual(schemas.WmsStorageAttribute.properties.id, ref('WmsEntityId'));
  assert.equal(schemas.WmsEntityId.format, 'uuid');
  assert.deepEqual(schemas.WmsStorageAttributeCollection.properties.order, schemas.WmsUomCollection.properties.order);
  for (const field of ['offset', 'limit', 'total']) assert.deepEqual(schemas.WmsStorageAttributeCollection.properties[field], schemas.WmsUomCollection.properties[field]);
  assert.equal(schemas.WmsStorageAttributeCodeConflict.allOf[1].properties.code.const, storageAttributeCodeConflict);
  const familyPath = itemFamiliesPath + '/{familyId}/storage-attributes';
  assert.deepEqual(Object.keys(api.paths[itemFamiliesPath]).sort(), ['get', 'post']);
  assert.deepEqual(Object.keys(api.paths[familyPath]).sort(), ['get', 'patch', 'post', 'put']);
  assert.deepEqual(Object.keys(api.paths[familyPath + '/{storageAttributeId}']), ['delete']);
  assert.ok(!api.paths[itemFamiliesPath + '/{familyId}'], 'no individual family operations');
  assert.equal(schemas.ErrorResponse.additionalProperties, false);
  assert.deepEqual(schemas.ErrorResponse.required, ['code', 'errors']);
  assert.equal(schemas.ErrorResponse.properties.errors.minItems, 1);
  assert.equal(schemas.ErrorResponse.properties.code.deprecated, undefined);
  assert.equal(schemas.ErrorDetail.additionalProperties, false);
  assert.deepEqual(schemas.ErrorDetail.required, ['code']);
  assert.deepEqual(Object.keys(schemas.ErrorDetail.properties), ['code', 'resource', 'resourceId', 'path']);
  for (const schema of ['CreateWmsItemFamily', 'WmsItemFamily', 'WmsItemFamilyCollection',
    'CreateWmsItemFamilyAssociation', 'WmsItemFamilyAssociation', 'ReplaceWmsItemFamilyAssociations', 'PatchWmsItemFamilyAssociations']) {
    assert.equal(schemas[schema].additionalProperties, false, schema);
  }
  assert.deepEqual(schemas.CreateWmsItemFamily.required, ['code', 'name']);
  assert.deepEqual(schemas.WmsItemFamily.required, ['id', 'code', 'name']);
  assert.deepEqual(schemas.WmsItemFamily.properties.id, ref('WmsEntityId'));
  assert.deepEqual(schemas.WmsItemFamily.properties.code, ref('WmsCatalogueCode'));
  assert.deepEqual(schemas.WmsItemFamily.properties.name, ref('WmsCatalogueName'));
  assert.deepEqual(schemas.CreateWmsItemFamily.properties.name, ref('WmsCatalogueNameInput'));
  assert.deepEqual(schemas.WmsItemFamilyAssociation.required, ['itemFamilyId', 'storageAttribute']);
  assert.deepEqual(schemas.WmsItemFamilyAssociation.properties.storageAttribute, ref('WmsStorageAttribute'));
  assert.equal(schemas.WmsStorageAttributeIds.uniqueItems, true);
  assert.deepEqual(schemas.WmsStorageAttributeIds.items, ref('WmsEntityId'));
  assert.deepEqual(schemas.ReplaceWmsItemFamilyAssociations.required, ['storageAttributeIds']);
  assert.deepEqual(schemas.PatchWmsItemFamilyAssociations.anyOf.map(branch => branch.required), [['add'], ['remove']]);
  for (const path of [itemFamiliesPath, familyPath, familyPath + '/{storageAttributeId}']) {
    for (const [method, operation] of Object.entries(api.paths[path])) {
      assert.deepEqual(operation.security, [{ bearerAuth: [] }]);
      assert.match(operation.description, /Administrator only/);
      assert.match(operation.description, /erbas.wms enabled/);
      for (const [status, name] of Object.entries({400: 'InvalidRequest', 401: 'Unauthorized', 403: 'Forbidden', 503: 'WmsDisabled'})) {
        assert.deepEqual(operation.responses[status], {$ref: '#/components/responses/' + name});
      }
      if (['put', 'patch', 'delete'].includes(method)) {
        const response = responses.WmsAssociationsUpdated;
        assert.deepEqual(operation.responses['204'], {$ref: '#/components/responses/WmsAssociationsUpdated'});
        assert.equal(response.content, undefined);
        assert.equal(response.headers['Cache-Control'].schema.const, 'no-store');
      }
    }
  }
  assert.equal(responses.CreatedWmsItemFamilyAssociation.headers.Location.required, true);

});

for (const associationFault of ['partial-put', 'partial-patch', 'missing-conflict-detail', 'missing-resource-detail']) {
  test(`runner rejects WMS-003 association fault: ${associationFault}`, { timeout: mutationTestTimeoutMs }, async () => {
    const fixture = await startFixture({ associationFault });
    try {
      const scenario = associationScenarios[associationFault];
      const result = await runBrunoScenario(fixture.baseUrl, scenario, { env: fixtureEnv });
      assert.equal(fixture.requests.length, scenario.length);
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124);
      assert.ok(fixture.faultsReached.includes(associationFault), 'targeted defect must actually be reached');
      const last = fixture.requests.at(-1);
      assert.ok(last.path.startsWith(itemFamiliesPath + '/'));
      if (associationFault.startsWith('partial-')) {
        assert.equal(last.method, 'GET', 'persisted-state assertion must detect partial mutation');
        assert.equal(last.expected, 200);
        const relationPath = last.path;
        const [familyId, segment] = relationPath.slice(itemFamiliesPath.length + 1).split('/');
        assert.match(familyId, uuidPattern);
        assert.equal(segment, associationSegment);
        const masterCreation = ['POST', storageAttributesPath];
        const setup = [['POST', loginPath], ['POST', itemFamiliesPath]];
        const expected = associationFault === 'partial-put'
          ? [...setup, masterCreation, ['POST', relationPath], ['PUT', relationPath], ['GET', relationPath]]
          : [...setup, masterCreation, masterCreation, masterCreation,
            ['PUT', relationPath], ['PATCH', relationPath], ['GET', relationPath]];
        assert.deepEqual(fixture.requests.map(({ method, path }) => [method, path]), expected,
          'atomicity scenarios must contain only prerequisites, mutation and persisted-state GET');
      } else assert.ok([404, 409].includes(last.expected), 'multiple error details must be checked');
      assert.ok(!result.output.includes(fixtureEnv.ERBAS_TEST_PASSWORD));
      assert.ok(!result.output.includes('synthetic.token_123'));
    } finally { await fixture.close(); }
  });
}

for (const itemFamilyFault of ['normalized-code', 'unicode-length', 'untrimmed-persistence', 'accepted-duplicate']) {
  test(`runner rejects ItemFamily catalogue fault: ${itemFamilyFault}`, { timeout: mutationTestTimeoutMs }, async () => {
    const fixture = await startFixture({ itemFamilyFault });
    try {
      const scenario = itemFamilyScenarios[itemFamilyFault];
      const result = await runBrunoScenario(fixture.baseUrl, scenario, { env: fixtureEnv });
      assert.equal(fixture.requests.length, scenario.length);
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124);
      assert.ok(fixture.faultsReached.includes(itemFamilyFault));
    } finally { await fixture.close(); }
  });
}
