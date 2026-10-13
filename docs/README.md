# Documentation

| Document | What to find |
| --- | --- |
| [Usage](usage.md) | Local commands, Docker networking, limits, cleanup, and pinned tooling. |
| [COLLECTIONS-001](collections.md) | Standard paged envelope, user and module pagination, order, totals and compatibility. |
| [Module administration](modules.md) | Published v0.5.0 CORE administration, availability, dependency invariants and canonical development/conformance modules. |
| [WMS-001](wms-001.md) | Unpublished v0.6.0 UoM vertical, laboratory audit, design decisions, security, gating and portability. |
| [WMS-001 verification](verification/wms-001.md) | Local contract validation, compatibility preservation, scoped faults and deliberate limitations. |
| [WMS-001A verification](verification/wms-001a.md) | Pre-publication description normalization, code boundaries and revised conformance evidence. |
| [v0.6.0 preparation](releases/v0.6.0.md) | Compatible additive draft; not published or adopted. |
| [USERS-001](users-001.md) | CORE user model, current user, administration, security invariants and conformance coverage. |
| [AUTH-001](auth-001.md) | Login behavior, credentials, scope and backend adaptation requirements. |
| [Shared demo defaults](../demo/README.md) | Canonical public initial demo values, override precedence and adoption boundaries. |
| [Implementation-specific extensions](implementation-extensions.md) | Behavior classifications and explicit cross-stack promotion rules. |
| [Development ports](development-ports.md) | Shared host-port conventions, overrides and internal networking for both backends and the client. |
| [Versioning](versioning.md) | Published release identity, immutable tags, compatibility, consumption and exact publication procedure. |
| [v0.4.0 release notes](releases/v0.4.0.md) | First executable release scope and exclusions. |
| [v0.5.0 release notes](releases/v0.5.0.md) | Current published immutable release: compatible module administration, canonical conformance fixtures and exact release identity. |
| [Architecture decision](decisions/0001-contract-foundation.md) | Why `/health` was chosen and where contract and backend responsibilities belong. |
| [CONTRACT-006B verification](verification/contract-006b.md) | Scoped synthetic execution, preserved coverage and performance measurements. |
| [CONTRACT-001A verification](verification/contract-001a.md) | Synthetic test cases, measured results, tool identity, and coverage limits. |
| [Working agreement](../AGENTS.md) | Scope, preservation, validation, and authorization rules. |

## Verification badges

Workflow badges can appear in any ecosystem README, always linking to the
repository that runs the check. A technology or license badge describes a fact;
it is not a test result.

| Workflow source | What the workflow checks |
| --- | --- |
| [Contract CI](../.github/workflows/ci.yml) | The authoritative Docker-based `./bin/check`: OpenAPI validation and synthetic/unit runner tests. No live backend conformance or publication. |
| [Java backend CI](https://github.com/alxarafe/erbas/actions/workflows/ci.yml) | Authoritative `./bin/check`: Docker build, native/integration tests, clean PostgreSQL, application readiness, Flyway, mandatory shared Bruno against published `v0.5.0`, and cleanup. Its workflow display name is `Java CI`. |
| [.NET backend CI / shared conformance](https://github.com/alxarafe/alxarafe-dotnet/actions/workflows/ci.yml) | Authoritative `./bin/check`: native/module tests, validation Host, mandatory shared Bruno against published `v0.5.0`, persistence and cleanup. Its display name is `.NET CI / shared conformance`. This is a combined workflow result, not a separate Bruno-only result. |
| [Angular client CI](https://github.com/alxarafe/erbas-client/actions/workflows/ci.yml) | Client `bin/check`: Angular tests, production build, Docker runtime and isolated shared API proxies. No backend shared-conformance claim. Real dual-backend demo verification is separate. |

External badges report the checks of their named repositories, not tests of this
hosting repository. Workflow results, historical local conformance evidence,
real demo verification and declared releases remain separate facts.
CONTRACT-002 established published `v0.4.0` consumption. Java and .NET subsequently
adopted `v0.5.0`, declared in `contract.revision` and checked locally and in CI.
Their [Java](https://github.com/alxarafe/erbas/blob/main/docs/verification/collections-001.md)
and [.NET](https://github.com/alxarafe/alxarafe-dotnet/blob/main/docs/verification/users-001-collections-001.md)
verification reports retain evidence against earlier draft revisions.
.NET's `POST /api/auth/register` remains implementation-specific, outside the
shared contract.

Previous published release `v0.4.0` specifies Health, AUTH-001, USERS-001 and COLLECTIONS-001;
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

## Published contract and consumer adoption

**v0.5.0 is the current published immutable release**, incorporating CONTRACT-003
module administration and CONTRACT-003A canonical development/conformance modules.
See [release notes](releases/v0.5.0.md) and [exact tag identity](versioning.md).
**v0.4.0 is the previous release and the first formal published release**.
Java and .NET declare v0.5.0 and verify that immutable release in their own
validation; Angular module-administration adoption is not claimed. Neither backend
implements the unpublished v0.6.0 WMS preparation. Publication, backend adoption,
client consumption and repository
verification below are distinct facts.
The published v0.5.0 collection has 130 request definitions and 506 named checks.
The v0.6.0 preparation retains them and adds WMS: 182 definitions / 714 checks
for the standard synthetic fixture; see [WMS-001](wms-001.md) and
[module conformance](modules.md#conformance-fixture-and-mutations). Historical
verification reports retain their original counts and results.
