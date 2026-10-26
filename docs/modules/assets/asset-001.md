# ASSET-001: Asset Management experiment design

Status: approved design task, 2026-10-26. This document defines the starting
decisions for a future implementation experiment in `alxarafe-dotnet`. It does
not claim implementation, runtime support, backend conformance or a published
Asset API. ASSET-001 changes documentation only. OpenAPI, Bruno, Resource Runtime
and Core remain unchanged. Subsequent tasks require separate approval in their
owning repositories.

## Purpose and acceptance

Build a useful initial ITAM module while testing ResourceDefinition,
FieldDefinition, types, constraints, annotations, relations, registry, runtime,
persistence, filters, CRUD and ResourceActionEndpoints. Asset-specific rules
must stay outside HTTP endpoints and the generic runtime. A runtime limitation
is a finding to report, not a reason to disguise manual CRUD as runtime support.

This design is accepted when it defines a minimal persisted creation, an
observable completeness boundary, immutable type, irreversible retirement,
dynamic definition evolution, integrity, permissions, test expectations and
independently verifiable implementation tasks. Implementation evidence is a
later deliverable; none is inferred from this document.

The experiment is initially implementation-specific under the
[extension policy](../../common/implementation-extensions.md). Promotion to the
shared contract requires an approved Java/.NET observable-behavior review,
OpenAPI changes and tests in the existing single Bruno collection. Java need
not reproduce .NET internals. No shared release increment is made here.

## Ownership and implementation boundaries

| Owner | Responsibility |
| --- | --- |
| Asset module | Resource registrations, domain rules, lifecycle, dynamic definitions/values, aggregate validation, actions, adapters, configuration and seed. |
| Resource Runtime | Existing generic routing, registry discovery, type and constraint evaluation, metadata transport, filtering and persistence integration where supported. No Asset, Vehicle, VIN or Manufacturer branches. |
| Core | Existing generic facilities only. No new dynamic-field framework, immutable annotation or presentation framework in ASSET-001. |
| Backend repository | Schema migrations, transactions, concurrency enforcement, native/integration tests, disposable PostgreSQL, readiness, builds and cleanup through its supported Docker workflow. |
| Contract repository | This design now; portable observable behavior and shared conformance only after separate approval. No backend provisioning or duplicate collection. |

Inspect actual runtime extension points before implementation. Reuse its types
and constraint evaluator for dynamic values; module code selects the definition
and invokes that evaluation, then checks cross-resource rules. Do not build a
second type parser, constraint engine or endpoint validation layer. A missing
generic hook must be reported with a reproducer and a separately scoped repair
proposal; it must not silently expand an Asset task into a Core redesign.

The initial module may enforce create-only assignment of `assetTypeId` itself.
Generic extraction candidates are evaluated only after real module evidence:
dynamic definitions/values, configurable constraints, presentation metadata,
immutable-after-create semantics and definition evolution. No extraction is
presumed necessary.

## Intended data model

Identifiers are opaque UUIDs. Server-owned `id`, `createdAt` and `updatedAt`
cannot be supplied or overwritten by clients. Timestamps use the runtime's
existing UTC DateTime representation. Dates remain dates, without timezone
conversion. Exact runtime wire encodings must be recorded in the first slice.

| Resource | Fields and essential rules |
| --- | --- |
| Asset | `id`, required `name`, required `assetTypeId`, optional `assetTag`, `serialNumber`, `manufacturerId`, `assetModelId`, `locationId`, `assignedToId`, `purchaseDate`, `purchasePrice`, `condition`, `notes`; server-controlled `lifecycle`, `statusId`, timestamps. |
| AssetType | `id`, `code`, `name`, optional `description`, `active`, timestamps. Types are persisted editable data, not compiled categories. |
| AssetFieldDefinition | `id`, `assetTypeId`, `code`, `name`, optional `description`, `fieldType`, `required`, optional `defaultValue`, `displayOrder`, `active`, `annotations`, `constraints`, timestamps. |
| AssetFieldValue | `assetId`, `fieldDefinitionId`, `value`; unique pair, no public independent CRUD required. |
| Manufacturer | `id`, `code`, `name`, `active`, timestamps. |
| AssetModel | `id`, required `manufacturerId`, `code`, `name`, `active`, timestamps. |
| Location | `id`, `code`, `name`, `active`, timestamps. No location hierarchy initially. |
| Person | `id`, `code`, `name`, `active`, timestamps. An assignee record, not an authentication account; no duplicate identity system or password fields. |
| AssetStatus | `id`, `code`, `name`, `active`, timestamps; system codes below have protected semantics. |

