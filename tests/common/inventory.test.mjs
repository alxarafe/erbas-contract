import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionInventory } from '../support/inventory.mjs';
import { baselineRequestCount, baselineNamedCheckCount } from '../support/constants.mjs';

test('sole collection reports measured request/check counts and has contiguous unique sequences', async () => {
  const { files, checks, sequences, collections } = await collectionInventory();
  assert.equal(files.length, baselineRequestCount);
  assert.equal(checks, baselineNamedCheckCount);
  assert.deepEqual(collections, ['bruno.json']);
  console.log(`Measured sole collection: ${files.length} requests / ${checks} named checks.`);
  assert.deepEqual(sequences.sort((a,b) => a-b), Array.from({length: files.length}, (_,i) => i+1));
});
