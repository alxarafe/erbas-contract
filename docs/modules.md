# Module administration (CONTRACT-003)

Draft HTTP contract **0.5.0** adds minimal CORE/platform administration of modules.
OpenAPI is authoritative; the sole shared Bruno collection is backend-neutral.
The latest published release remains **v0.4.0**. Consumer adaptation is separate.

The cross-stack design uses concepts both Java and .NET can expose: registry
availability, a public descriptor, persistent enabled state and dependency-safe
transitions. Their existing administrator security and COLLECTIONS-001 behavior
apply here too. Module sets may differ, including no production modules in Java;
conformance therefore uses configurable test-only IDs. This specifies observable
HTTP behavior without requiring shared discovery or persistence internals.
The existing published operations remain unchanged, making this a compatible
minor addition. Neither backend is claimed conformant to the new draft yet.

## Public representation

`Module` is a closed object with exactly four required fields:

```json
{"id":"example-module","moduleApiVersion":1,"dependencies":[],"enabled":true}
```

| Field | Contract |
| --- | --- |
| `id` | Nonempty, stable, opaque, case-sensitive string. No format is imposed; do not derive meaning from class, package, assembly or file names. |
| `moduleApiVersion` | Integer at least 1, describing compatibility with the modular API. It is not a functional, package, ERBAS or HTTP contract version. |
| `dependencies` | Non-null array of unique nonempty required module IDs, in stable server-side id ASC order. No embedded Module objects. |
| `enabled` | Current persistent administrative boolean, independent of initialization and health. |

AVAILABLE means discovered by the backend's registry in this process. Only those
modules can be listed or modified. Historical state for an absent module is not
exposed; if it later returns, its retained state may apply again. Presence in the
collection implies AVAILABLE, so no redundant availability flag is published.
A technically initialized AVAILABLE module can be disabled. Disabling does not
remove endpoints, services, code or data and does not require restart.

## List modules

`GET /api/modules` returns `200 ModuleCollection`, the second application of
[COLLECTIONS-001](collections.md), after UserCollection:

```json
{
  "items": [],
  "offset": 0,
  "limit": 50,
  "total": 0,
  "order": [{"field":"id","direction":"asc"}]
}
```

Exactly `items`, `offset`, `limit`, `total`, `order` are required; extra properties
are rejected. Items are Module objects. Sort by stable server-side id ASC before
slicing; clients need not reproduce the internal comparison algorithm. Offset
is an integer at least 0 (default 0); limit is an integer 1–100 (default 50).
Total counts AVAILABLE modules before slicing. Zero modules or offset at/beyond
total returns 200 with empty items and complete metadata. No sorting/filter inputs
are introduced. Negative, nonnumeric, fractional or out-of-range pagination is
400 `invalid_request`, without clamping.

## Set enabled state

`PATCH /api/modules/{id}` accepts only the closed required boolean object:

```json
{"enabled":false}
```

A successful atomic persisted transition returns `200` and the complete Module
in its resulting state, effective immediately without restart. Setting the same
state is idempotent and also returns 200. Invalid JSON, arrays/scalars, missing,
null or nonboolean enabled, and extra fields (including descriptor edits) return
400. Unavailable IDs return 404 even if historical persisted state exists;
matching is case-sensitive.

Every enabled module must have all required dependencies enabled throughout the
graph, including indirect requirements. Enable of a dependent with a disabled
dependency and disable of a dependency used by an enabled dependent return 409.
No automatic cascades occur. Conflict leaves no partial persisted change.
Enable dependencies first; disable dependents first.

## Security and response metadata

Both endpoints require bearer authentication and `User.admin == true`, without
new RBAC. The observable order is authentication, administrator authorization,
then validation/lookup/operation. An unknown ID or invalid payload cannot bypass
401/403 precedence. For an authorized admin with both invalid body and unknown
ID, relative 400/404 precedence is intentionally unspecified.

| Status | Exact closed error body |
| --- | --- |
| 400 | `{"code":"invalid_request"}` |
| 401 | `{"code":"unauthorized"}` |
| 403 | `{"code":"forbidden"}` |
| 404 | `{"code":"module_not_found"}` |
| 409 | `{"code":"module_dependency_conflict"}` |

