# CORE-CAP-001 verification

Scope: [capability descriptors, registry and discovery](../core/capabilities-001.md)
in `erbas-contract` only. Branch `main`, base
`9dcb1605bcddbd450d4c009285313a142ab9fb35`, initially clean working tree.
No commit, push, tag, publication or consumer change is performed.

## Contract and suite coverage

OpenAPI adds only two discovery GET operations, the closed descriptor and
collection, reference-only schemas and `capability_not_found`. Common pagination
schemas are reused. WMS owns three normative declarations of existing reads;
CORE receives provider descriptors without importing WMS definitions.

The single collection has **522 requests / 2315 named checks**, measured by its
inventory test: **28 requests / 125 checks added**. All 494 existing requests and
their assertions remain unchanged. During the original implementation, the root README and historical reports
were unchanged. Existing Health, AUTH, USERS, COLLECTIONS, module administration and
WMS operation definitions are protected by the retained SHA-256
`0ad19e56e34d44eb90464436c8dfbb09a2e99fa52e82608d652a6e3c2318f9b8`.
The preservation test removes only CORE-CAP-001 additions and verifies two
Redocly-generated pagination schema aliases before excluding those aliases.
It does not replace the old expected hash or reverse legacy behavior.

New Bruno coverage includes authenticated/unauthenticated and invalid-token
catalogues, unknown and invalid IDs, invalid queries and auth precedence;
strict closed descriptor structure, IDs, versions, effect and schema references;
all-page ID ordering and duplicate detection; three existing WMS details;
normal-user omission and masked detail; WMS disable, omission, 404, authentication
precedence, restore and rediscovery. Existing timeout and redirect policies apply.
Backend-neutral synthetic scenarios prove acceptance of empty, absent-provider
and multi-page registries, and detect extra/malformed descriptors, invalid IDs,
versions and schemas, malformed JSON, duplicate IDs within/across pages, broken
global error envelopes, permission disclosure and ignored module gates. Positive
controls run the exact security/module mutation scenarios without their defects.

## Original implementation validation (before the versioning correction)

All JavaScript, Redocly and Bruno execution uses the existing pinned Docker image
recipe and lockfile. No dependencies or lockfiles are changed. The host requires
only the existing Docker/shell workflow.

The initial `./bin/check` inside the sandbox could not access Docker. Re-running
with host Docker access ran lint and all tests: 145/146 passed, with one failure
in the preservation projection caused by Redocly's new schema aliases. The full
522-request collection passed. The projection was corrected without changing the
expected legacy hash. Focused Docker tests then passed **18/18**, zero failures,
skips or cancellations, in **62.883 seconds**.

An intermediate full `./bin/check` also passed **163/163** tests in **514.488
seconds**. Final review then aligned module-ID assertions with the existing
opaque Module ID contract and added an opaque-owner positive case.

The final authoritative **`./bin/check` exited 0**: OpenAPI lint passed and
**163/163 synthetic/unit tests passed**, with **0 failures, 0 cancellations and
0 skips**, in **514.070 seconds** for the test battery. This includes the original
146 cases and 17 new cases. The full collection completed **522 requests**;
inventory measured **2315 named checks**, contiguous unique sequences 1–522 and
one collection. Owned-runner cleanup succeeded. Timeouts, direct dependencies,
lockfile and Docker base image are unchanged.

`git diff --check` passed. All **499 pre-existing Bruno files** (494 requests,
four folders and the collection definition) are byte-identical to HEAD.
Local file links in all created/modified documentation resolve.
No `./bin/test URL` was run: no external URL/credentials were supplied and this
repository must not start or configure backends. Synthetic success is not Java,
.NET or client conformance.

## Scope and documentation review

The contract follows the existing common/CORE/module boundaries and one release
version. v0.9.0 is unpublished; published v0.8.0 remains immutable. The administrator
mapping is an explicit compatibility bridge, not granular permission management.
No registration HTTP API, invocation, delegation, execution infrastructure or AI
feature is introduced. Backend registration validation and live conformance
remain backend responsibilities.

