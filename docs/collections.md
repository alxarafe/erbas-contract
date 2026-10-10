# COLLECTIONS-001: standard paged collections

Draft `0.4.0` establishes ERBAS's base convention for future paged collections.
USERS-001's `GET /api/users` is its first application. OpenAPI is authoritative;
the sole Bruno collection verifies this behavior independently of backend stack.
This contract-only task does not update backend/client revisions or implementations.

## Representation and semantics

Conceptually `PagedCollection<T>` has exactly five required fields. OpenAPI uses
the concrete closed `UserCollection` schema rather than simulating generics.

```json
{
  "items": [
    {"id":"1","email":"admin@example.test","enabled":true,"admin":true}
  ],
  "offset": 0,
  "limit": 50,
  "total": 1,
  "order": [{"field":"id","direction":"asc"}]
}
```

| Field | Meaning |
| --- | --- |
| `items` | Non-null array containing exactly the window after ordering and pagination. Elements use the resource schema. |
| `offset` | Applied integer displacement, at least 0; request default 0. It is echoed even beyond total. |
| `limit` | Effective maximum requested, integer 1–100; request default 50. It is not replaced by `items.length`. |
| `total` | Nonnegative integer count of matching resources before offset/limit. Future filters must affect this total. |
| `order` | Non-null array declaring the effective criteria applied before slicing. |

Collection objects reject extra properties. Each closed `Order` entry contains
exactly nonempty string `field` and `direction` (`asc` or `desc`). An array allows
future composite criteria without replacing the envelope. Users currently
require exactly one entry: `[{"field":"id","direction":"asc"}]`.
User items remain the existing closed `id`, `email`, `enabled`, `admin` model.

## First application: users

`GET /api/users` accepts only the new optional pagination inputs `offset` and
`limit`. For example, `/api/users?offset=20&limit=10` reports offset 20, limit 10,
the total before slicing and fixed id ASC order. Without these inputs it applies
offset 0 and limit 50. Administrator authorization, 401/403 responses and no-store
behavior remain unchanged. This replaces the previous bare User array.

The server applies a deterministic, stable id ASC order before offset and limit.
IDs remain opaque; their internal representation and comparison algorithm belong
to each backend. Clients neither parse IDs nor reproduce the comparison. Backend
native tests must prove ordering precedes pagination rather than relying on
accidental row/insertion order. Repeated windows for unchanged data are stable.
No ordering, filter, search, page or cursor input is introduced.

Invalid pagination returns HTTP 400, `Content-Type: application/json`,
`Cache-Control: no-store` and exactly `{"code":"invalid_request"}`. Negative
offsets, limits below 1 or above 100, and non-integer values are invalid. There
is no silent clamping. Authentication and administrator authorization precede
query validation, just as they precede resource lookup.

## Empty and out-of-range windows

A valid empty collection returns HTTP 200 with complete metadata:

```json
{
  "items": [],
  "offset": 0,
  "limit": 50,
  "total": 0,
  "order": [{"field":"id","direction":"asc"}]
}
```

An offset at or beyond total also returns HTTP 200 and empty items, preserving
the requested offset, effective limit, total and order. For total 7 and offset
100, the response has `items: []`, `offset: 100`, `limit: 50`, `total: 7`.
Empty pages do not use 204, 404 or null. Users normally include their enabled
administrator, so an absolutely empty dataset is demonstrated directly by the
synthetic collection builder, without distorting authentication/bootstrap.

## HTTP metadata and future scope

Response generation time belongs to HTTP's standard `Date` header. Do not add
`generatedAt`, `timestamp` or timing measurements to collection bodies.
Duration/performance reporting belongs to observability and testing; neither
`Server-Timing` nor reporting tools are part of COLLECTIONS-001.

Offset/limit is the current simple client-facing decision. Custom ordering,
filters, search, cursor/keyset pagination, links, page numbers and field selection
are future capabilities requiring separate contractual evolution. Do not add
derived `count`, `hasMore`, page totals, next/previous offsets or navigation
fields preemptively. Large-scale performance requirements can justify a later
cursor/keyset contract; they do not introduce one here.

