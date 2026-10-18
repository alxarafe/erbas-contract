# CORE-CAP-002 verification

Scope: [synchronous READ invocation](../core/capabilities-002.md), contract-only
preparation for unpublished v0.10.0 over immutable v0.9.0. Starting HEAD:
`d3294a7af7fd98e499f085e984d9460259b6d76d`.
The working tree was initially clean on
`feature/core-cap-002-invocation-v0.10.0`. No other repository was inspected or
modified. No backend was built, started, configured or tested.

## Contract and preservation

OpenAPI adds one POST operation, its closed request and successful envelope,
and one global-envelope execution failure: HTTP 500
`capability_execution_failed`. Trusted server execution context, minimum audit,
security precedence and the requirement never to return known invalid output as
200 are normative. No runtime schema validator or dispatch mechanism is required.

The sole Bruno collection contains **560 requests / 2467 named checks**;
**38 requests / 152 checks added**, sequences 523–560. All 522 previous requests
and their assertions remain byte-identical. Existing WMS descriptors and schemas,
CORE-CAP-001 discovery and historical release/verification files are unchanged.
The full collection was inventoried, not executed in this session.

The preservation test removes only the invocation additions and restores the
exact v0.9.0 tag's version/description, including its original preparation wording.
Its dereferenced SHA-256 is
`463164642b48bb44b5eb725f40bc73078682f3ac614742c9aa5e7ee32e65b6af`.
The source HEAD differs from the published OpenAPI only in release-description
metadata. The exact published tag was read locally to compute the baseline;
no tag was created or moved. The prior v0.8.0 hash remains independently checked:
`0ad19e56e34d44eb90464436c8dfbb09a2e99fa52e82608d652a6e3c2318f9b8`.
No prior contract behavior or assertion is relaxed.

## Focused validation

All JavaScript, Bruno and Redocly execution uses Docker, the existing pinned base
image and exact dependency lockfile. No host Node/Bruno/Redocly is required and no
dependency or lockfile changes were made. Docker access required sandbox approval;
validation containers use no network and never mount the Docker socket.

Build command (exit 0):

```bash
docker build --quiet --file docker/runner.Dockerfile --tag erbas-contract-core-cap-002 .
```

The first focused run passed **38/38**, no failures, cancellations or skips, in
85.978 seconds. It selected:

```text
node --test --test-concurrency=1 tests/modules/wms/invocations.test.mjs tests/core/capabilities.test.mjs tests/modules/wms/capabilities.test.mjs tests/common/inventory.test.mjs tests/common/boundaries.test.mjs
```

It ran in the built Docker runner with the current tests mounted read-only.
Discovery regression coverage includes descriptor faults, error-envelope faults,
empty/absent-provider/opaque-owner/multipage catalogues, cross-page duplicates,
WMS permission filtering and module gating, with conforming positive controls.
A separate preservation run also passed **1/1**, exit 0.

After final fixture failure handling and exact published-baseline verification,
the final focused selection passed **22/22**, no failures, cancellations or
skips, in **26.353 seconds**, exit 0:

```bash
docker run --rm --network none --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m --cap-drop ALL \
  --security-opt no-new-privileges --entrypoint node \
  --volume /home/rsanjose/Desarrollo/Alxarafe/erbas-contract/openapi:/runner/openapi:ro \
  --volume /home/rsanjose/Desarrollo/Alxarafe/erbas-contract/tests:/runner/tests:ro \
  --volume /home/rsanjose/Desarrollo/Alxarafe/erbas-contract/bruno:/runner/bruno:ro \
  erbas-contract-core-cap-002 --test --test-concurrency=1 \
  tests/modules/wms/invocations.test.mjs tests/common/openapi.test.mjs \
  tests/common/inventory.test.mjs tests/common/boundaries.test.mjs
```

The final OpenAPI lint passed, exit 0:

```bash
docker run --rm --network none --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m --cap-drop ALL \
  --security-opt no-new-privileges --entrypoint node \
  --volume /home/rsanjose/Desarrollo/Alxarafe/erbas-contract/openapi:/runner/openapi:ro \
  erbas-contract-core-cap-002 scripts/validate.mjs
```

