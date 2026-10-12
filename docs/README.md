# Documentation

| Document | What to find |
| --- | --- |
| [Usage](usage.md) | Local commands, Docker networking, limits, cleanup, and pinned tooling. |
| [COLLECTIONS-001](collections.md) | Standard paged envelope, users pagination, order, totals and compatibility. |
| [USERS-001](users-001.md) | CORE user model, current user, administration, security invariants and conformance coverage. |
| [AUTH-001](auth-001.md) | Login behavior, credentials, scope and backend adaptation requirements. |
| [Shared demo defaults](../demo/README.md) | Canonical public initial demo values, override precedence and adoption boundaries. |
| [Implementation-specific extensions](implementation-extensions.md) | Behavior classifications and explicit cross-stack promotion rules. |
| [Development ports](development-ports.md) | Shared host-port conventions, overrides and internal networking for both backends and the client. |
| [Versioning](versioning.md) | Published release identity, immutable tags, compatibility, consumption and exact publication procedure. |
| [v0.4.0 release notes](releases/v0.4.0.md) | First executable release scope and exclusions. |
| [Architecture decision](decisions/0001-contract-foundation.md) | Why `/health` was chosen and where contract and backend responsibilities belong. |
| [CONTRACT-001A verification](verification/contract-001a.md) | Synthetic test cases, measured results, tool identity, and coverage limits. |
| [Working agreement](../AGENTS.md) | Scope, preservation, validation, and authorization rules. |

## Verification badges

Workflow badges can appear in any ecosystem README, always linking to the
repository that runs the check. A technology or license badge describes a fact;
it is not a test result.

| Workflow source | What the workflow checks |
| --- | --- |
| [Contract CI](../.github/workflows/ci.yml) | The authoritative Docker-based `./bin/check`: OpenAPI validation and synthetic/unit runner tests. No live backend conformance or publication. |
| [Java backend CI](https://github.com/alxarafe/erbas/actions/workflows/ci.yml) | Authoritative `./bin/check`: Docker build, native/integration tests, clean PostgreSQL, application readiness, Flyway, mandatory shared Bruno against published `v0.4.0`, and cleanup. Its workflow display name is `Java CI`. |
| [.NET backend CI / shared conformance](https://github.com/alxarafe/alxarafe-dotnet/actions/workflows/ci.yml) | Authoritative `./bin/check`: native/module tests, validation Host, mandatory shared Bruno against published `v0.4.0`, persistence and cleanup. Its display name is `.NET CI / shared conformance`. This is a combined workflow result, not a separate Bruno-only result. |
| [Angular client CI](https://github.com/alxarafe/erbas-client/actions/workflows/ci.yml) | Client `bin/check`: Angular tests, production build, Docker runtime and isolated shared API proxies. No backend shared-conformance claim. Real dual-backend demo verification is separate. |

External badges report the checks of their named repositories, not tests of this
hosting repository. Workflow results, historical local conformance evidence,
real demo verification and declared releases remain separate facts.
CONTRACT-002 is complete: `v0.4.0` is published, and Java and .NET both declare it
in `contract.revision` and enforce shared conformance locally and in CI.
Their [Java](https://github.com/alxarafe/erbas/blob/main/docs/verification/collections-001.md)
and [.NET](https://github.com/alxarafe/alxarafe-dotnet/blob/main/docs/verification/users-001-collections-001.md)
verification reports retain evidence against earlier draft revisions.
.NET's `POST /api/auth/register` remains implementation-specific, outside the
shared contract.

Published `v0.4.0` specifies Health, AUTH-001, USERS-001 and COLLECTIONS-001;
the latter applies pagination to USERS-001's list response.
See [release identity and policy](versioning.md).
The same client provides authenticated profiles and basic administrator user
management with pagination against either backend. Backend authorization remains
authoritative; the opaque bearer stays backend-bound and memory-only. See the
[client development guide](https://github.com/alxarafe/erbas-client/blob/main/docs/full-stack-development.md)
for behavior, error handling and verification scope.

The persistent real dual-backend demo checks POST forwarding non-destructively:
409 with an existing email and 403 with a regular user. It does not create an
account to test 201; client tests/mock runtime cover 201 separately from real
contractual creation in the backends' shared conformance. Client CI checks its
own tests/build/runtime/isolated proxies, not backend shared conformance.
The historical WEB-002 real dual-backend demo has
[separate verification evidence](https://github.com/alxarafe/erbas-client/blob/main/docs/full-stack-development.md#web-002-integration-verification-2026-10-09).
Shared demo defaults are a development convention consumed by Java, .NET and
the client's full-stack demo orchestration; they do not change this HTTP version
or conformance. Demo defaults are outside the HTTP release scope.
