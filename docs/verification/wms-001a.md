# WMS-001A verification — 2026-10-13

## Scope and baseline

Pre-publication clarification on `feature/wms-001-uom-contract-v0.6.0`, starting
from clean commit `846546b` (`feat(wms): define UoM contract v0.6.0`). The original
[WMS-001 evidence](wms-001.md) remains historical. Version 0.6.0 is still local
release preparation; no v0.6.0 tag exists. Published v0.5.0 still resolves to
`35be07fe002c364f758ae50419d0ecb86d1f0c43`.

## Contract clarification

Required string `description` is trimmed before validation and persistence.
The existing whitespace convention is ASCII space/tab/CR/LF, removed only at
boundaries. Its normalized length is 1..255 Unicode scalar values. Empty and
whitespace-only values are invalid. Creation and listing expose the normalized
value; case and internal spaces are preserved. This is user content, never
translated. Existing NUL/unpaired-surrogate rejection remains.

`code` retains the exact `^[A-Z][A-Z0-9]{0,9}$` pattern and minLength 1/maxLength
10: uppercase ASCII, initial letter, subsequent letters/digits. No code trimming
or automatic uppercasing is introduced. Invalid inputs retain the exact closed
400 `{"code":"invalid_request"}` response.

OpenAPI retains `WmsUomDescription` for normalized output and adds
`WmsUomDescriptionInput` for raw input, referenced by `CreateWmsUom`. A raw maximum
would incorrectly reject padded valid descriptions; normalized length and
normalization order are specified in prose and verified by Bruno. No proprietary
extensions, routes, error codes or response fields are added.

## Executable coverage

Existing cases now cover padded descriptions at normalized lengths 1 and 255,
and rejection of a padded 256-character description. Empty and space-only
descriptions remain negative cases. Existing one-/ten-character valid codes,
eleven-character invalid codes and lowercase rejection remain covered.

Six appended requests create `BOX` with ` Standard Box `, preserve internal
spaces with ` Standard   Box `, reject numeric-first/separator/padded codes,
and verify the normalized catalogue via GET. Four inherited named checks per
request validate headers, status, closed shape, normalized text, identity,
persistence and ordered windows.

Three additional fault tests demonstrate that the same shared Bruno definitions
reject untrimmed creation responses, untrimmed persisted values on GET, and
length validation before trimming. Each requires the configured defect marker
and the target HTTP method/path, excludes watchdog failures and checks secret
redaction. All eight original WMS fault scenarios remain.

## Final authoritative validation

Command: `./bin/check`, timed externally without runner instrumentation.

| Result | Evidence |
| --- | --- |
| Process | Exit 0; repository verification passed. |
| OpenAPI | Valid, version 0.6.0 preparation. |
| Synthetic/unit tests | 107 passed; 0 failed, skipped, cancelled or todo. |
| Synthetic battery | 343.68 seconds. |
| Total command | 347.68 seconds, including build/lint/cleanup. |
| Full positive Bruno | 182 requests passed; enclosing test 25.77 seconds. |
| Sole collection inventory | 182 request definitions / 714 named checks. |
| WMS subset | 52 requests / 208 inherited checks; 11 rejecting fault tests. |
| Existing v0.5.0 coverage | All 130 definitions / 506 named checks retained unchanged. |
| Cleanup | Ownership-checked runner cleanup passed; fixtures close in finally. |
| Scope review | `git diff --check` passed; meaningful literals reviewed. |

A structural comparison against `846546b` confirmed unchanged non-WMS OpenAPI
paths and all previous components other than description input/output rules.
The code schema was already exact and remains unchanged. Non-WMS Bruno files
are byte-for-byte unchanged; request sequence numbers remain contiguous.

Changes are limited to OpenAPI, the existing WMS folder, synthetic runner
fixtures/inventory/fault tests and affected documentation. The trim regex and
description maximum are narrowly named in the fixture/folder. Existing scopes,
sequential execution, `--bail`, watchdogs, dependencies and tooling are unchanged.
Java, .NET and the WMS laboratory were not modified. No backend/database was
provisioned or examined; this check establishes runner/specification correctness,
not external backend conformance.

No Item, ItemFamily, Warehouse, Inventory, HU or AI capability is introduced.
No push, PR, merge, tag, release, deployment or backend adoption occurred.
