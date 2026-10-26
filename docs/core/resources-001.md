# CRUD-CONTRACT-001: Generic Resource Runtime protocol

This is the v0.13.0 local, unpublished additive candidate. Existing APIs and
their contracts remain unchanged. No candidate publication or consumer adoption
is claimed. The protocol describes observable HTTP behavior, not a framework,
database, permission-policy naming scheme or business module.

## Routes and identity

| Method and path | Result |
| --- | --- |
| GET `/api/meta/resources` | Array of enabled resource summaries |
| GET `/api/meta/resources/{resource}` | Complete metadata; 200 or conditional 304 |
| GET `/api/resources/{resource}` | ResourcePage |
| GET `/api/resources/{resource}/{id}` | Flat scalar record |
| POST `/api/resources/{resource}` | 201 record and Location pointing to its item URI |
| PATCH `/api/resources/{resource}/{id}` | 200 updated record |
| DELETE `/api/resources/{resource}/{id}` | 204 without body; absent row 404 |
| POST `/api/resource-actions/{resource}/{action}/execute` | 204 without body |
| POST `/api/resource-actions/{resource}/availability` | Array of contextual action states |

All routes require existing bearer authentication. Resource IDs and record IDs
are distinct. Use the metadata `idDefinition.field` and its scalar type; encode
item IDs as URI text and action IDs as their JSON scalar. Do not infer business
meaning or reproduce server ID ordering. Supported ID types are UUID, STRING
and the declared integer types. A resource need not declare every operation.
Undeclared operations return 405 with Allow. Non-list operations and metadata/
action endpoints reject query parameters except the documented metadata header.

## Explicitly scoped evaluation precedence exception

This section applies **only** to the Generic Resource Runtime routes above.
The legacy [HTTP conventions](../common/api-conventions.md) remain authoritative
for Users, Modules, WMS and other existing APIs. There is no new general ERBAS
precedence rule. Future unification requires deliberate protocol compatibility
and security review, not a documentation-only change.

For CRUD, the observable stages are:

1. HTTP authentication.
2. Resource definition lookup (unknown resource 404).
3. Transport checks: forbidden query parameters; typed ID, body or list-query
   parsing as applicable. Malformed JSON/types/grammar can return 400 here.
4. Execution lookup and operation-declared check (405).
5. Module-enabled guard (503), then execution scope/context resolution,
   including authoritative tenant resolution when applicable (403 on denial).
6. Operation authorization (403).
7. Runtime identifier/input/query validation, defaults and immutable checks.
8. For PATCH, current-row read, complete-record and merged-record validation;
   module validation, execution, then output validation.

Consequently a syntactically invalid request from an authenticated caller may
return 400 before permission evaluation; an unknown resource may return 404;
and a disabled module may return 503 before permission denial. Transport parsing
may also precede the undeclared-operation check. Runtime validation of parsed
fields follows authorization. These distinctions are intentional preserved
protocol behavior, not guidance for changing existing endpoints.

Action execution authenticates, rejects query parameters, resolves resource and
action, parses the envelope/typed targets/parameters, then performs execution
lookup, module and context guards, action authorization, target and parameter
validation/defaults, availability recheck, handler execution and outcome mapping.
There is no requirement for a corresponding CRUD permission: effective action
authorization is separate. Required execution context still applies.

Availability authenticates, checks query/resource/envelope/target transport,
then module/context guards. It selects the requested scope and evaluates each
action's authorization first. Unauthorized states are false/false with no reason
and no contextual provider evaluation. Authorized actions validate their target
and evaluate contextual availability. A resource with no actions in that scope
returns an empty array. Availability is advisory; execution always rechecks it.

Metadata authenticates, rejects queries and resolves the definition, then
projects module state and effective operation/action authorization. It does not
run CRUD tenant guards or require a CRUD permission. Authenticated callers can
discover definitions with unauthorized operations. Discovery omits disabled
resources; direct metadata can report `moduleEnabled=false`. Conditional GET is
evaluated after projection, so changing permissions/module state invalidates
the representation. Both metadata endpoints use private, no-cache and Vary Authorization. Detailed
metadata alone supplies the opaque ETag/conditional GET; neither endpoint provides
a record concurrency/versioning protocol.

## Record creation and partial modification

