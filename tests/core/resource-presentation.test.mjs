import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import oracle from '../../bruno/core/resources/presentation.cjs';
import { conceptualAsset, contextPresentation, form } from '../fixtures/resource-presentation.mjs';
import { bundleOpenApi, canonicalJson } from '../support/openapi.mjs';
import { runBruno, conformanceScopes } from '../../scripts/conformance.mjs';
import { startFixture, fixtureEnv } from '../fixtures/composed.mjs';
import { mutationTestTimeoutMs } from '../support/constants.mjs';

const { validatePresentation, resolvePresentation, contexts } = oracle;
const definition = () => conceptualAsset();
const group = layout => layout.tabs[0].sections[0].groups[0];
const names = resolution => resolution.fields.map(field => field.field);
const publishedApiWithoutInfoSha256 = '336d5e51929c2c0c46bf18770d78e044f7935ef4bc0280241c975cb8a3f4eba5';

test('legacy definitions resolve unchanged without an endpoint or with an empty contextual document', () => {
  const meta = definition(), empty = { id: meta.id, definitionHash: meta.definitionHash, presentation: {} };
  const original = structuredClone(meta);
  for (const context of contexts) assert.deepEqual(resolvePresentation(meta, empty, context), resolvePresentation(meta, undefined, context));
  assert.equal(resolvePresentation(meta, empty, 'edit').source, 'form');
  assert.deepEqual(names(resolvePresentation(meta, empty, 'list')), meta.fields.map(f => f.name));
  delete meta.presentation;
  for (const context of contexts) {
    assert.equal(resolvePresentation(meta, empty, context).source, 'fields');
    assert.deepEqual(names(resolvePresentation(meta, empty, context)), meta.fields.map(f => f.name));
  }
  assert.equal(original.fields[1].immutable, true);
});

for (const context of ['create', 'edit', 'view']) {
  test(`${context.toUpperCase()} selects its own existing hierarchical form without merging the legacy form`, () => {
    const meta = definition(), response = contextPresentation(meta);
    const expected = context === 'create' ? ['assetTypeId', 'name'] : context === 'view' ? meta.fields.map(f => f.name).reverse() : meta.fields.map(f => f.name);
    validatePresentation(meta, response);
    const selected = resolvePresentation(meta, response, context);
    assert.equal(selected.source, 'context'); assert.deepEqual(names(selected), expected);
    assert.equal(selected.form, response.presentation[context]);
    delete response.presentation[context];
    assert.equal(resolvePresentation(meta, response, context).source, 'form');
  });
}

test('LIST selects ordered columns and semantic labels independently of query, relations or form order', () => {
  const meta = definition(), response = contextPresentation(meta), before = structuredClone(meta);
  response.presentation.list.columns = [{ field: 'notes', label: 'Summary' }, { field: 'name' }, { field: 'assetTypeId' }];
  assert.deepEqual(resolvePresentation(meta, response, 'list').fields, [
    { field: 'notes', label: 'Summary' }, { field: 'name', label: 'Name' }, { field: 'assetTypeId', label: 'assetTypeId' }
  ]);
  assert.deepEqual(meta, before);
});

test('legacy fallback preserves placement order and appends unplaced fields; explicit empty contexts do not fall back', () => {
  const meta = definition(), response = contextPresentation(meta);
  meta.presentation.form = form(['name']);
  delete response.presentation.edit;
  assert.deepEqual(names(resolvePresentation(meta, response, 'edit')), ['name', 'id', 'assetTypeId', 'notes']);
  response.presentation.edit = form([]); response.presentation.edit.tabs = [];
  assert.deepEqual(names(resolvePresentation(meta, response, 'edit')), []);
  response.presentation.list.columns = [];
  assert.deepEqual(names(resolvePresentation(meta, response, 'list')), []);
});

test('display hints cannot be reversed by placement; form-excluded fields remain eligible in LIST', () => {
  const meta = definition(), response = contextPresentation(meta);
  meta.fields[0].annotations.push({ vocabulary: 'UI', term: 'Hidden', value: true });
  meta.fields[3].annotations.push({ vocabulary: 'UI', term: 'FormExcluded', value: true });
  response.presentation.list.columns = [{ field: 'id' }, { field: 'notes' }];
  assert.deepEqual(names(resolvePresentation(meta, response, 'list')), ['notes']);
  assert.deepEqual(names(resolvePresentation(meta, response, 'edit')), ['assetTypeId', 'name']);
});