Catalogue codes are unique within their resource; model codes are unique per
manufacturer. Dynamic codes are unique per AssetType. Use exact case-sensitive
identity, no implicit case folding. Codes, definition `assetTypeId` and
`fieldType`, and model `manufacturerId` are immutable after creation in this
phase. Replacing a field type requires a new definition, not implicit conversion.
Definition presentation, constraints, requiredness, default and active state may
change subject to the validation policy below.

`name` must contain non-whitespace text. `condition` is optional UInt8 with a
domain range of 0..100: negative and 256 fail type validation; 101 and 255 fail
the domain constraint. `purchasePrice` is optional nonnegative Decimal; no
currency conversion or financial subsystem is implied. A present `assetTag`
must be nonempty and unique by exact comparison; omission/null means no tag and
multiple untagged assets are allowed. Invalid Unicode, including unpaired
surrogates and NUL, is rejected before persistence. The first slice must pin
runtime-supported string boundaries and encodings rather than guess support.

The physical schema stays stable when types and fields are added. Separate
definition and value tables are expected; JSONB is a candidate value storage
representation, not the authority on functional types. No per-field Asset
columns and no separate string/integer/date/boolean value columns. Decimal and
Int64 round trips must preserve exact values without binary floating-point
coercion. If the current runtime representation cannot do so, record a blocker
before claiming those types work.

## Lifecycle and completeness

Lifecycle is distinct from operational AssetStatus and is server-controlled.
Clients cannot write `lifecycle`, `statusId` or `assignedToId`, including by PUT,
PATCH, generic action arguments or alternate runtime mutation paths. Reject
these keys rather than silently ignoring them. `assetTypeId` is accepted only
on CREATE; on later writes an identical supplied value may be accepted as a
no-op, but a different value is always rejected. Full replacement cannot clear
or reset protected fields through omission.

| Transition/operation | Preconditions and result |
| --- | --- |
| CREATE with `name` + `assetTypeId` | Active existing type; persist immediately as `DRAFT`, `IN_STOCK`, unassigned. Return persisted identity and lifecycle. No required dynamic values needed. |
| Edit DRAFT | Validate every supplied standard and dynamic value; missing required dynamic values are permitted. Metadata/read reports incompleteness. |
| `complete` | DRAFT only; validate all required dynamic values and all current aggregate invariants atomically, then set `READY`. Status remains `IN_STOCK`. |
| Edit READY | Result must satisfy the entire aggregate, including every required dynamic field. There is no implicit return to DRAFT. |
| `retire` | READY and unassigned only; set `RETIRED` lifecycle and `RETIRED` status atomically. |
| Mutate RETIRED | Reject standard/dynamic PUT, PATCH, removal of values, all business actions and Asset DELETE. Reads remain available. No reactivate or alternate transition out. |
| DELETE non-retired Asset | Allowed with maintenance permission only if unassigned; atomically remove its owned values with the asset. This is explicit aggregate deletion, not deletion of shared masters. |

`complete` is the explicit additional business action required by two-phase
creation. Required means a non-null, type-valid, constraint-valid value is
present at completion and at every later aggregate write. `false` and zero are
values, not absence. Empty strings are allowed only if the field constraints
allow them. No API-wide weakening of required semantics is proposed.

Reads expose lifecycle plus a derived completeness result listing missing
required definition IDs. It is calculated from current definitions and values,
not an independently mutable flag. Drafts with all values remain DRAFT until
`complete`; a failed completion changes nothing. No new completeness resource,
automatic completion or background repair process is needed.

Optional defaults are validated when definitions are saved. CREATE materializes
defaults of active fields atomically; missing fields without defaults never
block minimal creation. Later default changes do not rewrite assets. No default
is silently backfilled during reads or requiredness changes. Inactive fields
receive no defaults. Existing inactive AssetTypes remain readable and their
assets remain editable/completable; inactive types cannot receive new assets.

## Dynamic values, metadata and mutations