Records and inputs are flat objects with canonical scalar properties, not a
`fields` wrapper. Unknown properties are invalid. Server-generated/read-only
properties cannot be supplied. CREATE applies a declared default only when a
property is absent, and checks required presence after defaults. Explicit null
is a value; it requires nullable metadata and never invokes a default.

PATCH is a partial field-object update, not replacement, JSON Merge Patch
deletion semantics, or JSON Patch operation arrays. Omitted properties preserve
their current values and CREATE defaults are not reapplied. Explicit null clears
only nullable fields. Required means presence; nullable is independently declared.
The merged record must satisfy the definition. An immutable field may be supplied
on CREATE if writable, but supplying it in PATCH conflicts even if unchanged.
A structurally/type-invalid immutable input remains 400; a valid immutable input
returns 409. Changing the identifier is invalid input (400). Business-state or
integrity conflicts are 409; constraints/invalid input are 400. No PUT is added.

## Scalars and constraints

The type catalogue is BOOLEAN, STRING, TEXT, INT8, UINT8, INT16, UINT16, INT32,
UINT32, INT64, DECIMAL, UUID, DATE, TIME, DATETIME, ENUM and BINARY. Integer ranges
and numeric constraints are exact; clients must not round values through binary
floating point. DECIMAL can exceed machine numeric precision. DATE is yyyy-MM-dd,
TIME output is HH:mm:ss.fffffff (input permits zero to seven fractional digits),
DATETIME is an instant normalized
to UTC, UUID is canonical UUID text, BINARY is base64 and ENUM uses declared
strings. Invalid Unicode, incompatible JSON types and nonfinite numbers are
invalid input. Current numeric transport bounds are 4,096 digits/scale magnitude;
body size is bounded and clients must not assume unbounded inputs.

Constraints expose minimum/maximum and exclusivity, multipleOf, precision/scale,
minimum/maximum text length and pattern where applicable. These are validation
metadata, not presentation widgets. The server remains authoritative, including
regular-expression patterns that a client cannot safely interpret. Required does
not independently mean nonblank. Resource-specific business invariants need not
be expressible as field constraints.

## Queries and pages

Only offset, limit, search, repeated sort and repeated filter are accepted.
Each filter value is URL-encoded JSON with exactly field, operator and value;
duplicate keys and extra/unknown members are invalid. Filters combine with AND.
Field eligibility comes from capabilities.filterable and filterOperators:

| Type | Initial eligible operators |
| --- | --- |
| STRING/TEXT | eq, ne, lt, lte, gt, gte, contains, startsWith |
| Numeric/DATE/TIME/DATETIME | eq, ne, lt, lte, gt, gte |
| BOOLEAN/UUID/ENUM/BINARY | eq, ne |

Nonfilterable fields advertise an empty operator array. Null is accepted only
for nullable fields and only with eq/ne. Filter operands use canonical field
types and applicable declared constraints; contains/startsWith accept literal
text fragments. Local reference IDs can be filtered if advertised. No relation
paths, joins, expansion, OR/NOT tree, projection or select is contracted.

Repeated sort names preserve priority; leading `-` means descending. Duplicate
sort fields are invalid. Servers supply deterministic final ordering for unchanged
data; clients must not reconstruct identifier comparisons. Search is a literal,
case-sensitive substring match across advertised searchable fields, combined
with filters, without trimming/tokenization/stemming/fuzziness. Whitespace-only
or over-512-character search is invalid; resources without searchable fields
reject search. Storage/domain-specific representability constraints may reject
otherwise well-formed text with 400.

Offset defaults to 0 and is nonnegative; limit defaults to 50 and is 1..100.
Each is supplied at most once as unsigned base-10 integer text. No clamping.
Filters/search and ordering precede offset/limit. ResourcePage requires items,
offset and limit. Total is optional and omitted, not null, when unavailable; when
present it counts matches before paging, including empty/beyond-end pages. No
order member is introduced. Existing shared collection schemas retain mandatory
total/order without modification. An empty match/window is 200, never 404.
No cursor or snapshot consistency over concurrently changing data is promised.
For nullable fields, eq null selects absence and ne null selects presence.
A non-null ne operand includes absent nullable values; ordered comparisons and
text fragments exclude them. Nullable sorts place null last ascending and first
descending. These are the proven observable initial semantics; no null-order
switch is added. Text ordering remains stable server-defined ordering; clients
must not reproduce it locally.

