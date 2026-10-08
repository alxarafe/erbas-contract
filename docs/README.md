# Documentation

| Document | What to find |
| --- | --- |
| [Usage](usage.md) | Local commands, Docker networking, limits, cleanup, and pinned tooling. |
| [Development ports](development-ports.md) | Shared host-port conventions, overrides, internal networking, and the client reservation. |
| [Versioning](versioning.md) | Planned releases, compatibility policy, and future consumption rules. |
| [Architecture decision](decisions/0001-contract-foundation.md) | Why `/health` was chosen and where contract and backend responsibilities belong. |
| [CONTRACT-001A verification](verification/contract-001a.md) | Synthetic test cases, measured results, tool identity, and coverage limits. |
| [Working agreement](../AGENTS.md) | Scope, preservation, validation, and authorization rules. |

## Future status reporting

Workflows will run in the repository responsible for each check. Their badges
may be displayed in other READMEs without duplicating tests or workflows.
General CI success does not establish contractual conformance: the implemented
contract version and the result of checking that version are separate facts.

ERBAS Contract will progressively publish the ecosystem compatibility matrix
with explicit versions and conformance evidence. The current [status table](../README.md#erbas-ecosystem)
records the foundation and pending integrations; no CI workflows or releases
are available yet in this repository.