Minimum intended types: String, Boolean, Int32, Int64, UInt8, Decimal, Date,
DateTime and UUID, using the runtime's own type identities. Unsupported types
must fail definition creation, with the limitation recorded. String constraints
include requiredness, min/max length, pattern and allowed set; numeric constraints
include minimum/maximum. Date bounds are included only if the existing generic
evaluator expresses them cleanly. Contradictory or type-inapplicable constraints
and invalid defaults are rejected when saving the definition.

Values are addressed by definition ID within an Asset aggregate. Read combines
the persisted type's definitions with values, including inactive definitions
with historical values. No Vehicle/Laptop conditional rendering is needed.
Metadata includes field type, constraints, requiredness, activity, order and
annotations such as `tab`, `placeholder`, `helpText`, `readOnly`, `searchable`.
Presentation annotations do not grant permissions, bypass validation or promise
search support. Sensitive mutability is enforced by module rules, never UI hints.

A single aggregate value command accepts a set of definition-ID/value entries;
PATCH upserts specified entries and explicitly removes specified optional
entries. PUT replaces the value set. Duplicate definition IDs, including an ID
both updated and removed, are invalid; never use last-write-wins parsing.
Unknown definitions and definitions of another AssetType fail. An inactive
definition rejects creation, modification and removal of its values. For PUT,
existing inactive entries must be retained unchanged; omission cannot delete
them. Only exact unchanged historical entries are allowed as no-ops.

Null denotes removal, never a persisted dynamic value; omission in PATCH means
unchanged. Removing required values is allowed only in DRAFT. READY mutations
validate the resulting complete set. Every command is atomic; one invalid entry
preserves all original values and timestamps. Standard Asset PUT/PATCH does not
implicitly replace dynamic values. Mutation paths share the same domain checks.
Exact routes and payload schemas are an implementation deliverable, not a new
wire contract in this task.

## Definition evolution and integrity

Before accepting any constraint/requiredness change or new required definition,
validate the proposed definition against all stored values of that type,
including DRAFT and RETIRED assets and inactive historical values. Also validate
required-value presence for every READY and RETIRED asset. A DRAFT may still
lack required values because its lifecycle explicitly allows incompleteness;
its existing values may never violate the proposed definition.

Reject the entire change if any value or completed asset would become invalid.
For example, reducing maximum seats from 9 to 5 fails if any stored seats value
is 7. Adding an optional field preserves existing assets. Adding a required
field succeeds only when the above checks pass; a default alone is insufficient
to backfill missing values. The initial phase provides no migration endpoint:
add the field as optional, populate existing assets explicitly, then make it
required. An unfillable retired asset blocks that promotion. There is no hidden
exception for old data and no automatic downgrade to DRAFT.

Deactivation preserves values and requiredness. Existing values remain readable
and immutable while inactive. A missing inactive required field prevents
completion; an administrator must reactivate it before it can be filled. A
definition with values cannot be physically deleted; return conflict and allow
deactivation. An unreferenced definition can be deleted only if it is optional;
to remove an unused required definition, first make it optional through the
same compatibility check. This avoids bypassing policy through deletion.

| Relationship | Integrity rule |
| --- | --- |
| Asset → AssetType | Required existing active type at creation; immutable thereafter. Referenced type cannot be deleted, including when only definitions reference it. |
| Asset → Manufacturer/AssetModel | Optional; selecting a model requires its manufacturer to be explicitly selected and equal to the model's manufacturer. No inferred correction. Clearing/changing manufacturer with an incompatible retained model fails. |
| Asset → Location/Person/AssetStatus | References must exist. New assignments/selections require active targets. Existing inactive references remain readable and can be cleared through permitted operations. |
| AssetModel → Manufacturer | Required, immutable reference. Referenced manufacturer cannot be deleted. |
| AssetFieldDefinition → AssetType | Required, immutable reference. |
| AssetFieldValue → Asset/Definition | Both exist; definition belongs to asset's type; unique pair enforced in persistence as well as domain validation. |

All referenced masters, including people, statuses, models and locations, reject
physical deletion while referenced. No cascade through shared resources. A type
with definitions must have those definitions explicitly handled first. Master
deactivation preserves existing references. Reserved status rows cannot be
deleted, deactivated or recoded; display names may change. Nonreserved statuses
may be administered but are not selectable by assets in this initial lifecycle.

Definition validation and save, value mutation and completion, reference checks
and deletion, uniqueness, and retirement/assignment must be concurrency-safe.
Use backend-owned transactions/locking or equivalent enforcement; a pre-check
alone is insufficient. Race tests must prove that no successful combination
leaves invalid committed data. Failed operations preserve state and must not
expose database internals.