Final review tightened existing output lexical assertions (NUL/unpaired-surrogate
labels and CR/LF codes) and checked the corresponding folder constants against
OpenAPI. Using the same Docker command/mounts above with this final test selection
passed **3/3**, no failures, cancellations or skips, in **14.034 seconds**, exit 0:

```text
node --test --test-name-pattern='CORE-CAP-002 OpenAPI|shared Bruno invocation suite|invocation defect: output' tests/modules/wms/invocations.test.mjs
```

Invocation coverage executes the 38 new requests after the existing three-request
administrator/normal-user bootstrap, against synthetic catalogues prepopulated
with three records each. Default and offset=1/limit=1 results for all three
capabilities are compared to their existing GET collections. Closed envelopes,
exact capability IDs, nonempty distinct server invocation IDs, collection/item
shape, IDs, code/label constraints, order, totals and windows are checked.

Negative coverage includes authentication before invalid ID/malformed body,
malformed IDs, malformed/missing/non-object inputs and bodies, invalid pagination,
unknown/unauthorized/unavailable/disabled providers before body validation,
caller security/context fields at both body and input levels, a spoofed normal
user, disable/restore and restored success. Synthetic mutations demonstrate
rejection of wrong capability ID, empty invocation ID, extra envelope fields,
invalid output items and incorrect pagination.

Synthetic provider exception and known invalid-output cases both produce the
same exact safe 500 body/headers, with no public invocation ID or internal details;
an internal invocation ID is retained in the fixture's request journal. This is
runner verification, not proof of a backend's runtime validation or audit.

## Scope and documentation review

New meaningful literals were reviewed: paths/suffix/error code have named fixture
constants; collection bounds/defaults reuse existing common constants and OpenAPI
references. Bruno uses folder variables for paths, provider identity, limits and
lexical constraints, checked against OpenAPI by focused tests. Invalid values and
caller-supplied fields are deliberate named negative fixtures. No general
constants package, dependency, backend-specific branch or new business behavior
is introduced. CORE definitions do not import WMS definitions.

Documentation impact is covered by the new design, verification and unpublished
release notes plus the documentation index, usage and versioning. The brief root
README still accurately describes published v0.9.0 and remains unchanged.
Historical verification and release notes are preserved. No cross-repository
synchronization or consumer-pin changes were authorized or performed.

Full repository verification was subsequently executed with `./bin/check` and
passed **173/173 tests**, with no failures, cancellations or skips
(`duration_ms 549064.25203`; wall time `9m13.177s`). This repository check
examines OpenAPI and synthetic/unit runner tests; it does not execute live
backend conformance. No `./bin/test URL` was run. Synthetic success is not
Java/.NET/client conformance. Trusted context, durable audit and backend
implementation need backend-owned validation. There are no unresolved
contractual decisions within the approved scope; write execution and all
explicitly excluded later features remain undefined by this revision.

No staging, commit, push, PR, merge, tag, release, publication or deployment was
performed. Changes remain local and unstaged for review.

## Files and final local state

13 modified tracked files and 68 new untracked files; nothing staged.

Modified tracked files:

- `docs/README.md`.
- `docs/common/versioning.md`.
- `docs/usage.md`.
- `openapi/core/capabilities/contract.yaml`.
- `openapi/erbas.yaml`.
- `scripts/conformance/modules/wms.mjs`.
- `tests/common/boundaries.test.mjs`.
- `tests/common/openapi.test.mjs`.
- `tests/fixtures/capabilities.mjs`.
- `tests/fixtures/composed.mjs`.
- `tests/fixtures/core.mjs`.
- `tests/fixtures/modules/wms/catalogues.mjs`.
- `tests/support/constants.mjs`.

New files:

- `bruno/modules/wms/invocations/folder.bru` and the 38 requests listed in
  `tests/modules/wms/invocation-scenarios.mjs` (sequences 523–560).
- `docs/core/capabilities-002.md`.
- `docs/releases/v0.10.0.md`.
- `docs/verification/core-cap-002.md`.
- `tests/modules/wms/invocation-scenarios.mjs`.
- `tests/modules/wms/invocations.test.mjs`.

Final static checks: `git diff --check` passed; local links in all modified/new
documentation resolve. Existing tracked Bruno files, WMS declarations and
v0.9.0 release/CORE-CAP-001 verification files have no diff.
