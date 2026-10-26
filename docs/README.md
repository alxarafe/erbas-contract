# Documentation

| Document | What to find |
| --- | --- |
| [Usage](usage.md) | Local commands, Docker networking, limits, cleanup, and pinned tooling. |
| [ASSET-001 design](modules/assets/asset-001.md) | Implementation-specific Asset Management experiment: lifecycle, dynamic fields, integrity, permissions, test matrix and proposed implementation tasks; no published Asset API. |
| [CONTRACT-007 verification](verification/contract-007.md) | FAST, scoped and full checks, impact classification and CI policy. |
| [COLLECTIONS-001](common/collections.md) | Standard paged envelope, user and module pagination, order, totals and compatibility. |
| [CORE-CAP-001](core/capabilities-001.md) | Capability ownership, descriptors, permissions, effective discovery, schemas and deferred execution. |
| [CORE-CAP-002](core/capabilities-002.md) | v0.10.0 synchronous READ invocation, trusted context, audit and safe failures. |
| [AI-001](modules/ai/ai-001.md) | Published v0.11.0: provider-agnostic assistant over effective READ capabilities, security, errors and audit. |
| [AI-001 verification](verification/ai-001.md) | AI focused/full Docker validation, preservation and conformance limitations. |
| [v0.11.0 release notes](releases/v0.11.0.md) | Published compatible additive MINOR over immutable v0.10.0. |
| [v0.12.0 candidate](releases/v0.12.0.md) | Unpublished MINOR: typed capability/primitive AI provenance. |
| [v0.11.1 preparation](releases/v0.11.1.md) | Unreleased compatible PATCH over immutable v0.11.0; full conformance timeout only, no HTTP change. |
| [CORE-CAP-002 verification](verification/core-cap-002.md) | Focused and full Docker repository validation, contract preservation, and no live conformance claim. |
| [v0.10.0 release notes](releases/v0.10.0.md) | Compatible additive MINOR over immutable v0.9.0. |
| [CORE-CAP-001 verification](verification/core-cap-001.md) | New discovery coverage, contract preservation and Docker verification evidence. |
| [Module administration](core/modules.md) | CORE administration introduced in v0.5.0, availability, dependency invariants and canonical development/conformance modules. |
| [WMS-001](modules/wms/wms-001.md) | Published v0.6.0 UoM vertical, laboratory audit, design decisions, security, gating and portability. |
| [WMS-001 verification](verification/wms-001.md) | Local contract validation, compatibility preservation, scoped faults and deliberate limitations. |
| [WMS-001A verification](verification/wms-001a.md) | Pre-publication description normalization, code boundaries and revised conformance evidence. |
| [v0.6.0 release notes](releases/v0.6.0.md) | Previous immutable release: WMS UoMs and exact release identity. |
| [API conventions](common/api-conventions.md) | Reusable HTTP semantics, precedence and the v0.8.0 error envelope. |
| [WMS-003](modules/wms/wms-003.md) | Item Families, association mutations, multi-errors and portability. |
| [v0.9.0 release notes](releases/v0.9.0.md) | Published compatible MINOR: CORE-CAP-001 discovery and validation. |
| [v0.8.0 preparation evidence](releases/v0.8.0.md) | Historical WMS-003 preparation notes; v0.8.0 is published and immutable. |
| [WMS-002](modules/wms/wms-002.md) | Storage Attribute create/list, exact code/name semantics, portability and conformance. |
| [v0.7.0 preparation evidence](releases/v0.7.0.md) | Historical preparation notes for the previous immutable v0.7.0 release. |
| [USERS-001](core/users-001.md) | CORE user model, current user, administration, security invariants and conformance coverage. |
| [AUTH-001](core/auth-001.md) | Login behavior, credentials, scope and backend adaptation requirements. |
| [Shared demo defaults](../demo/README.md) | Canonical public initial demo values, override precedence and adoption boundaries. |
| [Implementation-specific extensions](common/implementation-extensions.md) | Behavior classifications and explicit cross-stack promotion rules. |
| [Development ports](common/development-ports.md) | Shared host-port conventions, overrides and internal networking for both backends and the client. |
| [Versioning](common/versioning.md) | Published release identity, immutable tags, compatibility, consumption and exact publication procedure. |
| [v0.4.0 release notes](releases/v0.4.0.md) | First executable release scope and exclusions. |
| [v0.5.0 release notes](releases/v0.5.0.md) | Previous immutable release: compatible module administration, canonical conformance fixtures and exact release identity. |
| [Source boundaries](decisions/0002-contract-source-boundaries.md) | Common / CORE / functional ownership within one public API and contract version. |
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
| [Contract CI](../.github/workflows/ci.yml) | Impact-aware PR checks and authoritative Docker-based `./bin/check` on main. No live backend conformance or publication. |
| [Java backend CI](https://github.com/alxarafe/erbas/actions/workflows/ci.yml) | Authoritative `./bin/check`: Docker build, native/integration tests, clean PostgreSQL, application readiness, Flyway, mandatory shared Bruno against published `v0.6.0`, and cleanup. Its workflow display name is `Java CI`. |
| [.NET backend CI / shared conformance](https://github.com/alxarafe/alxarafe-dotnet/actions/workflows/ci.yml) | Authoritative `./bin/check`: native/module tests, validation Host, mandatory shared Bruno against published `v0.6.0`, persistence and cleanup. Its display name is `.NET CI / shared conformance`. This is a combined workflow result, not a separate Bruno-only result. |
| [Angular client CI](https://github.com/alxarafe/erbas-client/actions/workflows/ci.yml) | Client `bin/check`: Angular tests, production build, Docker runtime and isolated shared API proxies. No backend shared-conformance claim. Real dual-backend demo verification is separate. |

External badges report the checks of their named repositories, not tests of this
hosting repository. Workflow results, historical local conformance evidence,
real demo verification and declared releases remain separate facts.
CONTRACT-002 established published `v0.4.0` consumption. Java and .NET subsequently
adopted `v0.6.0`, declared in `contract.revision` and checked locally and in CI.
Their [Java](https://github.com/alxarafe/erbas/blob/main/docs/verification/collections-001.md)
and [.NET](https://github.com/alxarafe/alxarafe-dotnet/blob/main/docs/verification/users-001-collections-001.md)
verification reports retain evidence against earlier draft revisions.
.NET's `POST /api/auth/register` remains implementation-specific, outside the
shared contract.

Previous published release `v0.4.0` specifies Health, AUTH-001, USERS-001 and COLLECTIONS-001;
the latter applies pagination to USERS-001's list response.
See [release identity and policy](common/versioning.md).
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

**v0.11.1 is the latest published immutable release**. See [release identity and policy](common/versioning.md).
The recorded Java/.NET adoption remains v0.6.0; publication and adoption are
distinct. Angular WMS or module administration adoption is not claimed.

Published **v0.11.0** contains **590 requests / 2587 named checks**. See
[AI-001](modules/ai/ai-001.md) and [release notes](releases/v0.11.0.md).
Historical **v0.11.1** preparation changed only the full conformance timeout and
the collection remains at **590 requests / 2587 named checks**. It has no tag and
makes no HTTP or adoption claim. See [preparation notes](releases/v0.11.1.md).
Previous published **v0.10.0** contains **560 requests / 2467 named checks**. See
[CORE-CAP-002](core/capabilities-002.md) and [release notes](releases/v0.10.0.md).
The previous immutable **v0.9.0** contains **522 requests / 2315 named checks**, measured
after CORE-CAP-001 implementation.
See [CORE-CAP-001](core/capabilities-001.md) and [release notes](releases/v0.9.0.md).
No backend/client v0.10.0 or v0.11.0 adoption or conformance is claimed. Full
conformance requires initially empty disposable UoM, Storage Attribute and
ItemFamily catalogues and enabled AVAILABLE `erbas.wms`. AI success conformance
also requires AVAILABLE enabled `erbas.ai`, `ai.assistant.invoke` for the
administrator, and a backend-owned deterministic conformance assistant adapter;
no live LLM provider is required. Repository checks examine only synthetic
fixtures. Historical reports retain their original versions, counts and results.