## Business actions and operational statuses

Seed reserved statuses: `ACTIVE`, `IN_STOCK`, `ASSIGNED`, `IN_REPAIR`, `RETIRED`.
Status codes have module-owned meaning; changing display labels does not alter
rules. Status and assignment have no generic CRUD write escape hatch.

| Action | Rules and outcome |
| --- | --- |
| `assign(personId)` | READY, active existing person, currently unassigned, status ACTIVE or IN_STOCK. Set person and ASSIGNED atomically. Reassignment requires unassign first. |
| `unassign` | READY and assigned; clear person and set IN_STOCK. Unassigned input conflicts. |
| `move(locationId)` | DRAFT or READY, active existing location; replace location. No lifecycle/status change. Same location is a successful no-op. |
| `setOperationalStatus(statusId)` | READY and unassigned; target is active reserved ACTIVE, IN_STOCK or IN_REPAIR. Same status is a successful no-op. Cannot set ASSIGNED or RETIRED. |
| `complete` | Completeness transition described above, performed by runtime action dispatch. |
| `retire` | READY, unassigned; irreversible lifecycle/status transition. Repetition conflicts. |

`setOperationalStatus` makes the seeded operational states usable without
allowing direct status manipulation. `assign`, `unassign` and `move` use normal
maintenance authorization; retirement and operational status changes require
the sensitive-action permission below. All actions validate exact arguments,
reject unknown keys and execute domain behavior through runtime action dispatch.
No action accepts an alternate asset type, lifecycle or arbitrary patch object.

## Permissions and observable API expectations

Proposed permission names follow the dotted resource/operation style of
[capability permissions](../../core/capabilities-001.md). These are experiment
permissions, not additions to published CORE RBAC.

| Permission | Grants |
| --- | --- |
| `assets.read` | Asset/catalogue reads, type/field metadata, historical values and supported filters. |
| `assets.maintain` | Create/edit/delete eligible assets, edit dynamic values, complete, assign/unassign/move; maintain non-schema masters such as manufacturers, models, locations and people. |
| `assets.schema.manage` | Create/edit/delete types and field definitions under integrity/evolution checks; administer status catalogue within reserved-row restrictions. |
| `assets.actions.sensitive` | Retire and setOperationalStatus, additionally requiring `assets.maintain`. |

Every mutation additionally requires `assets.read`; schema administration does
not imply asset maintenance or sensitive actions. No permission bypasses domain
invariants, even for administrators. Backend registration/bootstrap may grant a
test administrator all four permissions through existing facilities; no new
role editor, tenant policy engine or user settings framework is in this phase.
Native security tests need principals possessing each relevant subset.

Follow [HTTP conventions](../../common/api-conventions.md): authentication,
authorization and module availability precede input/domain validation. Intended
outcomes are 201 creation, 200 reads, 204 successful commands/deletion; 400 for
malformed JSON, duplicate keys, invalid Unicode, wrong types/constraints,
unknown fields and invalid action arguments; 401/403 for authentication/permission
failure; 404 for absent targets/references and unknown actions; 409 for immutable
type changes, lifecycle conflicts, uniqueness, mismatched existing relations,
inactive targets/fields, unsafe definition evolution and referenced deletions.
An incomplete `complete` is a 409 state conflict with missing-field details.
Module disablement follows existing runtime gating semantics and must be pinned
in the first slice, without changing shared behavior.

Reuse the existing error envelope with stable machine codes and useful field
paths; no new exception envelope. The first slice must record exact codes and
runtime mappings. Domain rule outcomes must be consistent across generic CRUD,
aggregate commands and actions; no endpoint-specific duplicate validators.
No following redirects, silent partial writes or success on failed validation.

Asset lists must support exact filters for type, location, operational status
and lifecycle, combined with AND before pagination and totals. Reuse runtime
filter syntax and collection facilities; pin supported syntax and deterministic
ordering in the implementation. Unsupported filters fail explicitly. No generic
joins or expansions are required. Relations expose stable target resource and
identifier metadata; they must not hard-code dropdown widgets, cardinality
thresholds or presentation-specific lookup routes. Automatic select/search
selection and global/tenant/user preferences are a later phase.

## Seed and first usable dataset

