import { administratorBootstrap } from '../../scripts/conformance/core.mjs';

export const capabilityRequests = {
  "anonymous-list": "core/capabilities/capabilities-495-anonymous-list.bru",
  "invalid-token": "core/capabilities/capabilities-496-invalid-token.bru",
  "anonymous-detail": "core/capabilities/capabilities-497-anonymous-detail.bru",
  "effective-list": "core/capabilities/capabilities-498-effective-list.bru",
  "normal-list": "core/capabilities/capabilities-499-normal-list.bru",
  "missing-detail": "core/capabilities/capabilities-500-missing-detail.bru",
  "normal-missing-detail": "core/capabilities/capabilities-501-normal-missing-detail.bru",
  "invalid-id": "core/capabilities/capabilities-502-invalid-id.bru",
  "negative-offset": "core/capabilities/capabilities-503-negative-offset.bru",
  "zero-limit": "core/capabilities/capabilities-504-zero-limit.bru",
  "excessive-limit": "core/capabilities/capabilities-505-excessive-limit.bru",
  "repeated-limit": "core/capabilities/capabilities-506-repeated-limit.bru",
  "unknown-query": "core/capabilities/capabilities-507-unknown-query.bru",
  "detail-query": "core/capabilities/capabilities-508-detail-query.bru",
  "authentication-first": "core/capabilities/capabilities-509-authentication-first.bru"
};
export const capabilityListScenario = [administratorBootstrap[0], capabilityRequests['effective-list']];
