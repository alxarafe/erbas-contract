# CONTRACT-007: impact-aware verification

All verification runs in Docker, validates the complete OpenAPI document and examines no external backend. `./bin/check` remains FULL: it runs every repository test and is authoritative. `./bin/check-fast` runs structural repository tests and the impact planner tests. From `composition.test.mjs` it selects the scope-rejection test; the other tests run large Bruno suites and remain in FULL. `./bin/check-scope <scope> [<scope>...]` runs FAST first, then the selected behavioral tests, deduplicating overlapping files. Supported scopes are `health`, `auth`, `users`, `collections`, `modules`, `capabilities`, `wms`, `storage-attributes` and `item-families`. The three WMS business scopes share the existing WMS contract test file.

`./bin/check-impact <base-ref>` finds the merge-base with HEAD and classifies all committed changed paths using a rename-disabled diff. Deleted and renamed paths are therefore considered on both sides. Uncommitted changes are not included. Empty or documentation-only changes select FAST; owned changes select FAST plus the union of scopes; any unknown or transverse path selects FULL, which dominates all scopes. An unresolvable base fails.

The matrix recognizes `docs/**`, `README.md`, `LICENSE` and `AGENTS.md` as FAST. The following paths select their named scope:

| Paths | Scope |
| --- | --- |
| `openapi/core/health/**`, `bruno/core/health/**` | health |
| `openapi/core/auth/**`, `bruno/core/auth/**` | auth |
| `openapi/core/users/**`, `bruno/core/users/**` | users |
| `bruno/core/collections/**` | collections |
| `openapi/core/modularity/**`, `bruno/core/modularity/**` | modules |
| `openapi/core/capabilities/**`, `bruno/core/capabilities/**` | capabilities |
| `openapi/modules/wms/uoms/**`, `bruno/modules/wms/uoms/**` | wms |
| `openapi/modules/wms/storage-attributes/**`, `bruno/modules/wms/storage-attributes/**` | storage-attributes |
| `openapi/modules/wms/item-families/**`, `bruno/modules/wms/item-families/**` | item-families |
| `openapi/modules/wms/capabilities.json`, `bruno/modules/wms/capabilities/**`, `bruno/modules/wms/invocations/**` | capabilities |

The directly owned CORE behavioral test files and WMS capability and invocation test files select their corresponding scopes. Every other path falls back to FULL, including `openapi/erbas.yaml`, `openapi/common/**`, `openapi/modules/wms/shared.yaml`, `redocly.yaml`, `bin/**`, `docker/**`, `scripts/**`, shared scenario infrastructure, `tests/support/**`, `tests/fixtures/**`, `.github/workflows/**` and `.dockerignore`. No semantic YAML inspection is performed.

Pull request CI uses the exact PR base SHA and impact-aware verification. Pushes to main run FULL. Impact-aware PR checks never replace release verification: FULL `./bin/check` remains mandatory on the release commit before publishing a contract tag. None of these checks establishes live backend conformance; use `./bin/test URL` for that purpose.
