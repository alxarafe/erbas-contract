# RESOURCE-PRESENTATION-001: contextual resource presentation

This is the **unpublished v0.14.0 candidate**, an additive extension over immutable
[v0.13.0](../releases/v0.13.0.md). No backend/client implementation or adoption,
tag, release or publication is claimed. See [candidate notes](../releases/v0.14.0.md).

Generic CRUD is the primary presentation path for standard resources. Modules
declare semantics and conceptual structure; clients choose components, renderers,
design systems and themes. Specialized screens are explicit extensions for UX
that cannot reasonably be expressed through these shared patterns. A generic
improvement benefits every resource using its pattern.

## Audit and compatibility decision

The published ResourceDefinition wire projection is `ResourceMetadata`; this
repository does not prescribe a backend registration class. It already includes
field semantics, annotations, MANY_TO_ONE relations, effective operation/action
capabilities and optional `presentation.form`. That form contains behavior,
actions and ordered tabs → sections → groups → field-name references. Container
labels, collapse flags and action references already exist. Fields use
Common.Label; UI.Hidden and UI.FormExcluded supply static hints. Absence of form
presentation permits field-order rendering. There is no published list-column or
resource-level primary/secondary-display-field schema. UI.SelectionFields is not
a column declaration; relation `displayField` describes a target's reference label,
not the source resource's primary representation.

`ResourceMetadata` and `ResourcePresentation` are **closed objects**. Adding even
optional contexts directly to them would break v0.13.0 validators and violate the
repository compatibility policy. Encoding nested forms as string annotations
would conceal a second untyped layout language. Neither approach is used.

Instead, one new GET endpoint supplies the contextual recommendations. Every
published path and component remains unchanged. New clients can consume legacy
resources and old clients continue reading exactly the same metadata/form shape.
The candidate is a **compatible additive MINOR**; no permissive-schema relaxation,
consumer validator change or request negotiation is required.

## Discovery, identity and HTTP behavior

`GET /api/meta/resources/{resource}/presentation` is discoverable by appending
`/presentation` to each resource summary's canonical `metadataPath`, preserving its
encoded resource segment and supplied base URL. It introduces no registry or
second collection. Its `200` response is:

```json
{
  "id": "example.asset",
  "definitionHash": "opaque-definition-identity",
  "presentation": {
    "list": { "columns": [{ "field": "name", "label": "Asset name" }], "actions": [] }
  }
}
```

The response and every context object are closed. All four members of
`presentation` (`list`, `create`, `edit`, `view`) are optional; `{}` is valid.
`id` and `definitionHash` must match detailed metadata before applying a document.
The definition hash includes changes to contextual declarations, so unrelated
definitions/layouts cannot be combined. No new hash algorithm or record-version
semantics is prescribed. On a mismatch, invalidate/refetch metadata or report an
invalid representation; never apply a mismatched layout.

Bearer authentication precedes query rejection and resource lookup. No query
parameters are accepted (`400 invalid_request`); unknown resources return
`404 resource_not_found`. An unauthenticated request returns the existing closed
`401 unauthorized` error and Bearer challenge. Other failures reuse the closed
common error envelope, safe `500 resource_execution_failed`, and no-store. There
is no CRUD/tenant permission requirement for metadata discovery. Like existing
metadata, declarations do not grant access to records; disabled/unauthorized
operations remain governed by the detailed effective metadata and backend guards.

Successful responses use an opaque quoted ETag, `Cache-Control: private, no-cache`
and `Vary: Authorization`. Authenticate and resolve the current representation
before evaluating If-None-Match. A match returns 304 with those same headers and
no body. ETags and cached documents are scoped to the active backend/authentication
context; clear them on logout/context change. Context declarations are static,
not selected by user, record state or permission. They are not field permissions.

An adopting v0.14.0 server must return 200 with `presentation: {}` for an existing
legacy definition without contextual declarations. A v0.13.0 server may lack this
new route; after valid legacy metadata, a newer client may treat that route's 404
as unavailable and render legacy presentation. This is client interoperability,
not v0.14.0 conformance: the new shared suite requires the endpoint for discovered
resources. Authentication errors, server failures and malformed documents are not
equivalent to absence. Do not silently accept invalid contextual data as fallback.

## Resolution and ordering

| Context | First choice | If absent | If also absent |
| --- | --- | --- | --- |
| CREATE | `presentation.create` | detailed metadata `presentation.form` | metadata field order |
| EDIT | `presentation.edit` | detailed metadata `presentation.form` | metadata field order |
| VIEW | `presentation.view` | detailed metadata `presentation.form` | metadata field order |
| LIST | `presentation.list.columns` | metadata field order | — |

CREATE/EDIT/VIEW reuse the **exact v0.13.0 form schema**, including behavior,
actions, tabs, sections, groups, optional labels and field references. There is
no wrapper `form` inside these contexts and no separate layout language per mode.
Do not flatten a form hierarchy to invent list columns. LIST and forms serve
different purposes; the legacy form never overrides list column order.

