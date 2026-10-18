# CORE-CAP-001 — Capability descriptors, registry and discovery

Status: approved CORE-CAP-001 contract published in immutable v0.9.0. No backend
implementation, adoption or live conformance is claimed by this document.
OpenAPI is authoritative; the single Bruno collection checks observable behavior.
This extends discovery only. It does not introduce capability execution.

## Ownership and registration

A provider module declares its own capabilities. CORE owns the common descriptor,
registration rules and effective discovery. Other modules, clients, administrative
tools, workflows, automations, agents and integrations may consume discovery;
none receives a special representation. CORE contains no WMS business knowledge.

A backend registers provider descriptors during its existing module registration
or initialization. No public registration HTTP endpoint, database catalogue,
plugin loader or new dynamic activation mechanism is required. Internal APIs and
storage are backend-owned. Registration must validate descriptors and schema
reference targets and reject duplicate IDs, including conflicting owners or
versions. A duplicate must never be silently overwritten or published twice.
Invalid registrations must not enter discovery; startup failure versus diagnostic
handling is deliberately an implementation decision.

A registered descriptor's `module` must identify its exact owning AVAILABLE
`Module.id`. Effective discovery includes it only while that module is enabled
and all required permissions are granted to the authenticated user. Apply these
filters before totals and pagination. An absent or disabled module contributes
neither items nor totals, and detail lookup returns the same masked 404 as an
unknown capability. CORE discovery itself remains available with all modules
disabled. Existing persisted module state and dependency invariants apply;
successful module PATCH changes affect subsequent discovery without restart.
No descriptor `enabled`, health or installation flag duplicates module state.

Only an effective user catalogue is exposed. An administrative inventory could
include unavailable or forbidden entries and needs separate authorization and
information-disclosure review; it is not implemented here. Even administrators
receive the effective catalogue, not a view of disabled providers.

## Descriptor

The closed `Capability` object requires exactly these nine fields:

| Field | Meaning and rationale |
| --- | --- |
| `id` | Stable global identity: exactly `<namespace>.<resource-or-domain>.<operation>`. Segments use lowercase ASCII letters/digits with internal hyphens and start with a letter. Exact case-sensitive matching; no version suffix. |
| `module` | Exact owning registry Module ID. Necessary for availability; namespace and opaque Module ID need not match. The provider explicitly declares their relationship. |
| `version` | Capability behavioral contract version, three-number SemVer. Initially `1.0.0` for the WMS declarations. Not an implementation build number. |
| `name` | Nonblank English human-readable name, distinct from identity. |
| `description` | Nonblank English behavior and existing usage. No credentials, internals or executable instructions. |
| `effect` | `read` or `write`. Read does not mutate business state; write may do so. Descriptive classification, not an execution or safety guarantee. |
| `inputSchema` | JSON Schema reference-only object describing structured inputs. |
| `outputSchema` | JSON Schema reference-only object describing the successful result, not the HTTP error envelope. |
| `requiredPermissions` | Unique functional permission keys in ordinal ASC order, all required for discovery and use. Empty means no additional permission beyond authentication. No role names, grants or data scopes. |

IDs are unique throughout an instance, not just within one module. CORE does not
infer module IDs from prefixes. `wms` is WMS's namespace; its actual registry ID
is `erbas.wms`. The module owns both the declaration and its permission meanings.
Only one descriptor version per capability ID is published in this revision.

Example from the normative provider declarations in
[`openapi/modules/wms/capabilities.json`](../../openapi/modules/wms/capabilities.json):

```json
{
  "id": "wms.uoms.list",
  "module": "erbas.wms",
  "version": "1.0.0",
  "name": "List units of measure",
  "description": "GET /api/wms/uoms with optional offset and limit; returns the existing paged catalogue.",
  "effect": "read",
  "inputSchema": {"$ref": "#/components/schemas/CapabilityListInput"},
  "outputSchema": {"$ref": "#/components/schemas/WmsUomCollection"},
  "requiredPermissions": ["wms.uoms.read"]
}
```

Names and descriptions are stable declaration content for this revision, not
localized per request. Additional module capabilities require their own reviewed
contract declarations; arbitrary synthetic runner descriptors are not product
features. Backends may represent declarations idiomatically and need not parse
this JSON file at runtime, but must expose the same declared observable content.

## Schemas and existing use

