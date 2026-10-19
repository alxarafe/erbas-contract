import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyImpact, normalizeScopes, scopedTestFiles } from '../../scripts/impact.mjs';

test('classifies documentation and empty changes as fast', () => {
  assert.deepEqual(classifyImpact(['docs/usage.md', 'README.md']), { level: 'fast' });
  assert.deepEqual(classifyImpact([]), { level: 'fast' });
});

test('classifies owned paths and deterministically unions scopes', () => {
  assert.deepEqual(classifyImpact(['openapi/core/auth/login.yaml']), { level: 'scoped', scopes: ['auth'] });
  assert.deepEqual(classifyImpact(['bruno/modules/wms/uoms/list.bru']), { level: 'scoped', scopes: ['wms'] });
  assert.deepEqual(classifyImpact(['openapi/core/capabilities/schema.yaml', 'openapi/modules/wms/capabilities.json', 'bruno/modules/wms/invocations/read.bru']), { level: 'scoped', scopes: ['capabilities'] });
  assert.deepEqual(classifyImpact(['bruno/core/users/list.bru', 'bruno/core/auth/login.bru', 'openapi/core/users/user.yaml']), { level: 'scoped', scopes: ['auth', 'users'] });
});

test('full and unknown paths dominate scoped paths', () => {
  for (const path of ['openapi/erbas.yaml', 'openapi/common/error.yaml', 'openapi/modules/wms/shared.yaml', 'bin/check', 'tests/support/scenarios.mjs', '.github/workflows/ci.yml', 'unknown/file', 'toString', '__proto__']) {
    assert.deepEqual(classifyImpact(['bruno/core/health/get.bru', path]), { level: 'full' }, path);
  }
});

test('deleted and renamed paths retain both ownership sides', () => {
  assert.deepEqual(classifyImpact(['bruno/core/health/old.bru', 'bruno/core/users/new.bru']), { level: 'scoped', scopes: ['health', 'users'] });
  assert.deepEqual(classifyImpact(['bruno/core/health/old.bru', 'unrecognized/new.bru']), { level: 'full' });
});

test('scope selection rejects invalid input and deduplicates overlapping files', () => {
  assert.throws(() => normalizeScopes([]));
  assert.throws(() => normalizeScopes(['health', 'unknown']));
  assert.deepEqual(normalizeScopes(['users', 'auth', 'users']), ['auth', 'users']);
  assert.deepEqual(scopedTestFiles(['wms', 'item-families', 'storage-attributes']), ['tests/modules/wms/contract.test.mjs']);
});