A present context selects its exact ordered field subset. Do not merge its fields
with the legacy form or append omitted fields. A present empty array/layout is
intentional, not missing. In legacy form fallback, keep placement order and append
unplaced eligible fields once, in metadata order; unknown/repeated legacy
references cannot manufacture fields or duplicate controls. This preserves the
existing generic fallback behavior without imposing new validation on v0.13.0.

Array order is authoritative at every level. Do not alphabetize, rank or re-sort
columns, tabs, sections, groups, fields or action placements. Contexts may reuse
the same fields and container IDs independently. In each explicit context, field
and action references must exist in metadata and occur at most once, including
across different containers. Tab IDs are unique within the form, section IDs
within a tab, group IDs within a section. Unknown references and duplicates are
invalid declarations and must not be published. Conformance rejects them. The
backend chooses its internal definition validation mechanism.

Existing static display hints take precedence over placement: UI.Hidden=true
excludes the field in every context; UI.FormExcluded=true excludes it from forms,
including VIEW, but not LIST. Placement cannot re-enable either hint. Clients
prune empty groups/sections/tabs after projection, retaining containers with
eligible actions. Missing form presentation uses a simple field-based form.
Labels remain plain semantic text, never HTML, CSS, component names or code.

## Field and query authority

Resource field semantics alone determine type, required, nullable, defaults,
constraints, immutability, relation identity and write rules. Contexts only arrange
references. A writable immutable `assetTypeId` can appear in CREATE; in EDIT it
must remain noneditable/excluded from PATCH, even if the layout includes it.
VIEW uses read-only field presentation, without changing the underlying metadata.
Omitting a required field never waives required/default/business validation;
modules should place needed CREATE inputs to provide a usable generic form.

LIST `columns` is an ordered array of `{field, label?}`. Membership supplies
visibility, so no second visible/hidden flag is introduced. References are unique
by field, even when labels differ. A column label overrides a valid Common.Label,
then the field name is used. Omitted columns do not redact server records or
remove their functional semantics. Relations still use the existing MANY_TO_ONE
metadata; there is no join, expansion or lookup-specific protocol.

Column order does not order records. Filtering, search, sorting, pagination,
declared operations, authorization and action availability remain in their existing
protocols. There is no primary/secondary-field role, pixel width, responsive grid,
dashboard, card layout, renderer identifier or toolkit-specific property.

## Actions and limits

| Context | Existing scopes permitted for placement |
| --- | --- |
| CREATE | COLLECTION |
| EDIT / VIEW | ENTITY |
| LIST | COLLECTION / SELECTION |

Forms retain form/tab/section action placements; LIST has one ordered `actions`
array. Unplaced eligible actions use an ordinary action area after explicit
placements, in metadata action order. Unauthorized actions are not rendered.
Availability and required targets/parameters are still evaluated by the existing
action protocol; a visible action is not necessarily enabled. SELECTION actions
need selected record IDs; ENTITY actions need a persisted ID. CREATE has no entity
ID, draft target or new CREATE action scope. Its COLLECTION actions are independent
operations, not creation hooks or a substitute for the ordinary CRUD submit.
VIEW may expose authorized entity actions; read-only fields do not revoke action
authority. The existing `requiresSelection` semantics are unchanged.

No field-level authorization, calculated fields, state-dependent layouts, DMS,
capability/extension registry, runtime TypeScript, frontend components, backend
implementation or API behavior outside this additive endpoint is introduced.
An AI consumer can discover presentation recommendations separately from the
resource's functional metadata. Layout presence, omission or labels never imply
meaning, writable state, permission, availability or a permitted action sequence.

## Portability and conceptual fixture

.NET can project existing ResourceDefinition/form DTOs through a separate GET;
its startup-frozen registry can hold optional per-context DTOs without changing
CRUD guards or persistence. Java can use equivalent records/POJOs, module-owned
declarations and a Spring metadata handler. Neither requires Angular or shared
framework internals. A common client resolves one recommendation document and
reuses its hierarchical renderer. Separate projection preserves strict v0.13.0
consumers at the cost of one cacheable GET; the definitionHash check prevents
combining versions. No stack is claimed to implement this candidate.

The [conceptual fixture](../../tests/fixtures/resource-presentation.mjs) models an
Asset using generic field/relation/action DTOs only:

- CREATE references `assetTypeId`, then `name`.
- EDIT references the complete field set in metadata order.
- VIEW references the complete set in an independently specified read order.
- LIST references a representative subset and may supply a list-specific label.

The immutable reference, default/null/constraint semantics and relation metadata
remain identical across contexts. Neither the schemas nor the conformance oracle
contains Assets-specific resource IDs, policies or business lifecycle rules.

## Verification

The sole Bruno collection validates every discovered resource's presentation,
including legacy `{}`, known field/action references, uniqueness, allowed scopes,
definition binding, private caching/304, anonymous access, unknown resource and
query rejection. Synthetic fixtures test the runner, not a backend.
Node runner tests cover each context, deterministic resolution, empty versus
missing definitions, coexistence, unknown/duplicate references, hierarchy, labels,
static hints, action authority and unchanged field semantics. JSON Schema tests
validate fixtures and reject permission/CSS properties. A frozen full v0.13.0
OpenAPI comparison (excluding only release info and verified new aliases)
preserves every published path/component; prior release hashes remain unchanged.
