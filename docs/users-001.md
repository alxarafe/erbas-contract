# USERS-001: basic CORE user administration

USERS-001 introduced user administration and a protected current-user endpoint
in draft `0.3.0`. Version `0.4.0` applies the
[COLLECTIONS-001 pagination convention](collections.md) to its list operation.
OpenAPI is authoritative; the single Bruno collection is shared by all
implementations. See [versioning](versioning.md) for first-release preparation
and published-version consumption. The dated verification below records the
original task, not publication or current backend conformance.

## Public model and authentication

`User` is a closed JSON object with exactly four required fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | Nonempty string | Opaque identity; clients must not interpret its format. |
| `email` | Nonempty string | Identity used for login; no new normalization or syntax policy. |
| `enabled` | Boolean | Whether the account can authenticate and access protected resources. |
| `admin` | Boolean | Temporary administrator flag, not roles or granular permissions. |

Credentials belong to authentication. Passwords are supplied at creation,
stored securely by backends, and never returned or included in `User`.
Creation passwords contain 12–256 Unicode code points, inclusive. Unicode and
whitespace are allowed; do not trim or impose composition rules. Login retains
AUTH-001's nonempty-string structural validation rather than imposing creation
limits on existing credentials. Exactly duplicate email strings must conflict;
this task establishes no trim, lowercase, canonicalization or case-folding rule.

`GET /api/auth/me` takes `Authorization: Bearer <accessToken>` and
`Accept: application/json`, returning 200 with the same `User` schema used by
administration. Any authenticated enabled user can call it. `admin` allows the
client to offer administration UI; backend authorization always enforces access.
Tokens remain opaque, without OAuth2, OIDC or JWT requirements.

Disabled users receive the existing generic `401 invalid_credentials` at login.
A token issued before disabling immediately stops authorizing protected requests,
which receive `401 unauthorized`. No disabled-account hint is exposed. Expiry
also produces the same protected-resource error.

## Administrative API

All four operations require an authenticated administrator. Clients send
`Accept: application/json` and use `Content-Type: application/json` for bodies.
Every response under `/api/auth/me`, `/api/users` and `/api/users/*`, including
contractual errors, carries `Cache-Control: no-store`. Redirects do not conform.

| Operation | Request | Success |
| --- | --- | --- |
| `GET /api/users` | Optional `offset` and `limit` | 200, closed `UserCollection`, fixed stable id ASC order. |
| `GET /api/users/{id}` | Opaque string path ID | 200, `User`. |
| `POST /api/users` | Exactly required `email`, `password`, `admin` | 201, created `User` with `enabled=true`. |
| `PATCH /api/users/{id}` | One or both Boolean fields `enabled`, `admin` | 200, updated `User`. |

Request schemas are closed. Creation cannot select `enabled`; PATCH cannot
change `email`, `password` or `id` and cannot be empty. Invalid JSON, extra
fields, missing required fields, incorrect types or invalid creation password
lengths produce the generic structural error. No validation internals are exposed.

| Status | Exact JSON body | Additional behavior |
| --- | --- | --- |
| 400 | `{"code":"invalid_request"}` | Structurally invalid create/update request or invalid list pagination. |
| 401 | `{"code":"unauthorized"}` | Missing, invalid, expired or disabled bearer; `WWW-Authenticate: Bearer`. |
| 403 | `{"code":"forbidden"}` | Authenticated non-admin; no `WWW-Authenticate`. |
| 404 | `{"code":"user_not_found"}` | Unknown ID, only after administrator authorization. |
| 409 | `{"code":"email_conflict"}` | Exactly duplicate email at creation. |
| 409 | `{"code":"last_admin"}` | Update would remove the last enabled administrator. |

All these responses use JSON and no-store. Authenticate and authorize before
lookup: non-admin requests for nonexistent IDs return 403, preventing enumeration.
Login retains its own AUTH-001 400/401 representations and headers.

## Administrator invariant and future implementation