Backend-owned seed must be repeatable, use stable references, and not overwrite
user edits. All initial types and field definitions are ordinary persisted data
managed by the same rules as newly created types. Initial assets are READY and
pass `complete`-equivalent validation. Seed includes the five reserved statuses,
VEHICLE, LAPTOP, PRINTER and FURNITURE, plus the following definitions. Unmarked
fields are optional; minimum/maximum are inclusive.

| Type | Fields |
| --- | --- |
| VEHICLE | registrationNumber: required String length 7..10; vin: required String length 17; seats: required UInt8 1..9; firstRegistrationDate: Date; engineCapacity: Int32 0..10000; electric: required Boolean. |
| LAPTOP | cpu: required String; ramGb: required UInt8 1..128; storageGb: required Int32 64..16384; screenSize: Decimal 7..25; encrypted: required Boolean; hostname: String maximum length 63. |
| PRINTER | technology: required String; color: required Boolean; ppm: UInt8 1..255; networked: required Boolean. |
| FURNITURE | material: String; width, height, depth: Decimal minimum 0; fireResistant: Boolean. |

Manufacturers: Dell, Lenovo, HP, Apple, Toyota, Ford, Renault. Locations:
Almacén central, Oficina principal, Delegación Sevilla, Taller. Include at least
two active test people and an inactive person. Models: Dell Latitude 5450,
Lenovo ThinkPad T14, HP LaserJet Pro, Toyota Corolla, Ford Transit, each attached
to its manufacturer.

Seed Portátil administración 01 as Dell Latitude 5450, condition 90, cpu Intel
Core Ultra 5, ramGb 16, storageGb 512, screenSize 14, encrypted true, hostname
adm-laptop-01. Seed Furgoneta mantenimiento 01 as Ford Transit, condition 75,
registrationNumber 1234ABC, vin WF0XXXXXXXXXXXXXX, seats 3, electric false.
Use different locations/statuses to exercise filtering. Broader seed is not a
prerequisite for the first slice.

## Positive and negative acceptance matrix

These are future executable cases, not assertions that have already passed.
Every failed mutation requires a subsequent read proving no partial change.

| Area | Positive cases | Negative cases and expected result |
| --- | --- | --- |
| Identity | Minimal CREATE, immediate GET, persistence after restart | Missing name/type, blank name: 400; absent type: 404; inactive type: 409. |
| Standard writes | Rename, full PUT of writable general fields, partial PATCH, optional clears | Type replacement via PUT/PATCH: 409; protected/server fields, unknown keys or type replacement smuggled into action arguments: 400; omitted protected fields cannot reset state. |
| UInt8/domain | condition 0, 50, 100 | -1/256: 400 type; 101/255: 400 constraint; no numeric-string coercion. |
| Dynamic discovery | Metadata and ordered fields for a newly persisted type | Unknown definition: 404; definition from another existing type: 409. |
| Types | Round trip every minimum type, false/zero, exact Int64 and Decimal | Wrong JSON kind, malformed UUID/Date/DateTime, overflow: 400. |
| Constraints | Boundary lengths/ranges, allowed set and pattern match | Too short/long, below/above bound, pattern/set failure: 400; invalid definition/default: 400. |
| Completeness | Incomplete DRAFT persists; fill then complete; READY remains complete | Missing required field on complete: 409; removing required READY value: 400; no implicit completion. |
| Value editing | Add/change values, remove optional field, atomic PUT/PATCH | Duplicate ID/update-remove overlap: 400; invalid entry rolls back whole set; duplicate persisted pair cannot occur. |
| Definition uniqueness | Same code in different types | Duplicate field code within type, duplicate tag/catalogue code: 409; concurrent duplicates have one winner. |
| Evolution | Compatible relaxation, optional addition, explicit population then required promotion | Tightening invalidating existing values, new missing required field on READY/RETIRED: 409; no default-only bypass. |
| Inactive definitions | Historical read, unchanged PUT entry, reactivation and editing | Create/update/remove while inactive, including omitted PUT entry: 409; missing inactive required field blocks completion. |
| Definition deletion | Delete unused optional definition | Definition with values or unused required definition: 409; history preserved. |
| Relations | Valid required/optional references; clear optional selection | Missing relation: 404; model/manufacturer mismatch: 409; referenced master deletion: 409. |
| Actions | Assign, unassign, move, operational status change, retire | Missing person/location: 404; inactive person: 409; assign in repair, repeat assignment, retire assigned or DRAFT: 409; invalid args: 400; unknown action: 404. |
| Retirement | Read/filter retired asset and its historical values | All Asset/value mutations, deletion and actions on RETIRED: 409; direct lifecycle/status payload: 400; no reactivation path. |
| Parsing/security | Valid Unicode and authorized principals | Invalid JSON/Unicode/duplicate keys: 400; anonymous: 401; missing operation permission: 403; no unauthorized existence disclosure. |
| Collections | Filter by type/location/status/lifecycle, combined AND, pagination/totals | Invalid/unsupported filter or paging: 400; no fabricated expansion support. |
| Concurrency | Serializable valid outcomes | Race definition tightening vs value edit, required addition vs complete, reference delete vs create, assign vs retire: losing operation fails with no invalid committed state. |