test('context ordering is stable and never changes immutable/required/null/default/constraint/relation semantics', () => {
  const meta = definition(), response = contextPresentation(meta), before = structuredClone(meta);
  for (const context of contexts) for (let pass = 0; pass < 2; pass++) resolvePresentation(meta, response, context);
  assert.deepEqual(meta, before);
  assert.equal(meta.fields[1].immutable, true); assert.equal(meta.fields[1].required, true);
  assert.equal(meta.fields[3].nullable, true); assert.deepEqual(meta.fields[3].constraints, { maximumLength: 256 });
  assert.equal(meta.fields[3].default, null);
  assert.equal(meta.relations[0].displayField, 'name');
});

for (const context of contexts) {
  test(`${context.toUpperCase()} rejects unknown field references and duplicate fields, even with different labels/placements`, () => {
    const meta = definition(), response = contextPresentation(meta);
    if (context === 'list') response.presentation.list.columns.push({ field: '__unknown' });
    else group(response.presentation[context]).fields.push('__unknown');
    assert.throws(() => validatePresentation(meta, response), /Unknown presentation field/);
    if (context === 'list') response.presentation.list.columns = [{ field: 'name' }, { field: 'name', label: 'Different' }];
    else group(response.presentation[context]).fields = ['name', 'name'];
    assert.throws(() => validatePresentation(meta, response), /Duplicate field/);
  });
}

test('duplicate action placements and local container IDs are invalid; separate contexts may reuse references and IDs', () => {
  const meta = definition(), response = contextPresentation(meta);
  response.presentation.edit.actions = ['retire']; response.presentation.view.actions = ['retire'];
  validatePresentation(meta, response);
  response.presentation.edit.tabs[0].actions = ['retire'];
  assert.throws(() => validatePresentation(meta, response), /Duplicate action/);
  response.presentation.edit.tabs[0].actions = [];
  response.presentation.edit.tabs.push(structuredClone(response.presentation.edit.tabs[0]));
  assert.throws(() => validatePresentation(meta, response), /Duplicate tab/);
});

test('placements use existing action scopes, never grant authority and preserve an unplaced action area', () => {
  const meta = definition(), response = contextPresentation(meta);
  response.presentation.list.actions = ['export', 'import']; response.presentation.create.actions = ['import'];
  response.presentation.edit.actions = ['retire']; response.presentation.view.actions = ['retire'];
  validatePresentation(meta, response);
  assert.deepEqual(resolvePresentation(meta, response, 'list').actions, ['export', 'import']);
  assert.deepEqual(resolvePresentation(meta, response, 'create').actions, ['import']);
  response.presentation.edit.actions = [];
  assert.deepEqual(resolvePresentation(meta, response, 'edit').actions, ['retire']);
  meta.actions[0].authorized = false;
  assert.deepEqual(resolvePresentation(meta, response, 'view').actions, []);
  response.presentation.create.actions = ['retire'];
  assert.throws(() => validatePresentation(meta, response), /Action scope/);
  response.presentation.create.actions = ['__unknown'];
  assert.throws(() => validatePresentation(meta, response), /Unknown presentation action/);
});

test('tabs/sections/groups keep declared order, labels and collapse policy; duplicate fields across groups are invalid', () => {
  const meta = definition(), response = contextPresentation(meta);
  response.presentation.edit = form(['name']);
  const layout = response.presentation.edit, section = layout.tabs[0].sections[0];
  section.collapsible = true; section.initiallyCollapsed = true;
  section.groups.push({ id: 'additional', label: 'Details', fields: ['notes', 'assetTypeId'] });
  const before = structuredClone(layout);
  assert.deepEqual(names(resolvePresentation(meta, response, 'edit')), ['name', 'notes', 'assetTypeId']);
  assert.deepEqual(resolvePresentation(meta, response, 'edit').form, before);
  section.groups[1].fields.push('name');
  assert.throws(() => validatePresentation(meta, response), /Duplicate field/);
  section.groups[1].fields.pop(); section.groups[1].id = section.groups[0].id;
  assert.throws(() => validatePresentation(meta, response), /Duplicate group/);
});

