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
| [Versioning](versioning.md) | Planned releases, compatibility policy, and future consumption rules. |
| [Architecture decision](decisions/0001-contract-foundation.md) | Why `/health` was chosen and where contract and backend responsibilities belong. |
| [CONTRACT-001A verification](verification/contract-001a.md) | Synthetic test cases, measured results, tool identity, and coverage limits. |
| [Working agreement](../AGENTS.md) | Scope, preservation, validation, and authorization rules. |

## Verification badges

Workflow badges can appear in any ecosystem README, always linking to the
repository that runs the check. A technology or license badge describes a fact;
it is not a test result.

| Badge source | What the workflow checks |
| --- | --- |
| [Java backend CI](https://github.com/alxarafe/erbas/actions/workflows/ci.yml) | Docker build, native tests, application health and Flyway. Shared Bruno is not part of this workflow yet; local Health/AUTH-001/USERS-001/COLLECTIONS-001 conformance evidence lives in the Java repository. Its workflow display name is `Java CI`. |
| [.NET backend CI / shared conformance](https://github.com/alxarafe/alxarafe-dotnet/actions/workflows/ci.yml) | The backend's `bin/check`, including native/module tests and the shared contract's `bin/test` against the pinned draft checkout. Its display name is `.NET CI / shared conformance`. This is a combined workflow result, not a separate Bruno-only result. |
| [Angular client CI](https://github.com/alxarafe/erbas-client/actions/workflows/ci.yml) | Client `bin/check`: Angular tests, production build, Docker runtime and isolated Health/login proxies. Real dual-backend demo verification is separate. |

There is no contract-repository CI workflow. External badges report the checks
of their named repositories, not tests of this hosting repository. Workflow
results, local conformance evidence, real demo verification, declared revisions
and published contract versions are separate facts. Neither backend consumes a
published contract release yet. Both implement Health, AUTH-001, USERS-001 and
COLLECTIONS-001 against pinned unreleased draft `0.4.0` revisions. Java records
[local shared conformance](https://github.com/alxarafe/erbas/blob/main/docs/verification/collections-001.md);
.NET's authoritative check/CI executes the pinned shared Bruno suite, with
[verification evidence](https://github.com/alxarafe/alxarafe-dotnet/blob/main/docs/verification/users-001-collections-001.md).
.NET's `POST /api/auth/register` remains implementation-specific, outside the
shared contract.

Current draft `0.4.0` specifies Health, AUTH-001, USERS-001 and COLLECTIONS-001;
the latter applies pagination to USERS-001's list response. No release is
published. Angular consumes Health and AUTH-001 from either backend; no
USERS/COLLECTIONS client functionality is claimed. WEB-002's real dual-backend
demo exists and has
[separate verification evidence](https://github.com/alxarafe/erbas-client/blob/main/docs/full-stack-development.md#web-002-integration-verification-2026-10-09).
Shared demo defaults are a development convention consumed by Java, .NET and
the client's full-stack demo orchestration; they do not change this HTTP draft
or conformance.
