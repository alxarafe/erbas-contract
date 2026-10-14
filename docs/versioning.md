# Contract versioning

## First formal release: v0.4.0

`v0.4.0` is the first published immutable ERBAS Contract version. Its annotated
tag resolves to `839255ea54610ccf711b29bd096ea294a1ebc3fc`.
The release identity is the published Git tag. GitHub Release and package
publication require separate authorization.
The release contains Health, AUTH-001, USERS-001 and COLLECTIONS-001, unchanged
from the validated behavior. See [release notes](releases/v0.4.0.md).

Consumers must pin a published version rather than follow `main`. Updating a
consumer requires separate approval and shared conformance against that exact
version; existing evidence against an earlier commit is not evidence of using
the published tag. Current backend adoption is documented in the
[documentation index](README.md#verification-badges).
Demo defaults remain outside the HTTP contract.

## Current published immutable release: v0.5.0

**v0.5.0 is the current published immutable ERBAS Contract release.** Its
annotated tag records the following verified identity:

- Tag: `v0.5.0`.
- Annotated tag object: `408f44d56f4ba0554d0bc08de23d397269dae9af`.
- Target commit: `35be07fe002c364f758ae50419d0ecb86d1f0c43`.

It was published after validating that exact `main` commit resulting from the
CONTRACT-004 release-preparation merge. Publication occurred separately from
CONTRACT-005, which only records it; the tag must never be moved or recreated.

This is a compatible additive MINOR release incorporating CONTRACT-003 (CORE
module administration) and CONTRACT-003A (canonical development/conformance
modules). OpenAPI remains **0.5.0**. Existing Health, AUTH-001, USERS-001 and
COLLECTIONS-001 operations, closed User/UserCollection schemas, status codes,
headers and security remain unchanged. See [release notes](releases/v0.5.0.md).

**v0.4.0 is the previous published immutable release and remains the first formal
release**, with its original tag/SHA and historical evidence preserved above.
Consumers explicitly adopt published releases through a separately approved task
per consumer, including shared conformance against that exact release. Java and
.NET now pin v0.5.0; their backend verification remains separate from this runner.
Angular has not yet adopted module administration. Contract publication does not establish backend
conformance or client consumption. GitHub Release and package publication remain
separately authorized operations.

## Next revision preparation: v0.6.0

OpenAPI on this development branch is 0.6.0, adding the first WMS business vertical:
unit-of-measure creation and listing. This is an unpublished compatible MINOR
preparation, not a moved v0.5.0 tag or a backend adoption. See
[WMS-001 design](wms-001.md) and [draft release notes](releases/v0.6.0.md).
Existing consumers must continue pinning their published release until separately
authorized publication and adaptation. No tag or release is created by this task.

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
historical. See [AUTH-001](auth-001.md), [USERS-001](users-001.md) and
[COLLECTIONS-001](collections.md).

## CI and publication procedure

[Contract CI](../.github/workflows/ci.yml) runs the authoritative `./bin/check`
on pull requests and pushes to `main`. It validates OpenAPI and the runner in
Docker; it neither tests a live backend nor publishes tags, releases or packages.
Backend publication/deployment must depend on shared conformance against its
own clean ephemeral environment. Backend CI/pin adoption is separate consumer
work, not implemented by this repository's workflow.

The publication sequence below is reusable documentation for an authorized
future release. The first release's v0.4.0 annotated tag and target SHA above
remain the historical identity of that publication, with its original
[release notes](releases/v0.4.0.md). Do not recreate or move that tag.
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
as defined in [the working agreement](../AGENTS.md). Pushes, tags, releases,
publication and deployment require separate express authorization; passing
checks alone do not authorize them.
