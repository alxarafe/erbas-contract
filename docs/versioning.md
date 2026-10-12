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

## Development draft: 0.5.0

CONTRACT-003 adds CORE module listing and enabled-state administration. This is
a compatible addition: existing operations, closed User/UserCollection schemas,
status codes and security remain unchanged. Compatible additions increment MINOR
under the pre-1.0 policy, so OpenAPI's development version is **0.5.0**.

**v0.5.0 is not published. v0.4.0 remains the current immutable release** with
its existing tag/SHA. Consumers must keep their current published pin until a
separately approved adaptation task; this repository does not update them.
Publication, tags, releases and pushes require separate express authorization.
No v0.5.0 release notes or tag are created by CONTRACT-003.

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

The publication sequence below is documentation only. It records the first-tag
procedure and serves as a checklist for future releases with their own version
and reviewed commit. `v0.4.0` already exists; do not repeat its creation or move it.
Do not execute publication without separate authorization for tagging/pushing
and, if desired, GitHub Release publication.

1. Merge the approved release-preparation PR and require Contract CI to pass on
   its exact resulting commit on `main`. Record that full merge/squash commit SHA.
2. Use a clean checkout, fetch `main` and tags, verify the recorded SHA belongs
   to `origin/main`, then validate that exact commit locally. Do not tag a feature
   branch commit or whichever later commit happens to be the current `main` tip.
3. Confirm `v0.4.0` does not exist locally or remotely. Create an annotated tag
   pointing to the recorded merged commit, verify its target, and push only that
   tag. Never move, replace or force-push an existing release tag.

```bash
set -euo pipefail
git fetch origin main --tags
release_commit='REPLACE_WITH_REVIEWED_MERGED_COMMIT_SHA'
[[ "$release_commit" =~ ^[0-9a-f]{40}$ ]]
git cat-file -e "$release_commit^{commit}"
git merge-base --is-ancestor "$release_commit" origin/main
test -z "$(git status --porcelain=v1 --untracked-files=all)"
git switch --detach "$release_commit"
./bin/check
test -z "$(git tag --list v0.4.0)"
remote_tag="$(git ls-remote --tags origin refs/tags/v0.4.0)"
test -z "$remote_tag"
git tag --annotate v0.4.0 "$release_commit" --message 'ERBAS Contract v0.4.0'
test "$(git rev-parse 'v0.4.0^{commit}')" = "$release_commit"
git push origin refs/tags/v0.4.0
```

4. If GitHub Release publication is separately authorized, use the existing
   pushed tag and these release notes; publish no packages:

```bash
gh release create v0.4.0 --verify-tag --title 'ERBAS Contract v0.4.0' \
  --notes-file docs/releases/v0.4.0.md
```

5. Verify the published tag still resolves to the recorded merged SHA. Consumer
   tasks then pin the published version and run their own conformance checks.

Task approval authorizes the final local atomic commit after passing validation,
as defined in [the working agreement](../AGENTS.md). Pushes, tags, releases,
publication and deployment require separate express authorization; passing
checks alone do not authorize them.