## Conformance and compatibility

The sole collection has **82 requests and 313 named checks**. COLLECTIONS-001
modifies the existing list assertion and adds 15 requests / 60 named checks:
defaults, limit 1, offset 1/limit 1, offset-only defaults, maximum limit 100,
offset beyond total, the last item, offset exactly total, negative offset,
zero/excessive limits, nonnumeric and fractional offset/limit.

The existing first-created-user list captures total. After the two password
boundary creations, total must increase by exactly two. Existing accounts from
earlier runs do not determine the expected baseline. Subsequent pages preserve
that total and match windows from a default-page reference without interpreting
opaque IDs. Last-item and exactly-total windows check the count boundary.
Run conformance in an isolated disposable environment without concurrent external
mutations. The existing suite already creates three unique disposable users;
pagination introduces no additional credentials or user creations.

Repository verification runs **69 synthetic/unit tests**. Nine new deliberate
faults cover wrong total/limit/offset/order/window, accepted negative offset or
excessive limit, extra envelope fields and extra order fields. The existing
bare-array fault remains rejected. Two additional tests prove empty metadata
and sorting before slicing: fixture insertion order and email order deliberately
oppose its own ID comparison. Other endpoints' fixtures/assertions are preserved.

The wire-shape replacement is incompatible. Under the documented pre-1.0 policy
it requires a minor increment from `0.3.0` to **`0.4.0`**, not a patch. No release
is published. Java's completed USERS-001 implementation pins the earlier revision;
its pagination adaptation and pin update are the next separately authorized task.
.NET and Angular consumption also require explicit adaptation. This repository
check verifies the runner, not external backend conformance.

## Local verification (2026-10-10)

`./bin/check` exited 0: OpenAPI validated and all **69 tests passed**, with no
failures, cancellations or skips, in **291.4 seconds**. Every new fault test
verified that the runner reached the intended failing pagination request.
The first complete run also passed in 290.2 seconds, leaving less than ten
seconds under the previous synthetic-suite watchdog. The expanded coverage now
uses a bounded 450-second suite watchdog; HTTP and Bruno limits remain 2 and
30 seconds. Tool versions, dependency pins and runner isolation are unchanged.

`git diff --check`, shell syntax verification and independent request/check/
sequence inspection passed: **82 requests, 313 named checks**, contiguous
sequence 1–82. The runner's successful exit includes its owned-container cleanup
verification. Detailed Bruno diagnostics remain withheld for credential secrecy.
No external service was tested and no backend/client file or revision pin was
changed. Other endpoints' contract definitions remain unchanged apart from a
shared invalid-request description now mentioning pagination. Historical reports
retain their original counts and results.

Scope and documentation impact review covered the contract, sole collection,
fixture, validation and current documentation. Related backend/client working
trees were inspected read-only and remain clean. Their adaptation/status updates
belong to separately authorized tasks; passing repository verification is not
a claim of backend conformance to draft 0.4.0. No publication is authorized here.

The atomic change contains these 26 files:

```text
README.md
openapi/erbas.yaml
bruno/users-20-list-users.bru
bruno/collections-68-defaults.bru
bruno/collections-69-limit-one.bru
bruno/collections-70-offset-one.bru
bruno/collections-71-beyond-total.bru
bruno/collections-72-last-item.bru
bruno/collections-73-at-total.bru
bruno/collections-74-maximum-limit.bru
bruno/collections-75-negative-offset.bru
bruno/collections-76-zero-limit.bru
bruno/collections-77-excessive-limit.bru
bruno/collections-78-invalid-offset.bru
bruno/collections-79-invalid-limit.bru
bruno/collections-80-fractional-offset.bru
bruno/collections-81-fractional-limit.bru
bruno/collections-82-offset-default-limit.bru
tests/fixtures/http-server.mjs
tests/runner.test.mjs
docker/entrypoint.mjs
docs/README.md
docs/usage.md
docs/users-001.md
docs/versioning.md
docs/collections.md
```