A schema value is exactly `{"$ref":"#/components/schemas/ComponentName"}`.
This uses the standard [JSON Schema reference mechanism](https://json-schema.org/draft/2020-12/json-schema-core#section-8.2.3.1).
Consumers resolve it against the **canonical bundled OpenAPI document from the
explicitly selected erbas-contract revision**, not the discovery response URL.
The target must exist in that document. Backend consumers already select an
explicit contract release or an explicitly opted-in development checkout.
No HTTP schema download service is assumed or added. Discovery alone is therefore
not a self-contained schema distribution mechanism; consumers need that contract.
External URLs and inline schema objects are intentionally outside this first
representation, avoiding network fetching and an unrestricted schema evaluator.
Supporting them later would require an explicit contract change.

The current OpenAPI 3.1 schema vocabulary is retained. `CapabilityListInput` is a
closed object with optional `offset` and `limit` referencing the existing common
parameter schemas, including their defaults and bounds. For the three existing
WMS list operations, its properties map to HTTP query parameters; `outputSchema`
references the existing complete collection response. No schema constraints are
copied. HTTP routes, methods, errors, authorization and module gating remain
specified by those existing operations. No generic invocation endpoint or
transport binding field is introduced. Consumers must not interpret a capability
ID as an executable URL.

| Provider-owned capability | Permission | Existing operation / result schema |
| --- | --- | --- |
| `wms.uoms.list` | `wms.uoms.read` | `GET /api/wms/uoms` / `WmsUomCollection` |
| `wms.storage-attributes.list` | `wms.storage-attributes.read` | `GET /api/wms/storage-attributes` / `WmsStorageAttributeCollection` |
| `wms.item-families.list` | `wms.item-families.read` | `GET /api/wms/item-families` / `WmsItemFamilyCollection` |

There is no rotation descriptor, invented business operation or required new
capability for existing write operations in this first slice.

## Authentication and authorization

Discovery always requires the existing bearer authentication, including normal
users. Missing, invalid, expired or disabled-user tokens return 401 before query
or ID validation. No permission is required merely to request discovery.

The current shared user contract has only `User.admin`, not permission assignment
or policy management. For the three WMS read permissions above, this revision
maps grants to the existing rule: an enabled authenticated administrator has all
three; a normal user has none. This preserves every existing WMS route's
administrator requirement. It is a permission-to-policy mapping, not a role field
in the functional descriptor. It adds no claims to opaque tokens, user response
properties, role API or permission management endpoint. Backends must evaluate
the current user policy, not treat the descriptor as a grant. Future modules must
declare their permission policy explicitly; no global administrator bypass or
unknown-permission default grant is established.

Normal users receive no WMS entries, no WMS contribution to totals, and masked
404s for WMS detail requests. An entirely empty effective catalogue returns 200.
No `capability_forbidden` code is introduced: distinguishing it from unknown IDs
would leak existence without a current consumer need.

This answers **User -> Capability** authorization only. It does not authorize
**Capability -> Data**, delegate the caller, or imply access to every row.
Tenant, organization, warehouse, ownership and other DataScope constraints remain
separate future work. Existing endpoint authorization still applies independently.
Discovery can become stale and is never an authorization token for later use.

## HTTP discovery and errors

- `GET /api/core/capabilities`: COLLECTIONS-001 envelope with `items`, `offset`,
  `limit`, `total`, `order`. Fixed ordinal capability ID ASC order. Apply effective
  filtering, then ordering and slicing. Defaults 0/50, limit 1–100. Only one
  base-10 integer value per offset/limit is accepted; reject unknown query keys,
  repeated keys, negative offsets, empty/whitespace/fraction/exponent values and
  out-of-range limits. Offset at/beyond total returns 200 with empty items.
- `GET /api/core/capabilities/{capabilityId}`: complete descriptor identical to
  the catalogue entry. Invalid ID syntax or any query parameter returns 400.
  Syntactically valid unknown, unauthorized, disabled or absent-provider IDs all
  return the same 404. Lowercase IDs mean uppercase inputs are syntactically
  invalid (400), rather than alternative identities.

Responses use strict JSON, `application/json`, `Cache-Control: no-store`, no
redirects, and `WWW-Authenticate: Bearer` only on 401. Closed successful objects
and global errors prohibit extra implementation or sensitive details.

| Status | Exact error body |
| --- | --- |
| 400 | `{"code":"invalid_request","errors":[{"code":"invalid_request"}]}` |
| 401 | `{"code":"unauthorized","errors":[{"code":"unauthorized"}]}` |
| 404 | `{"code":"capability_not_found","errors":[{"code":"capability_not_found"}]}` |

Authentication precedes validation, then effective lookup. There is no 403 for
these discovery operations and no new execution/dependency error. Existing WMS
503 `module_disabled` behavior is unchanged; discovery masks it as absence.

## Version identities and compatibility

| Identity | Rule |
| --- | --- |
| Capability ID | Stable identity without embedded version. Rename creates a different identity. |
| Capability `version` | Behavioral contract including input/output, effect and permission requirements. Incompatible changes increment MAJOR, compatible additions MINOR, nonbehavioral corrections PATCH. Keep the ID stable. No negotiation or parallel versions yet. |
| erbas-contract version | Version of the complete shared public API, descriptor shape and provider declarations. Existing repository SemVer policy applies. |
| Module implementation version | Backend/package/build version, deliberately absent from discovery. May change without changing capability behavior. |
| `Module.moduleApiVersion` | Existing integer modular integration compatibility; unchanged and unrelated to capability version. |

A capability major version alone does not permit a backend to change the shared
API: the corresponding erbas-contract change must still be approved and versioned.
Closed output schema additions and changed permissions can be incompatible.
Clients may compare declared versions; automated schema compatibility analysis
and negotiation are deferred. Shared descriptor-shape evolution uses the
ERBAS contract version, so a redundant `descriptorVersion` is unnecessary here.

CORE-CAP-001 was published as **v0.9.0**, a compatible additive MINOR after the
published immutable **v0.8.0** WMS-003 contract. The v0.9.0 annotated tag object is
`adcfad11c6fe51cb54a92a93f9c1e99a13fb7dc8`, targeting
`138e2381e1010e994a0f9d6306af6f9d420658e5`. Publication does not imply consumer
adoption or conformance; existing consumer pins and capability behavioral versions
remain unchanged.

## Cross-stack design review

Repository evidence is the existing AUTH/USERS, module administration and WMS
contracts and their recorded portability reviews. No other repository is assumed
to be at a particular local path, inspected or modified, and no existing backend
capability registry implementation is claimed. This review evaluates how both
supported stacks **could** provide the new observable behavior.

Java can collect immutable provider descriptors through its existing module
registration and serialize DTOs; .NET can do the same through its own module
registration and records/classes. Both can filter registered descriptors by
current module state and user authorization before pagination. Neither needs to
copy the other's registration, persistence or dependency injection internals.
[Spring Security authorization managers/authorities](https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html)
and [ASP.NET policy requirements/handlers](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/policies?view=aspnetcore-10.0)
can express functional permission checks and the initial administrator mapping.
These are feasibility references, not mandated backend dependencies or claims
about installed versions.

The common semantics avoid exposing framework annotations, class names, roles,
claims or policy internals. Filtering plus indistinguishable 404s limits metadata
disclosure; descriptor validation and duplicate rejection avoid ambiguous identity.
Explicit in-process registration and existing module state are simpler and more
testable than reflection, remote discovery or a new activation subsystem. Test
fixtures demonstrate HTTP portability only; backend teams own implementation,
registration rejection tests, persistence and real conformance verification.

## Deferred decisions, risks and acceptance

Excluded: capability invocation; Capability -> Capability delegation; derived
permissions and derived-information disclosure; DataScope; ExecutionContext;
execution audit; cycle detection; invocation depth; timeout/cancellation; TOCTOU;
schema compatibility automation; resource budgets; partial failures; human
approval; workflows; AI, prompts, prompt injection, providers, RAG, embeddings,
MCP; remote capabilities; distributed transactions; WMS rotation.

Revisit after backend implementation:

- Permission assignment does not exist yet; the administrator mapping is coarse
  and intentionally preserves existing route security. It must not be mistaken
  for completed granular authorization or data authorization.
- Schema references require the explicitly matching bundled contract. Independent
  module schema distribution and negotiation are not solved.
- Discovery reflects each request's effective state. There is no cross-page
  snapshot guarantee under concurrent module/policy changes. Callers can restart
  discovery; execution must later reauthorize and handle TOCTOU explicitly.
- Registration errors have no new public HTTP code. Backend initialization must
  validate them and must not publish partially invalid or duplicate entries.
- No separate architecture-risk document was supplied or found in this checkout;
  the exclusions above preserve the requested future review topics without
  inventing or claiming synchronization with an external document.

Acceptance covers the descriptor, registration invariants and ownership,
contextual paged discovery, real existing WMS provider declarations, masked
lookup, current authentication/policy mapping, immediate existing module gate,
and preserved prior public contract. Bruno adds positive and negative discovery,
three real details, non-admin filtering, disable/restore observations and errors.
Synthetic mutations prove detection of malformed JSON, invalid/extra descriptor
fields, wrong versions/schemas/IDs, duplicates within/across pages, metadata
leakage and ignored module gates. Repository verification and live conformance
remain distinct; see [verification evidence](../verification/core-cap-001.md).
