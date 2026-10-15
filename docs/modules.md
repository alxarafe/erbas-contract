# Module administration (CONTRACT-003)

Current v0.8.0 preparation follows [API conventions](api-conventions.md), including
the required `code` + nonempty `errors` error envelope. Statuses and technical
codes below retain their meaning. Published immutable baseline is v0.7.0.
No v0.8.0 consumer adoption or conformance is claimed.

Published HTTP contract **v0.6.0** includes minimal CORE/platform administration
of modules through CONTRACT-003 and canonical development/conformance modules
through CONTRACT-003A. OpenAPI is authoritative; the sole shared Bruno collection
is backend-neutral. See [release identity](versioning.md). Java and .NET now pin
v0.6.0 and own their separate conformance verification.

The cross-stack design uses concepts both Java and .NET can expose: registry
availability, a public descriptor, persistent enabled state and dependency-safe
transitions. Their existing administrator security and COLLECTIONS-001 behavior
apply here too. Module sets may differ, including no production modules in Java;
conformance therefore uses canonical development modules shared by both stacks.
This specifies observable HTTP behavior without requiring shared discovery or
persistence internals.
The existing published operations remain unchanged, making this a compatible
minor addition. Published [WMS-001](wms-001.md) adds the `erbas.wms` business descriptor and gated
UoM routes without changing CORE administration. Published [WMS-002](wms-002.md)
adds Storage Attributes under that gate. Unpublished [WMS-003](wms-003.md) adds
families and associations under the same module.

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
| 400 | `{"code":"invalid_request","errors":[{"code":"invalid_request"}]}` |
| 401 | `{"code":"unauthorized","errors":[{"code":"unauthorized"}]}` |
| 403 | `{"code":"forbidden","errors":[{"code":"forbidden"}]}` |
| 404 | `{"code":"module_not_found","errors":[{"code":"module_not_found"}]}` |
| 409 | `{"code":"module_dependency_conflict","errors":[{"code":"module_dependency_conflict"}]}` |

Every response is `application/json` with `Cache-Control: no-store`, without
redirects. Only 401 includes `WWW-Authenticate: Bearer`; 200/400/403/404/409 must
omit it. Errors expose no module/dependency IDs, messages, traces or details.
These endpoints belong to CORE, never a module gate, and remain accessible when
all modules are disabled. They do not return `module_disabled`; no unused shared
functional-module response is introduced.

## Conformance fixture and mutations

`./bin/test URL` requires an isolated disposable backend environment with an
existing enabled administrator (`ERBAS_TEST_EMAIL` and `ERBAS_TEST_PASSWORD`)
and these two AVAILABLE, mutable canonical development modules:

| Module ID | Required dependencies |
| --- | --- |
| `erbas.dev.math` | `[]` |
| `erbas.dev.statistics` | `["erbas.dev.math"]` |

Both descriptors have a positive integer `moduleApiVersion` and a boolean
`enabled`, as defined by Module. IDs are case-sensitive; `erbas.dev.*` is reserved
for ERBAS development infrastructure. These modules serve development,
integration, technical demonstrations and shared contract conformance. They are
not business modules or mandatory production modules: normal production must
be able to start without them, and must not register them by default.

The backend controls composition and therefore AVAILABLE. Module has no
`developmentOnly`, `testOnly`, environment or source field. Future Java and .NET
implementations may use profiles, environments, conditional registration or a
development/conformance ModuleSource idiomatically; the HTTP contract specifies
none of those mechanisms. The runner uses the canonical IDs directly, with no
configurable module-ID environment variables. Its synthetic fixture uses the
same descriptors.

No other enabled module may depend on these fixtures in a way that interferes;
no concurrent administrators or external functionality may use them. Other
AVAILABLE modules are allowed. The suite checks both descriptors through GET,
following pages until both are found or the collection ends, and through PATCH
responses. It assumes neither positions nor a maximum of 100 installed modules.
It reuses its disposable non-admin user and checks security, pagination, closed
representations, invalid bodies, unknown IDs and idempotence. Repeated
descriptors and page windows check deterministic representation and ordering
before pagination without imposing a JavaScript ID comparator on the server.
Native backend tests must also verify their own stable id ASC criterion.

The dependency sequence uses only the public API:

1. Enable Math, then Statistics; repeat Math enable successfully.
2. Disable Math: 409; confirm Statistics can still be enabled, proving Math was
   not disabled.
3. Disable Statistics; repeat its disable successfully.
4. Disable Math.
5. Enable Statistics: 409; enable Math, then disable Math successfully, proving
   Statistics stayed disabled.
6. Enable Math, then Statistics.

**The suite mutates persistent module state. Never run it against production.**
Success leaves both fixtures enabled; failure makes the environment disposable.
No backend rollback orchestration or hidden test endpoint is required.

Case-sensitive matching remains specified in OpenAPI and checked by synthetic
runner tests. The unknown-ID case uses a newly generated ID. No production
business module is assumed by the suite.

The historical published v0.5.0 collection has **130 request definitions / 506 named checks** for the
two-module synthetic fixture: 48 module requests, including the paginated GET
descriptor discovery, follow the unchanged sequence 1–82. Four shared folder
assertions run for each module request; discovery adds one named check. Each
additional discovery page executes those five checks again. There were 318 test
declarations. That synthetic suite had 96 tests and 24 deliberate module faults.
These included absent Math/Statistics, missing/incorrect Statistics dependency,
accepted disable/enable conflicts, partial changes despite 409, malformed
representations, pagination, security, errors, caching and bearer headers.
A positive fixture places both canonical modules beyond the first 100 entries.
`bin/check` validates the runner, not any real backend. Earlier dated reports
retain their historical counts. Current full collection counts are in
[v0.8.0 preparation](releases/v0.8.0.md).

## Future fixture capabilities

Math will provide a minimal public mathematical capability (for example,
`add(a, b)`). Statistics will consume that public capability for an operation
such as `average(values)`, rather than duplicating the arithmetic. It must not
access Math's private tables, repositories or classes, use reflection or a named
service locator. This is fixture architecture intent only: CONTRACT-003A defines
IDs, dependency and development availability, not functional HTTP endpoints,
service contracts, a capability registry, module bus or cross-module DI API.
Implementation and communication design require separate tasks.

## CONTRACT-003A verification (2026-10-12)

`./bin/check` passed: OpenAPI validated and all 96 synthetic/unit tests passed,
without failures, cancellations or skips, in 493.0 seconds. This includes GET
canonical descriptor discovery beyond 100 modules, both dependency conflicts and
all 24 module faults. Owned-runner cleanup passed. Shell syntax, contiguous
request numbering, unique request names and `git diff --check` passed.
OpenAPI and the original 82 Bruno requests remain byte-for-byte unchanged from
the CONTRACT-003 baseline. Version remains draft 0.5.0, with v0.4.0 published.
No live backend conformance or consumer implementation was performed.

## Historical CONTRACT-003 verification (2026-10-12)

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
