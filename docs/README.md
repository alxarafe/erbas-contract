# Documentation

| Document | What to find |
| --- | --- |
| [Usage](usage.md) | Local commands, Docker networking, limits, cleanup, and pinned tooling. |
| [USERS-001](users-001.md) | CORE user model, current user, administration, security invariants and conformance coverage. |
| [AUTH-001](auth-001.md) | Login behavior, credentials, scope and backend adaptation requirements. |
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
| [Java backend CI](https://github.com/alxarafe/erbas/actions/workflows/ci.yml) | Docker build, native tests, application health and Flyway. Shared Bruno is not part of this workflow yet; local AUTH-001 conformance evidence lives in the Java repository. |
| [.NET backend CI / shared conformance](https://github.com/alxarafe/alxarafe-dotnet/actions/workflows/ci.yml) | The backend's `bin/check`, including native/module tests and the shared contract's `bin/test` against the pinned draft checkout. This is a combined workflow result, not a separate Bruno-only result. |
| [Angular client CI](https://github.com/alxarafe/erbas-client/actions/workflows/ci.yml) | Client `bin/check`: Angular tests, production build, Docker runtime and isolated Health/login proxies. Real dual-backend demo verification is separate. |

There is no contract-repository CI workflow. External badges report the checks
of their named repositories, not tests of this hosting repository. Workflow
results, local conformance evidence, real demo verification, declared revisions
and published contract versions are separate facts. Neither backend consumes a
published contract release yet. Both implement Health and AUTH-001 against
pinned unreleased revisions; Java records local conformance and .NET executes
shared conformance in CI. WEB-002 is completed and merged in the Angular client.

USERS-001 draft `0.3.0` adds user administration; implementation and conformance
against that draft are pending in both backends and the Angular client. Existing
badges and historical evidence do not establish USERS-001 conformance.