Meaningful literals were inspected: discovery path/error/ID pattern have named
fixture definitions; Bruno uses scoped variables; schema bounds/defaults reuse
common parameter schemas; boundary tests reuse the shared collection limit.
Provider declarations are module-owned normative content; independent Bruno
expectations are checked against those declarations. No general constants
package or new dependency is introduced. Added fixture values are synthetic.
Documentation impact is covered by the new CORE design and this verification,
the documentation index, usage, versioning and pending release notes. No change
to the brief public landing page or other repositories is necessary.

Future reviews and limitations are listed in the design document: coarse current
permissions, matching-contract schema resolution, no concurrent pagination
snapshot, no public registration-error transport, and deferred execution/data
security. No external architecture risk file was supplied or found here.

## Original implementation files and Git state (historical snapshot)

All changes belong to CORE-CAP-001: **13 modified tracked files and 39 new
untracked files (52 total)**. The new files include 28 Bruno requests and two
folder scripts, the CORE OpenAPI fragment, WMS declarations, two documentation
pages, two test files, two scenario definitions and one generic fixture.
The complete file list appears in the status output below. Nothing is staged.
Branch and HEAD remain unchanged. No commit, push, PR, tag or release was made.

`git diff --stat` (Git excludes the 39 untracked additions):

```text
 docs/README.md                      |  4 +++-
 docs/common/versioning.md           |  4 ++++
 docs/releases/v0.8.0.md             | 19 +++++++++++++++++++
 docs/usage.md                       | 11 +++++++++++
 openapi/common/pagination.yaml      |  9 +++++++++
 openapi/erbas.yaml                  | 24 +++++++++++++++++++++++-
 scripts/conformance.mjs             |  6 +++---
 scripts/conformance/core.mjs        |  4 +++-
 scripts/conformance/modules/wms.mjs |  1 +
 tests/common/openapi.test.mjs       | 14 +++++++++++++-
 tests/fixtures/composed.mjs         |  4 +++-
 tests/fixtures/core.mjs             |  9 ++++++++-
 tests/support/constants.mjs         |  4 ++--
 13 files changed, 102 insertions(+), 11 deletions(-)
```

`git status --short --branch --untracked-files=all`:

```text
## main...origin/main
 M docs/README.md
 M docs/common/versioning.md
 M docs/releases/v0.8.0.md
 M docs/usage.md
 M openapi/common/pagination.yaml
 M openapi/erbas.yaml
 M scripts/conformance.mjs
 M scripts/conformance/core.mjs
 M scripts/conformance/modules/wms.mjs
 M tests/common/openapi.test.mjs
 M tests/fixtures/composed.mjs
 M tests/fixtures/core.mjs
 M tests/support/constants.mjs
?? bruno/core/capabilities/capabilities-495-anonymous-list.bru
?? bruno/core/capabilities/capabilities-496-invalid-token.bru
?? bruno/core/capabilities/capabilities-497-anonymous-detail.bru
?? bruno/core/capabilities/capabilities-498-effective-list.bru
?? bruno/core/capabilities/capabilities-499-normal-list.bru
?? bruno/core/capabilities/capabilities-500-missing-detail.bru
?? bruno/core/capabilities/capabilities-501-normal-missing-detail.bru
?? bruno/core/capabilities/capabilities-502-invalid-id.bru
?? bruno/core/capabilities/capabilities-503-negative-offset.bru
?? bruno/core/capabilities/capabilities-504-zero-limit.bru
?? bruno/core/capabilities/capabilities-505-excessive-limit.bru
?? bruno/core/capabilities/capabilities-506-repeated-limit.bru
?? bruno/core/capabilities/capabilities-507-unknown-query.bru
?? bruno/core/capabilities/capabilities-508-detail-query.bru
?? bruno/core/capabilities/capabilities-509-authentication-first.bru
?? bruno/core/capabilities/folder.bru
?? bruno/modules/wms/capabilities/capabilities-510-enable.bru
?? bruno/modules/wms/capabilities/capabilities-511-registered.bru
?? bruno/modules/wms/capabilities/capabilities-512-detail-uoms.bru
?? bruno/modules/wms/capabilities/capabilities-513-detail-storage-attributes.bru
?? bruno/modules/wms/capabilities/capabilities-514-detail-item-families.bru
?? bruno/modules/wms/capabilities/capabilities-515-normal-hidden.bru
?? bruno/modules/wms/capabilities/capabilities-516-normal-hidden-detail.bru
?? bruno/modules/wms/capabilities/capabilities-517-disable.bru
?? bruno/modules/wms/capabilities/capabilities-518-disabled-hidden.bru
?? bruno/modules/wms/capabilities/capabilities-519-disabled-detail.bru
?? bruno/modules/wms/capabilities/capabilities-520-disabled-anonymous.bru
?? bruno/modules/wms/capabilities/capabilities-521-restore.bru
?? bruno/modules/wms/capabilities/capabilities-522-restored.bru
?? bruno/modules/wms/capabilities/folder.bru
?? docs/core/capabilities-001.md
?? docs/verification/core-cap-001.md
?? openapi/core/capabilities/contract.yaml
?? openapi/modules/wms/capabilities.json
?? tests/core/capabilities.test.mjs
?? tests/core/capability-scenarios.mjs
?? tests/fixtures/capabilities.mjs
?? tests/modules/wms/capabilities.test.mjs
?? tests/modules/wms/capability-scenarios.mjs
```