Every response is `application/json` with `Cache-Control: no-store`, without
redirects. Only 401 includes `WWW-Authenticate: Bearer`; 200/400/403/404/409 must
omit it. Errors expose no module/dependency IDs, messages, traces or details.
These endpoints belong to CORE, never a module gate, and remain accessible when
all modules are disabled. They do not return `module_disabled`; no unused shared
functional-module response is introduced.

## Conformance fixture and mutations

`./bin/test URL` requires an isolated disposable backend environment and four
nonempty variables:

- `ERBAS_TEST_EMAIL` and `ERBAS_TEST_PASSWORD`: existing enabled admin credentials.
- `ERBAS_TEST_MODULE_BASE_ID`: AVAILABLE mutable module with no dependencies.
- `ERBAS_TEST_MODULE_DEPENDENT_ID`: AVAILABLE mutable module whose dependencies
  are exactly `[BASE_ID]`.

IDs must differ. They are conformance inputs, not HTTP fields or credentials,
and do not mandate any production modules. Backends may provide test-only modules.
No other enabled module may depend on these fixtures in a way that interferes;
no concurrent administrators or external functionality may use them. The fixture
must have no module whose ID collides with a case-altered variant used for testing.
Names such as example-module above are documentation only.

The suite reuses its disposable non-admin user. It checks list/security,
pagination, closed representations, invalid PATCH bodies, unknown IDs and
idempotence. It verifies concrete fixture descriptors through PATCH responses
rather than assuming a first-page position or at most 100 installed modules.
Repeated descriptors and page windows verify deterministic representation and
ordering before pagination without imposing a JavaScript ID comparator on the
server. Native backend tests must also verify their own stable id ASC criterion.

The dependency sequence uses only the public API:

1. Enable BASE, then DEPENDENT; repeat BASE enable successfully.
2. Disable BASE: 409; confirm DEPENDENT can still be enabled, proving BASE was
   not disabled.
3. Disable DEPENDENT; repeat its disable successfully.
4. Disable BASE.
5. Enable DEPENDENT: 409; enable BASE, then disable BASE successfully, proving
   DEPENDENT stayed disabled.
6. Enable BASE, then DEPENDENT.

**The suite mutates persistent module state. Never run it against production.**
Success leaves both fixtures enabled; failure makes the environment disposable.
No backend rollback orchestration or hidden test endpoint is required.

Live fixtures may be arbitrary opaque IDs without safely alterable case, so the
suite does not impose an ID format or perform a live case-variant assertion.
Case-sensitive matching is specified in OpenAPI and checked by synthetic runner
tests; a consumer should also prove it in native tests. The runner's unknown-ID
case uses a newly generated ID. No backend-specific module IDs are hardcoded.

The sole collection has **129 requests / 501 named checks**, adding **47 requests
/ 188 checks** after the existing sequence 1–82. Synthetic verification adds 19
deliberate module faults plus fixture-input, empty/case-sensitive/atomic-state and
opaque-ID tests beyond the first 100 modules. Four shared folder assertions run
for each module request, giving 501 executed named checks (317 test declarations).
Faults cover extra/missing fields, invalid version/dependencies/enabled,
ordering/pagination, security statuses, accepted invalid payloads, 404 status/body,
accepted dependency violations, partial state changes despite 409, incorrect
409/state, caching and unexpected bearer challenge. The runner explicitly
executes root requests first, then the modular folder. The synthetic suite has
91 tests. `bin/check` supplies its own fixture variables and validates the runner,
not any real backend. Earlier dated reports retain their historical counts.

## Repository verification (2026-10-12)

`./bin/check` passed: OpenAPI validated and all 91 synthetic/unit tests passed,
without failures, cancellations or skips, in 455.2 seconds. The expanded battery
has a bounded 600-second watchdog; HTTP and Bruno limits remain 2 and 30 seconds.
Shell syntax, `git diff --check` and sequence/check-count inspection passed.
The successful command includes owned-runner cleanup verification. No external
backend was tested. Existing OpenAPI paths/components and the original 82 Bruno
requests were compared with the baseline and preserved unchanged.

## Excluded scope

No consumer implementation or frontend, external plugin loading, installation,
uninstallation, purge, reload, restart, configuration, per-module health,
operational state, package-version management, capabilities, search/filter,
module detail/create/delete endpoints or module-specific permissions are added.