test('contextual recommendations reject mismatched identities, null contexts, new scopes and field-permission/CSS members', () => {
  const meta = definition(), response = contextPresentation(meta);
  for (const key of ['id', 'definitionHash']) {
    const invalid = structuredClone(response); invalid[key] = '__other';
    assert.throws(() => validatePresentation(meta, invalid), /identity mismatch/);
  }
  for (const invalidValue of [null, { ...response.presentation.create, editable: true }, { ...response.presentation.create, css: 'x' }]) {
    const invalid = structuredClone(response); invalid.presentation.create = invalidValue;
    assert.throws(() => validatePresentation(meta, invalid));
  }
  response.presentation.list.primaryField = 'name';
  assert.throws(() => validatePresentation(meta, response), /Unknown presentation member/);
});

test('OpenAPI reuses published form primitives, validates examples and preserves every v0.13.0 API definition', async () => {
  const api = await bundleOpenApi();
  const require = createRequire(import.meta.url), Ajv = require('ajv/dist/2020.js');
  const ajv = new Ajv({ strict: false, validateFormats: false });
  const schema = ajv.compile({ $ref: '#/components/schemas/ResourceContextPresentationResponse', components: api.components });
  const meta = definition(), response = contextPresentation(meta);
  assert.equal(schema(response), true, JSON.stringify(schema.errors));
  const metadataSchema = ajv.compile({ $ref: '#/components/schemas/ResourceMetadata', components: api.components });
  assert.equal(metadataSchema(meta), true, JSON.stringify(metadataSchema.errors));
  assert.equal(schema({ ...response, presentation: { create: { ...response.presentation.create, editable: true } } }), false);
  const legacy = ajv.compile({ $ref: '#/components/schemas/ResourcePresentation', components: api.components });
  assert.equal(legacy(meta.presentation), true);
  assert.equal(legacy({ ...meta.presentation, create: response.presentation.create }), false);
  for (const context of ['create', 'edit', 'view']) assert.equal(api.components.schemas.ResourceContextPresentation.properties[context].$ref, '#/components/schemas/form');
  assert.ok(api.paths['/api/meta/resources/{resource}/presentation'].get.responses['304']);
  assert.deepEqual(api.components.schemas.form, api.components.schemas.ResourcePresentation.properties.form);
  delete api.components.schemas.form;
  delete api.info; delete api.paths['/api/meta/resources/{resource}/presentation'];
  for (const name of ['ResourceContextPresentationResponse', 'ResourceContextPresentation', 'ResourceListPresentation', 'ResourceListColumn']) delete api.components.schemas[name];
  assert.equal(createHash('sha256').update(canonicalJson(api)).digest('hex'), publishedApiWithoutInfoSha256);
});

test('shared conformance accepts unchanged legacy resources through the new empty presentation response', { timeout: mutationTestTimeoutMs }, async () => {
  const fixture = await startFixture({ legacyPresentation: true });
  try {
    const result = await runBruno(fixture.baseUrl, { scope: conformanceScopes.resources, env: fixtureEnv });
    assert.equal(result.code, 0, result.output);
    assert.ok(fixture.requests.some(r => r.path.endsWith('/presentation') && r.expected === 304));
  } finally { await fixture.close(); }
});

for (const presentationFault of ['field', 'duplicate', 'scope', 'hash', 'closed', 'cache']) {
  test(`shared conformance rejects contextual presentation fault: ${presentationFault}`, { timeout: mutationTestTimeoutMs }, async () => {
    const fixture = await startFixture({ presentationFault });
    try {
      const result = await runBruno(fixture.baseUrl, { scope: conformanceScopes.resources, env: fixtureEnv });
      assert.notEqual(result.code, 0); assert.notEqual(result.code, 124);
      assert.ok(fixture.faultsReached.includes(presentationFault));
    } finally { await fixture.close(); }
  });
}