## v0.9.0 versioning correction

The earlier implementation assumed v0.8.0 was unpublished. Inspection confirms
published tag object `303a61b0207d3984780539da4068ab68c1264a8d`, target
`9dcb1605bcddbd450d4c009285313a142ab9fb35`. The correction starts from the
uncommitted implementation on `feature/core-cap-001-capabilities-v0.9.0`.
CORE-CAP-001 prepares the compatible additive v0.9.0 release instead.
The original command results and Git snapshot above are historical, not a claim
that the current branch is main or that the published release remains modified.

The original CORE-CAP-001 appendix is removed from `docs/releases/v0.8.0.md`,
restoring that file byte-for-byte to its published tag; its historical wording
is preserved. New notes live in `docs/releases/v0.9.0.md`. Current OpenAPI metadata,
version assertions, capability design, versioning, documentation index and usage
now identify v0.9.0 preparation and the published v0.8.0 baseline. The golden
preservation hash is unchanged; it explicitly checks new metadata before
normalizing only version/description back to the published baseline.

Historical v0.8.0 WMS-003/error-envelope references, release notes, the original
verification snapshot and baseline hash remain intentional. Earlier release reports remain unchanged. The current landing-page release
status and published badge are corrected to v0.8.0 published / v0.9.0 preparation;
no historical report or backend adoption claim is rewritten. Capability descriptor versions remain `1.0.0`. No capabilities,
permissions, routes, assertions or dependency versions change.

Files changed by the correction (relative to its initial uncommitted state):

- `openapi/erbas.yaml`.
- `tests/support/constants.mjs`.
- `tests/common/openapi.test.mjs`.
- `tests/common/boundaries.test.mjs`.
- `tests/modules/wms/contract.test.mjs`.
- `docs/common/versioning.md`.
- `docs/README.md`.
- `docs/usage.md`.
- `docs/core/capabilities-001.md`.
- `docs/verification/core-cap-001.md`.
- `docs/releases/v0.8.0.md` (restored exactly to published content).
- `docs/releases/v0.9.0.md` (new release preparation).
- `README.md`.

Deliberately preserved references:

