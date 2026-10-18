import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bundleOpenApi } from '../../support/openapi.mjs';
import { runBrunoScenario } from '../../support/scenarios.mjs';
import { mutationTestTimeoutMs } from '../../support/constants.mjs';
import { administratorBootstrap } from '../../../scripts/conformance/core.mjs';
import { wmsCapabilityRequests as requests } from './capability-scenarios.mjs';
import { startFixture, fixtureEnv } from '../../fixtures/composed.mjs';
import { WMS_ID } from '../../fixtures/modules/wms/catalogues.mjs';

test('WMS owns three concrete capability declarations with existing input/output schemas', async () => {
  const declarations = JSON.parse(await readFile('/runner/openapi/modules/wms/capabilities.json', 'utf8'));
  const api = await bundleOpenApi({ dereferenced: true });
  const folder = await readFile('/runner/bruno/modules/wms/capabilities/folder.bru', 'utf8');
  const expected = JSON.parse(folder.match(/  wmsDescriptors: (.+)/)[1]);
  assert.deepEqual(declarations, expected);
  assert.ok(folder.includes(`capabilityIdPattern: ${api.components.schemas.CapabilityId.pattern}`));
  assert.equal(declarations.length, 3);
  assert.equal(new Set(declarations.map(item => item.id)).size, declarations.length);
  for (const item of declarations) {
    assert.equal(item.module, WMS_ID);
    assert.equal(item.effect, 'read');
    assert.equal(item.version, '1.0.0');
    const resource = item.id.split('.')[1];
    assert.deepEqual(item.requiredPermissions, [`wms.${resource}.read`]);
    const operation = api.paths[`/api/wms/${resource}`].get;
    assert.ok(operation);
    assert.deepEqual(operation.responses['200'].content['application/json'].schema,
      api.components.schemas[item.outputSchema.$ref.split('/').at(-1)]);
    for (const field of ['inputSchema', 'outputSchema']) {
      assert.ok(api.components.schemas[item[field].$ref.split('/').at(-1)], item[field].$ref);
    }
  }
});

const scenarios = {
  disclosure: [...administratorBootstrap, requests['normal-hidden'], requests['normal-hidden-detail']],
  'ignored-module': [administratorBootstrap[0], requests.disable, requests['disabled-hidden'], requests['disabled-detail']]
};
for (const [capabilityFault, scenario] of Object.entries(scenarios)) {
  for (const faulty of [false, true]) {
    test(`WMS capability visibility ${capabilityFault}: ${faulty ? 'reject defect' : 'accept conforming fixture'}`, { timeout: mutationTestTimeoutMs }, async () => {
      const fixture = await startFixture(faulty ? { capabilityFault } : {});
      try {
        const result = await runBrunoScenario(fixture.baseUrl, scenario, { env: fixtureEnv });
        if (faulty) {
          assert.notEqual(result.code, 0, result.output);
          assert.notEqual(result.code, 124);
          assert.ok(fixture.faultsReached.includes(capabilityFault));
        } else {
          assert.equal(result.code, 0, result.output);
          assert.equal(fixture.requests.length, scenario.length);
        }
      } finally { await fixture.close(); }
    });
  }
}
