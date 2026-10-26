# Contract versioning

## First formal release: v0.4.0

`v0.4.0` is the first published immutable ERBAS Contract version. Its annotated
tag resolves to `839255ea54610ccf711b29bd096ea294a1ebc3fc`.
The release identity is the published Git tag. GitHub Release and package
publication require separate authorization.
The release contains Health, AUTH-001, USERS-001 and COLLECTIONS-001, unchanged
from the validated behavior. See [release notes](../releases/v0.4.0.md).

Consumers must pin a published version rather than follow `main`. Updating a
consumer requires separate approval and shared conformance against that exact
version; existing evidence against an earlier commit is not evidence of using
the published tag. Current backend adoption is documented in the
[documentation index](../README.md#verification-badges).
Demo defaults remain outside the HTTP contract.

## Previous published immutable release: v0.6.0

**v0.6.0 remains an immutable previous ERBAS Contract release.**

- Tag: `v0.6.0`.
- Annotated tag object: `73740c956402a7405b667498507ede66fc19a66c`.
- Target commit: `92d1282154f340aadcfdf93f52a82a1f3472b335`.

This compatible additive MINOR release adds WMS-001 UoM creation and listing to
Health, AUTH-001, USERS-001, COLLECTIONS-001 and CORE module administration.
Java and .NET adopted v0.6.0. Their validation remains separate from this runner;
contract publication, backend conformance and client consumption are distinct.
See the [release notes](../releases/v0.6.0.md) and [WMS-001](../modules/wms/wms-001.md).
Dated verification reports retain their historical context.

v0.5.0 remains an immutable previous release, tag object
`408f44d56f4ba0554d0bc08de23d397269dae9af`, target
`35be07fe002c364f758ae50419d0ecb86d1f0c43`. See its [release notes](../releases/v0.5.0.md).
v0.4.0 remains the first formal published release, with its identity recorded above.
Existing release tags must never be moved or recreated.

## Previous published immutable release: v0.7.0

**v0.7.0 remains an immutable previous release.**

- Annotated tag object: `c6cdbe0d90c63fb79b1bb36a96d67d822243ffdb`.
- Target commit: `76618b4d6776dca5e13466e7fde44af675d5b08f`.

It adds WMS-002 Storage Attributes. Its tag is unchanged. Earlier release notes
and verification reports retain their historical preparation evidence.
Publication does not imply consumer adoption or conformance.

## Previous published immutable release: v0.8.0

**v0.8.0 is a previous published immutable release.**

- Annotated tag object: `303a61b0207d3984780539da4068ab68c1264a8d`.
- Target commit: `9dcb1605bcddbd450d4c009285313a142ab9fb35`.

[WMS-003](../modules/wms/wms-003.md) adds Item Families and Storage Attribute
associations. [API conventions](api-conventions.md) standardize errors as mandatory
`code` plus nonempty `errors`. This was an incompatible pre-1.0 MINOR release.
Its [historical preparation notes](../releases/v0.8.0.md) retain their original
wording and verification evidence; publication does not imply consumer adoption.
The tag must not be changed.

## Previous published immutable release: v0.9.0

**v0.9.0 is a previous published immutable release.**

- Annotated tag object: `adcfad11c6fe51cb54a92a93f9c1e99a13fb7dc8`.
- Target commit: `138e2381e1010e994a0f9d6306af6f9d420658e5`.

Published v0.9.0 OpenAPI is **0.9.0**, a **compatible additive MINOR** over v0.8.0.
[CORE-CAP-001](../core/capabilities-001.md) adds capability descriptors,
registration invariants and contextual discovery without changing published
v0.8.0 behavior. Capability behavioral versions are independent of the shared
API release and module implementation versions; see its version identity rules.
See [release notes](../releases/v0.9.0.md). Publication does not imply
backend/client adoption or conformance. Consumers may pin the immutable
`v0.9.0` tag. The tag must not be changed.

## Previous published immutable release: v0.10.0

The release OpenAPI is **0.10.0**, a compatible additive MINOR over published
immutable v0.9.0. [CORE-CAP-002](../core/capabilities-002.md) adds synchronous READ
invocation without changing discovery, provider descriptors or existing routes.
See [release notes](../releases/v0.10.0.md).

- Annotated tag object: `a55a8d25beef5c24bc9cdce956a2eb2b14f41fb3`.
- Target commit: `1b7b182374ad432637dd41f46b94b4004470eba0`.

v0.10.0 is a previous published immutable release. Its tag must not be moved
or recreated. Publication does not imply consumer adoption or conformance;
historical verification evidence remains unchanged.

## Previous published immutable release: v0.11.0

The published v0.11.0 OpenAPI is **0.11.0**, a compatible additive MINOR over
published immutable v0.10.0. [AI-001](../modules/ai/ai-001.md) adds
provider-agnostic assistant invocation over effective READ capabilities without
changing existing routes or common error behavior. See
[release notes](../releases/v0.11.0.md).

- Annotated tag object: `fe25924bcf92b30977be3ef3ffb2d484445e0e98`.
- Target commit: `1211a48b78452db794c5ffb01ff2e1d0ba56605a`.

v0.11.0 is a previous published immutable release. Its tag must never be moved
or recreated. Publication does not imply backend/client adoption or conformance;
no live provider integration or live backend conformance is claimed. Historical
verification evidence remains unchanged.

## Previous published immutable release: v0.11.1

Published v0.11.1 is immutable: annotated tag object
`5ea047b3375cf0362397ee1e21c95d4991f09c10`, target commit
`5517f0df5d3cacc57c35ef704131dcb30ad9dde2`. It changed only the full conformance
runner timeout over v0.11.0, without HTTP behavior changes. Its historical
[preparation report](../releases/v0.11.1.md) remains unchanged. Publication does
not imply consumer adoption or current backend conformance.

## Public HTTP version and route policy

The erbas-contract semantic release is the public HTTP contract version;
published Git tags identify immutable releases. The normative
[public API versioning policy](api-conventions.md#public-api-versioning-policy)
defines how it relates to unversioned routes, coordinated breaking migrations,
possible simultaneous route generations, independent `moduleApiVersion` and
explicit consumer compatibility. Apply that policy alongside the release rules
below. This documentation clarification belongs to v0.8.0 preparation and does
not change routes or require another version increment.

## Compatibility and consumption policy

Use semantic versions with immutable `vMAJOR.MINOR.PATCH` tags. Each backend
must explicitly declare the contract release it implements and test that same
release. Consumers must not automatically follow `main`. Updating a contract
version requires an explicitly approved adaptation and conformance verification.

Before 1.0, incompatible changes increment MINOR. Starting at 1.0, incompatible
changes increment MAJOR. Compatible additions increment MINOR; corrections
without observable behavior changes increment PATCH. Record compatibility
impact and changes before requesting release authorization.

Examples of potentially incompatible changes include changing routes, methods,
status codes, authentication, permissions, validations, required fields, or
error structures. Adding a property to the closed `/health` response is
incompatible even if the original `status` property remains intact.

An explicitly selected unpublished checkout may be used during development with
recorded source identity and an explicit opt-in where the consumer requires it.
This exception must not masquerade as consumption of a published version.

## Earlier draft changes

Before the first release, AUTH-001 added login and mandatory explicit test
credentials. USERS-001 advanced 0.2.0 to 0.3.0 with five operations, the closed
User model, disabled-account rejection and an enabled-admin/disposable-environment
prerequisite. COLLECTIONS-001 advanced 0.3.0 to 0.4.0 by replacing the bare user
array with the closed paged envelope and stable id ASC ordering. That wire-shape
replacement required a pre-1.0 minor increment rather than 0.3.1. These draft
changes did not publish releases; their dated verification records remain
historical. See [AUTH-001](../core/auth-001.md), [USERS-001](../core/users-001.md) and
[COLLECTIONS-001](collections.md).

## CI and publication procedure

[Contract CI](../../.github/workflows/ci.yml) runs impact-aware checks on pull
requests and the authoritative `./bin/check` on pushes to `main`. It validates OpenAPI and the runner in
Docker; it neither tests a live backend nor publishes tags, releases or packages.
FULL `./bin/check` remains mandatory before publishing a contract tag; an
impact-aware PR check never replaces release verification. Unknown or transverse
impact escalates to FULL. See [verification levels](../verification/contract-007.md).
Backend publication/deployment must depend on shared conformance against its
own clean ephemeral environment. Backend CI/pin adoption is separate consumer
work, not implemented by this repository's workflow.

The publication sequence below is reusable documentation for an authorized
future release. The first release's v0.4.0 annotated tag and target SHA above
remain the historical identity of that publication, with its original
[release notes](../releases/v0.4.0.md). Do not recreate or move that tag.
Do not execute this procedure without separate authorization for tagging/pushing
and, if desired, GitHub Release publication.

1. Merge the approved release-preparation PR and require Contract CI to pass on
   its exact resulting commit on `main`. Record that full merge/squash commit SHA.
2. Use a clean checkout, fetch `main` and tags, verify the recorded SHA belongs
   to `origin/main`, then validate that exact commit locally. Do not tag a feature
   branch commit or whichever later commit happens to be the current `main` tip.
3. Select the reviewed target version and its release notes. Confirm its tag
   does not exist locally or remotely. Create an annotated tag pointing to the
   recorded merged commit, verify its target, and push only that tag. Never move,
   replace or force-push an existing release tag.

```bash
set -euo pipefail
git fetch origin main --tags
release_version='REPLACE_WITH_REVIEWED_vMAJOR.MINOR.PATCH'
release_commit='REPLACE_WITH_REVIEWED_MERGED_COMMIT_SHA'
[[ "$release_version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]
[[ "$release_commit" =~ ^[0-9a-f]{40}$ ]]
release_notes="docs/releases/${release_version}.md"
git cat-file -e "$release_commit^{commit}"
git merge-base --is-ancestor "$release_commit" origin/main
test -z "$(git status --porcelain=v1 --untracked-files=all)"
git switch --detach "$release_commit"
test -f "$release_notes"
./bin/check
test -z "$(git tag --list "$release_version")"
remote_tag="$(git ls-remote --tags origin "refs/tags/$release_version")"
test -z "$remote_tag"
git tag --annotate "$release_version" "$release_commit" \
  --message "ERBAS Contract $release_version"
test "$(git rev-parse "$release_version^{commit}")" = "$release_commit"
git push origin "refs/tags/$release_version"
```

4. If GitHub Release publication is separately authorized, use the existing
   pushed tag and its release notes; publish no packages. In the same shell with
   the reviewed variables above:

```bash
gh release create "$release_version" --verify-tag \
  --title "ERBAS Contract $release_version" --notes-file "$release_notes"
```

5. Verify the published tag still resolves to the recorded merged SHA. Consumer
   tasks then pin the published version and run their own conformance checks.

Task approval authorizes the final local atomic commit after passing validation,
as defined in [the working agreement](../../AGENTS.md). Pushes, tags, releases,
publication and deployment require separate express authorization; passing
checks alone do not authorize them.

## Published immutable release: v0.12.0

The existing annotated v0.12.0 tag object is
`070990bef7bc0aa8ca8876c6b112d4edc6cf99d7`, targeting
`0d3d1c1cd81cc39b9d9eb8840381c415cb909363`. It adds controlled READ primitive
semantics and typed AI provenance. The historical [preparation notes](../releases/v0.12.0.md)
retain their then-unpublished status wording; they are not the current release
identity. The .NET backend pin is v0.12.0. No new Java/client adoption is claimed.

## Unpublished candidate: v0.13.0

CRUD-CONTRACT-001 prepares an additive MINOR Generic Resource Runtime protocol.
There is no v0.13.0 tag or publication. See [candidate notes](../releases/v0.13.0.md).
Published pins remain unchanged; explicit candidate validation is development
evidence and must not masquerade as adoption of a published release.
