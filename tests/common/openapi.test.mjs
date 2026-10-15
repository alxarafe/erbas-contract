import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { bundleOpenApi, canonicalJson } from '../support/openapi.mjs';

// Fully dereferenced Redocly 2.5.1 output from authorized base 2fcbe3f8d2d0b6152507f15751fa7ebf5f5a5dc9.
const baseResolvedContractSha256 = '0ad19e56e34d44eb90464436c8dfbb09a2e99fa52e82608d652a6e3c2318f9b8';
test('resolved public contract is identical to the pre-refactor v0.8.0 base', async () => {
  const api = await bundleOpenApi({ dereferenced: true });
  assert.equal(createHash('sha256').update(canonicalJson(api)).digest('hex'), baseResolvedContractSha256);
});