End-to-end scenario: create a type and several fields as data; create its DRAFT
asset; read metadata; submit invalid values and observe unchanged state; correct
and save; complete and read READY; relax constraints successfully; reject an
incompatible tightening; add an optional field and verify existing validity;
reject required promotion until explicit population succeeds. Repeat promotion
with an unfillable retired asset and prove rejection. No schema migration may
occur when adding the type or fields.

## Subsequent tasks and acceptance gates

The tasks below are proposals, not approved implementation or authorization to
modify other repositories. Each includes native tests, required Docker checks,
documentation, scope review and its own local atomic commit in its owner.

| Task / owner | Scope and acceptance criteria |
| --- | --- |
| ASSET-002 / .NET | First vertical slice: inspect and record runtime APIs; register AssetType, Asset, AssetFieldDefinition and aggregate values; provide minimal reserved-status seed and read/maintenance/schema permission enforcement; persist one runtime-created type with required String and UInt8 fields; minimal DRAFT creation/read, name PUT/PATCH, immutable type, condition boundaries, metadata, dynamic evaluation and complete action. Restart proves persistence; invalid writes prove atomicity; required-field evolution rejects invalid READY assets. Run through registry/runtime routing and the existing evaluator, with no manual resource CRUD. Report blockers before extending Core. |
| ASSET-003 / .NET | Complete minimum dynamic type/constraint matrix, defaults, optional removal, inactive history, definition CRUD/evolution/deletion and associated concurrency tests. Execute the full new-type end-to-end scenario above. No schema changes from configuration operations. |
| ASSET-004 / .NET | Remaining masters, all references, permissions, reserved statuses and assign/unassign/move/setOperationalStatus/retire. Prove immutable type and retirement through every mutation path, integrity on deletion and model/manufacturer coherence. Test separate permission subsets and assignment/retirement races. |
| ASSET-005 / .NET | Full data-driven seed, complete CRUD coverage for eligible resources, filters, all remaining matrix cases and Docker-based full backend verification. Publish actual commands/results and code evidence; no repository check substitutes for live experiment tests. |
| ASSET-006 / contract, separately approved | Compare Java/.NET feasibility, security, semantics, complexity, maintainability and testability; decide which observable behavior merits sharing. Only then propose versioning, OpenAPI and additions to the sole Bruno suite. No requirement to clone the .NET runtime architecture. |
| ASSET-007 / runtime owner, separately approved | Evidence-based architecture review: runtime utility, repetition removed, business rules outside HTTP, relation/dynamic/action/evolution support, measured limitations and cost. Decide whether to retain the C# architecture and what Java would need to reproduce. Extract generic facilities only with proven domain independence and focused tests. |

ASSET-002 intentionally uses a narrow field/type set; the entire module is not
claimed complete until ASSET-003 through ASSET-005 pass. If a prerequisite is
missing, record the failing case, actual extension point and smallest repair
scope; obtain approval rather than silently implementing another task.

The architecture review must cite source paths, tests and actual results for
each success or limitation. Compare definition/business/persistence code with
HTTP glue to assess repetition; list any manual endpoint or duplicate validator
as a failure against the experiment's criteria. Do not declare the architecture
successful merely because a demo responds.

Later work includes automatic relation select/search based on cardinality and
global/tenant/user configuration, a complete UI with General/Additional tabs,
and optional Supplier, Purchase, Warranty, Maintenance, Attachment, AssetEvent
and AssetAssignment resources. No UI framework, audit subsystem, generic joins,
definition migration service or second metadata system is required here.