- Published v0.8.0 identity and the WMS-003 / standard-error-envelope origin.
- Historical v0.8.0 release notes and earlier verification/release documents.
- The v0.8.0 preservation test name, baseline metadata (including the published
  source's original preparation wording) and unchanged golden hash.
- The original implementation Git snapshot above, explicitly labeled historical.
- Earlier release identities and the historical v0.8.0 API-policy clarification.
- Capability behavioral `1.0.0` versions and recorded consumer adoption versions.

Focused Docker versioning tests passed **3/3**, exit 0, no failures, cancellations
or skips, in **1.799 seconds**. The selection covered the current public version,
legacy v0.8.0 preservation and the WMS-003 schema/version assertions:

```text
node --test --test-concurrency=1 --test-name-pattern='single public contract version|pre-existing v0.8.0|OpenAPI preserves the Storage Attribute' tests/common/boundaries.test.mjs tests/common/openapi.test.mjs tests/modules/wms/contract.test.mjs
```

The normal authoritative **`./bin/check` exited 0** after the focused tests.
OpenAPI lint passed and **163/163 tests passed**, with **0 failures, cancellations
or skips**, in **485.552 seconds**. The sole collection remains **522 requests /
2315 named checks**. Owned-runner cleanup succeeded. No live backend was tested.

Final static review: `git diff --check` passed; local documentation file links
resolve. The v0.8.0 tag object/target and HEAD remain unchanged, and the v0.8.0
release notes are byte-identical to the published tag. Only version expectations,
release metadata and related current documentation changed. No new functional
behavior, dependencies, locks, capability versions or consumer pins changed.
No commit, tag or push was performed.

Current working-tree state includes the original pending implementation plus the
correction: **15 modified tracked files / 40 untracked files**, nothing staged.
The restored v0.8.0 release notes therefore do not appear in the current diff.

`git status --short --branch --untracked-files=all` after correction:

```text
## feature/core-cap-001-capabilities-v0.9.0
 M README.md
 M docs/README.md
 M docs/common/versioning.md
 M docs/usage.md
 M openapi/common/pagination.yaml
 M openapi/erbas.yaml
 M scripts/conformance.mjs
 M scripts/conformance/core.mjs
 M scripts/conformance/modules/wms.mjs
 M tests/common/boundaries.test.mjs
 M tests/common/openapi.test.mjs
 M tests/fixtures/composed.mjs
 M tests/fixtures/core.mjs
 M tests/modules/wms/contract.test.mjs
 M tests/support/constants.mjs
?? bruno/core/capabilities/capabilities-495-anonymous-list.bru
?? bruno/core/capabilities/capabilities-496-invalid-token.bru
?? bruno/core/capabilities/capabilities-497-anonymous-detail.bru
?? bruno/core/capabilities/capabilities-498-effective-list.bru
?? bruno/core/capabilities/capabilities-499-normal-list.bru
?? bruno/core/capabilities/capabilities-500-missing-detail.bru
?? bruno/core/capabilities/capabilities-501-normal-missing-detail.bru
?? bruno/core/capabilities/capabilities-502-invalid-id.bru
?? bruno/core/capabilities/capabilities-503-negative-offset.bru
?? bruno/core/capabilities/capabilities-504-zero-limit.bru
?? bruno/core/capabilities/capabilities-505-excessive-limit.bru
?? bruno/core/capabilities/capabilities-506-repeated-limit.bru
?? bruno/core/capabilities/capabilities-507-unknown-query.bru
?? bruno/core/capabilities/capabilities-508-detail-query.bru
?? bruno/core/capabilities/capabilities-509-authentication-first.bru
?? bruno/core/capabilities/folder.bru
?? bruno/modules/wms/capabilities/capabilities-510-enable.bru
?? bruno/modules/wms/capabilities/capabilities-511-registered.bru
?? bruno/modules/wms/capabilities/capabilities-512-detail-uoms.bru
?? bruno/modules/wms/capabilities/capabilities-513-detail-storage-attributes.bru
?? bruno/modules/wms/capabilities/capabilities-514-detail-item-families.bru
?? bruno/modules/wms/capabilities/capabilities-515-normal-hidden.bru
?? bruno/modules/wms/capabilities/capabilities-516-normal-hidden-detail.bru
?? bruno/modules/wms/capabilities/capabilities-517-disable.bru
?? bruno/modules/wms/capabilities/capabilities-518-disabled-hidden.bru
?? bruno/modules/wms/capabilities/capabilities-519-disabled-detail.bru
?? bruno/modules/wms/capabilities/capabilities-520-disabled-anonymous.bru
?? bruno/modules/wms/capabilities/capabilities-521-restore.bru
?? bruno/modules/wms/capabilities/capabilities-522-restored.bru
?? bruno/modules/wms/capabilities/folder.bru
?? docs/core/capabilities-001.md
?? docs/releases/v0.9.0.md
?? docs/verification/core-cap-001.md
?? openapi/core/capabilities/contract.yaml
?? openapi/modules/wms/capabilities.json
?? tests/core/capabilities.test.mjs
?? tests/core/capability-scenarios.mjs
?? tests/fixtures/capabilities.mjs
?? tests/modules/wms/capabilities.test.mjs
?? tests/modules/wms/capability-scenarios.mjs
```
