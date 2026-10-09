# Documentation

| Document | What to find |
| --- | --- |
| [Usage](usage.md) | Local commands, Docker networking, limits, cleanup, and pinned tooling. |
| [AUTH-001](auth-001.md) | Login behavior, credentials, scope and backend adaptation requirements. |
| [Development ports](development-ports.md) | Shared host-port conventions, overrides, internal networking, and the client reservation. |
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
| [Java CI](https://github.com/alxarafe/erbas/actions/workflows/ci.yml) | Docker build, native tests, application health and Flyway. Shared Bruno is not part of this workflow yet; local conformance evidence lives in the Java repository. |
| [.NET CI / shared Bruno](https://github.com/alxarafe/alxarafe-dotnet/actions/workflows/ci.yml) | The backend's `bin/check`, including native/module tests and the shared contract's `bin/test` against the pinned draft checkout. This is a combined workflow result, not a separate Bruno-only result. |

There is no contract-repository CI workflow or client build workflow yet. Backend
badges displayed here or in the client report backend checks, not checks of the
hosting repository. Workflow results, declared contract revisions and published
contract versions are separate facts. Neither backend consumes a published
contract release yet. Their pinned revisions cover only `GET /health`.
AUTH-001 adds login to the new draft;
neither backend is claimed conformant to that draft yet.
