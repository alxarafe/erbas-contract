import test from 'node:test';
import assert from 'node:assert/strict';
import { contractVersion } from '../support/constants.mjs';
import { createHash } from 'node:crypto';
import { bundleOpenApi, canonicalJson } from '../support/openapi.mjs';

// Fully dereferenced Redocly 2.5.1 output from authorized base 2fcbe3f8d2d0b6152507f15751fa7ebf5f5a5dc9.
const baseResolvedContractSha256 = '0ad19e56e34d44eb90464436c8dfbb09a2e99fa52e82608d652a6e3c2318f9b8';
test('AI-001 preserves every published v0.10.0, v0.9.0 and prior v0.8.0 contract definition', async () => {
  const api = await bundleOpenApi({ dereferenced: true });
  assert.equal(api.info.version, contractVersion);
  assert.equal(api.info.description, `ERBAS Contract ${contractVersion} unpublished MINOR candidate over immutable v0.11.1: controlled READ primitives and typed AI tool provenance. No release, tag or consumer adoption is claimed. See docs/releases/v${contractVersion}.md.`);
  delete api.paths['/api/ai/assistant/invocations'];
  for (const name of ['AiAssistantInvocationRequest', 'AiAssistantInvocation', 'AiAssistantToolUsage',
    'AiAssistantCapabilityUsage', 'AiAssistantPrimitiveUsage', 'AiAssistantUnavailable', 'AiAssistantExecutionFailed']) delete api.components.schemas[name];
  for (const name of ['AiAssistantInvalidRequest', 'AiAssistantForbidden', 'AiAssistantInvocation',
    'AiAssistantExecutionFailed']) delete api.components.responses[name];
  api.info.version = '0.10.0';
  api.info.description = 'ERBAS Contract 0.10.0 includes CORE-CAP-002 synchronous READ capability invocation. No v0.10.0 backend or client adoption or conformance is claimed. See docs/core/capabilities-002.md and docs/releases/v0.10.0.md.';
  // Exact dereferenced immutable v0.10.0 tag, preserving its historical preparation metadata.
  const publishedV010Sha256 = '40d2ba94f949fc49e7a04733d7eff420f33b7158b75f5bbbeb83304d1f268f61';
  assert.equal(createHash('sha256').update(canonicalJson(api)).digest('hex'), publishedV010Sha256);
  delete api.paths['/api/core/capabilities/{capabilityId}/invocations'];
  for (const name of ['CapabilityInvocationRequest', 'CapabilityInvocation', 'CapabilityExecutionFailed']) delete api.components.schemas[name];
  for (const name of ['CapabilityInvocation', 'CapabilityExecutionFailed']) delete api.components.responses[name];
  api.info.version = '0.9.0';
  api.info.description = 'ERBAS Contract 0.9.0 unpublished preparation: CORE-CAP-001 capability descriptors, registry and contextual discovery. Published immutable baseline: v0.8.0 (WMS-003 and the standard error envelope). No v0.9.0 backend or client adoption or conformance is claimed. See docs/core/capabilities-001.md and docs/releases/v0.9.0.md.';
  // Exact dereferenced immutable v0.9.0 tag, preserving its historical preparation metadata.
  const publishedV090Sha256 = '463164642b48bb44b5eb725f40bc73078682f3ac614742c9aa5e7ee32e65b6af';
  assert.equal(createHash('sha256').update(canonicalJson(api)).digest('hex'), publishedV090Sha256);
  delete api.paths['/api/core/capabilities'];
  delete api.paths['/api/core/capabilities/{capabilityId}'];
  for (const name of ['CapabilityId', 'CapabilitySchemaReference', 'Capability',
    'CapabilityCollection', 'CapabilityNotFound', 'CapabilityListInput']) delete api.components.schemas[name];
  for (const name of ['CapabilityList', 'CapabilityDetail', 'CapabilityNotFound']) delete api.components.responses[name];
  // Redocly promotes the new references to existing parameter sub-schemas.
  // Verify those generated aliases before excluding them from the legacy view.
  assert.deepEqual(api.components.schemas.schema, api.components.parameters.Offset.schema);
  assert.deepEqual(api.components.schemas['Limit-schema'], api.components.parameters.Limit.schema);
  delete api.components.schemas.schema;
  delete api.components.schemas['Limit-schema'];
  // Restore only the published base metadata for the unchanged legacy hash.
  api.info.version = '0.8.0';
  api.info.description = "ERBAS Contract 0.8.0 unpublished preparation: WMS-003 Item Families and associations, with an incompatible standard error envelope. Published immutable baseline: v0.7.0. No v0.8.0 backend or client adoption or conformance is claimed. See docs/api-conventions.md and docs/wms-003.md.";
  assert.equal(createHash('sha256').update(canonicalJson(api)).digest('hex'), baseResolvedContractSha256);
});
