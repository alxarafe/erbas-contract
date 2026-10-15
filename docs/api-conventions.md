# ERBAS HTTP conventions

OpenAPI is the formal wire specification. Functional specifications reference
these conventions and describe domain behavior or explicit exceptions only.
Existing successful behavior and authentication/header requirements remain intact.
[COLLECTIONS-001](collections.md) is authoritative for paginated collections.

| Method | Meaning |
| --- | --- |
| GET | Retrieval. |
| POST | Creation or registration. |
| PUT | Complete replacement or an idempotent desired-state update. |
| PATCH | Partial modification. |
| DELETE | Removal. |

| Status | Meaning |
| --- | --- |
| 201 Created | Resource or association created. |
| 204 No Content | Successful mutation without a representation or response body. |
| 400 Bad Request | Structurally invalid input. |
| 401 Unauthorized | Missing or invalid authentication. |
| 403 Forbidden | Authenticated caller without permission. |
| 404 Not Found | Absent resource or association. |
| 409 Conflict | Valid request conflicts with current resource state. |
| 503 Service Unavailable | Dynamic module disabled. |

DELETE is idempotent because repeating it leaves the same final resource state;
a repeated DELETE may return 404. Batch PUT and PATCH operations are atomic.
A failed operation must leave the persisted state unchanged. Transaction and
concurrency mechanisms belong to the implementation.

Evaluation order is authentication → authorization → module gate → structural
validation → domain/resource evaluation → operation. WMS-003 refines the domain
stage to referenced-resource existence (404), then relation-state conflicts
(409), then mutation. Within a stage, return all safely and deterministically
detectable errors; never add errors from a later HTTP evaluation category.

Preserve `Cache-Control: no-store` wherever already contractual; WMS-003 requires
it on every response. Preserve existing bearer, Accept and JSON media-type
conventions. Only 401 carries `WWW-Authenticate: Bearer` on protected operations.
Do not follow redirects. Disabled WMS responses omit `Retry-After`.

## Standard error envelope (v0.8.0)

```json
{"code":"unauthorized","errors":[{"code":"unauthorized"}]}
```

The closed top-level object requires `code` (string) and `errors` (nonempty
array). Each closed detail requires `code` (string), and may contain only the
optional string fields `resource`, `resourceId`, `path`. Technical error codes
are stable and non-localized. Human-readable localized messages are outside the
wire error contract. No `message`, `status`, `timestamp`, stack trace or internal
implementation fields are accepted. HTTP status remains authoritative.

Legacy operations preserve their existing status and code and add one detail
with that same code; no new semantic distinctions are introduced. Existing
success schemas and headers remain unchanged. This required property addition
is incompatible with earlier closed error objects.

Use stable technical resource names and generic `resource` plus `resourceId`
when identity is useful. Never add contextual properties such as
`storageAttributeId`, `itemFamilyId`, `userId` or `moduleId` to errors.
`resourceId` is opaque to consumers. Use `path` only for useful request locations;
JSON body paths follow RFC 6901 JSON Pointer semantics (including escaping).
See [WMS-003](wms-003.md) for multi-error codes, context and evaluation stages.

## Compatibility roadmap

- v0.8.x requires and supports the top-level `code`.
- From v1.0, it is intended to remain supported but be marked deprecated;
  clients should consume `errors`.
- Do not remove top-level `code` in v1.x. Removal requires a later major version,
  no earlier than v2.0.

The v0.8.0 OpenAPI does **not** mark `code` deprecated.

## Public API versioning policy

The **erbas-contract semantic version is the public HTTP contract version**:
`vMAJOR.MINOR.PATCH`. Published Git tags identify immutable contract releases.
This release version is the authoritative API version until simultaneous
incompatible route generations are actually required. Avoid additional version
dimensions without a concrete need (KISS/YAGNI).

HTTP route paths are **not versioned by default**. Current routes remain
`/api/users`, `/api/modules`, `/api/wms/item-families`, and the other specified
`/api/...` paths. Reaching contract `v1.0.0` does not introduce `/api/v1/...`.
For example, erbas-contract v1.0.0 may still expose `/api/users`.
The contract release version and a route version are distinct concepts.

Compatible additions and corrections evolve on the same routes through normal
erbas-contract semantic-version releases, without changing route prefixes.
Breaking changes increment MINOR before 1.0 and MAJOR from 1.0 onward, according
to [release compatibility rules](versioning.md#compatibility-and-consumption-policy).
They do not automatically require versioned routes: when all consumers can
migrate together, a new contract major may retain the existing `/api/...` paths.

Introduce a prefix such as `/api/v2/...` **only** when there is a concrete
requirement to operate two incompatible public HTTP API generations
simultaneously during a migration or compatibility period. Do not add route
versioning speculatively. If introduced, route versioning becomes contractual
behavior: erbas-contract must explicitly specify its lifecycle, coexistence
period, compatibility rules and retirement policy.

`moduleApiVersion` independently represents compatibility of the ERBAS modular
architecture. It is neither the erbas-contract semantic version, a public HTTP
route version, a backend implementation version, nor a product release version.
Do not derive one of these versions from another.

Java, .NET, Angular and future consumers must explicitly declare/adopt a specific
published erbas-contract release. Unchanged `/api/...` paths alone do not imply
compatibility. This policy clarification is part of v0.8.0 preparation and does
not require another version increment or introduce versioned routes.