At least one enabled administrator must always remain. Disabling or demoting
the last enabled administrator returns `409 last_admin`. Self-disable and
self-demotion are allowed if another enabled administrator remains. Disabled
administrators do not count. Backends must preserve this invariant atomically,
including concurrent updates; backend-specific locking is outside this task.

The first administrator is provisioned by controlled backend installation,
development or validation infrastructure. There is no bootstrap endpoint or
public registration. Backend native tests must cover the last-admin invariant,
concurrency, bearer expiry, disabled-token rejection on every protected operation,
and allowed self-updates. Centralize the simple administrator check (equivalent
to `requireAdmin()`) so future `users.read`, `users.create` and `users.update`
permissions can replace it without rewriting each endpoint. Do not build that
permission system now.

There is no DELETE: use `enabled=false` to retain identity for future references.
Email changes and password changes/reset are deferred. Roles, permissions,
groups, scopes, RBAC/ABAC, audit logs, MFA, refresh and server logout are excluded.
The CORE remains independent of articles, warehouses, purchasing, sales and
invoicing.

## Shared conformance and synthetic verification

Run `./bin/test URL` only against a disposable, isolated validation environment.
The suite mutates data and creates users; never target production. The backend
must provision `ERBAS_TEST_EMAIL` / `ERBAS_TEST_PASSWORD` as an enabled
administrator, with AUTH-001's negative-credential prerequisites. No additional
administrator credentials are needed. Each run generates unique disposable
emails, consumes opaque returned IDs and retains passwords/tokens only in the
process. Created accounts remain until the backend removes its disposable
environment; the contract runner neither provisions nor cleans backend data.

The collection has **82 requests and 313 named checks**: the original 15
Health/AUTH-001 requests and 45 checks, 52 USERS-001 requests and 208 checks,
and 15 COLLECTIONS-001 requests and 60 checks.
The added flow verifies admin login/current user, missing/invalid bearer,
creation, paged listing, get, normal login/current user, all four operations'
401/403 behavior, disabled-token rejection, disabled login, re-enable,
promotion/demotion, combined PATCH, duplicate email, unknown users, invalid
create/update bodies and Unicode password boundaries. Creation and subsequent
login use a Unicode password with significant surrounding whitespace.

Shared conformance leaves the supplied administrator intact. It does not assume
that it is the only administrator, so it cannot deterministically test
`last_admin` against an arbitrary external environment. `./bin/check` tests this
invariant directly in the isolated synthetic fixture, including disabled
administrator exclusion and allowed self-disable/self-demotion with another
enabled admin.
Native Java/.NET tests remain mandatory; the fixture is only a runner test.

The repository check runs **69 automated synthetic/unit checks**, retaining all
Health/AUTH-001 cases and adding 16 deliberate USERS-001 nonconformances,
a disabled-token fault, the deterministic last-admin test and exact
collection-counter verification. Negative cases
cover closed responses, state, media type, headers, errors, redirects and
HTTP timeouts. They execute the same sole collection. Output remains withheld
to avoid logging credentials, tokens or Authorization headers.

COLLECTIONS-001 adds nine pagination/envelope faults plus empty-collection and
sorting-before-window tests. Its shared requests prove defaults, custom windows,
stable metadata, correct totals through mutations and invalid query rejection.
See [collections](collections.md) for semantics and exact coverage.

A passing `./bin/check` validates the specification and runner, not either
backend. See [usage](usage.md) for Docker isolation, deadlines and cleanup.

## Task 1 local verification (2026-10-10)

`./bin/check` exited 0: OpenAPI validated and all 58 automated tests passed,
without skipped tests, in 208.7 seconds. The previous 180-second synthetic-suite
watchdog was insufficient for repeated full-collection runs; it is now bounded
at 300 seconds. Per-request and Bruno watchdogs remain 2 and 30 seconds.
`git diff --check`, shell syntax checks and sequence/count inspection passed.
No external service was tested; no backend or client repository was changed.