## Metadata and presentation

Summaries expose id, version, moduleId, definitionHash, operations and metadataPath.
Detailed metadata adds idDefinition, moduleEnabled, fields, relations, actions,
annotations and optional presentation. Hashes are opaque structural identities;
they are not record versions. Operations list declared/authorized for list, get,
create, update, delete. Authorization is necessary but not a promise that context,
availability, transport or business validation will allow execution. Internal
permission names, policies, claims and persistence mappings are never exposed.

Fields expose name, canonical type, nullable, required, readOnly, immutable,
optional default (including explicit null), constraints, capabilities, enumValues
and annotations. Field capabilities include explicit filterOperators, filterable,
sortable and searchable. MANY_TO_ONE relations expose name, targetResource,
localField, targetField, nullable displayField and required state. They describe
references, not automatic joins, lookup editor choice or destructive cascades.

Annotations carry vocabulary/term and typed values. Common.Label supplies labels;
UI.Hidden, UI.FormExcluded and UI.SelectionFields retain existing display hints.
Unknown annotations must not grant authority or change validation. Optional form
presentation contains ordered tabs, sections, groups, field references and action
placements, labels, collapse flags and unsaved-change policy. Array order in that
layout is meaningful. Absence permits a client's simple field-based fallback.
No UI toolkit, automatic relation-editor policy or lifecycle graph is prescribed.

## Actions and errors

Actions expose name, scope (ENTITY/COLLECTION/SELECTION), requiresSelection,
authorized, annotations and typed parameters with nullable/required/default,
constraints, enums and annotations. ENTITY execution uses target:{id}; SELECTION
uses target:{ids} (1..100 unique typed IDs); COLLECTION omits target. Parameters
are an optional flat object unless required input demands them. Omission/default/
explicit-null rules follow scalar metadata. Availability requests use scope plus
id/ids for ENTITY/SELECTION, and scope alone for COLLECTION.

States contain name, authorized and available, with an optional technical
unavailableReason only for contextual denial. No provider-specific reason is
revealed for unauthorized actions. An implementation may have no contextual
restriction/provider; available=true is not a workflow guarantee. Successful
execution returns 204; clients refresh affected views. Selection is an action
target, not a bulk CRUD or partial-failure protocol.

The existing closed ErrorResponse is reused: code and nonempty errors; detail
code plus optional resource/resourceId/path. HTTP status is authoritative.
No localized message, exception text, policy name or persistence information is
added. Error responses retain no-store; protected 401 uses WWW-Authenticate Bearer.
Stable generic codes include invalid_request (400), unauthorized (401), forbidden
(403), resource_not_found/resource_action_not_found (404), resource_conflict,
resource_action_conflict/resource_action_unavailable (409),
resource_operation_not_supported (405), resource_execution_failed (500) and
module_disabled or missing execution-adapter codes (503). Context-denial codes
may identify the existing authoritative execution-context failure. A nested
conflict reason is technical; clients must handle unknown business reasons.
Conflicts are explicit outcomes, never inferred from human exception messages.

## Conformance and client scope

The sole Bruno collection adds a resources scope and includes it in full runs.
An administrator/disposable deployment must provide at least one accessible
UUID-ID catalogue with required writable STRING code/name, immutable code,
BOOLEAN active default true, one optional nullable writable text field and all
five CRUD operations. Its normal rules must permit the CRUD-PROBE code and
First/Edited labels. At least one authorized ENTITY action with UUID target is
also discoverable. This is a neutral test profile, not a required business model
for every resource. Discovery chooses it without backend/module-name branches.
Fixtures test the runner only. Backend tests prove typed query execution,
action success/scopes, presentation, contextual availability and business integrity.
The shared profile safely checks action metadata, collection availability,
invalid execution, permission denial and unknown action; it does not invoke an
arbitrary business action or claim its domain effects are portable.

The first client can implement discovery, static grids/forms, advertised filters,
sort/search/paging, create/PATCH/delete, reference lookups, action dialogs and
common errors. It must preserve exact numeric input/output and respect effective
capabilities. Dynamic business-schema binding, record concurrency, inverse/many-
to-many navigation, bulk CRUD and workflows remain separate future protocols.
