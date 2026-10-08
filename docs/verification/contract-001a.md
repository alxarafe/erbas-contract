# CONTRACT-001A verification

Verified locally on 2026-10-08 with Docker Engine 29.8.1, Linux amd64.
Only `erbas-contract` was changed. No backend, client, workflow, release tag,
commit, push, publication, or persistent deployment was involved.

## Tool identity

- Bruno CLI: `4.2.0`, verified from the installed package inside the runner.
- Redocly CLI: `2.5.1`, verified from the installed package inside the runner.
- Node: `v22.22.0`, running as UID `1000`.
- Base: `node:22.22.0-bookworm-slim`.
- Pinned multi-platform base index:
  `sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94`.
- Registry's selected linux/amd64 manifest:
  `sha256:7cc56ef285a8568121537d17b05e72128f01b89c54607b51acf084a50ef483f3`.
- Local runner image used:
  `sha256:04cf40da1b6dede253e13e0dc5b56a8c3cf00368addc88544eb775c6bd4b28d1`.

The npm lockfile was generated inside the pinned Node container. All subsequent
runner builds installed its exact resolution using `npm ci`, without host npm.

## Repository verification

`./bin/check` exited 0. OpenAPI validated successfully. All 17 automated checks
passed, with no skipped or cancelled tests:

| Check | Result |
| --- | --- |
| Valid response | Accepted |
| Alternate JSON whitespace | Accepted |
| Escaped JSON value equivalent to `ok` | Accepted |
| `charset=utf-8` parameter | Accepted |
| Case-insensitive media type and quoted parameters | Accepted |
| HTTP 503 instead of 200 | Rejected |
| `text/plain` instead of JSON | Rejected |
| Malformed media type parameter | Rejected |
| `status: down` | Rejected |
| Additional property | Rejected |
| Missing status property | Rejected |
| Malformed JSON | Rejected |
| HTTP 302 to otherwise valid response | Rejected; destination not requested |
| Server never responds | HTTP timeout detected; bounded failure |
| Structurally invalid OpenAPI | Linter returned nonzero |
| Stuck subprocess | Watchdog returned 124 |
| Invalid base URLs | Rejected |

For HTTP scenarios, the fixtures also recorded exactly one request with method
GET, path `/health`, and `Accept: application/json`. Sockets and temporary files
were cleaned up in finalizers. The complete suite took approximately 18 seconds.

## Public command verification

Separate synthetic fixture containers were started on dynamically assigned
loopback ports. Each was examined through the public shell entry point:

```bash
./bin/test --network host http://127.0.0.1:<assigned-port>
```

| Fixture | Exit code | Observed elapsed time | Runner containers remaining |
| --- | --- | --- | --- |
| Valid JSON | 0 | 3 s | 0 |
| Valid charset parameter | 0 | 3 s | 0 |
| Incorrect status | 1 | 3 s | 0 |
| Incorrect content type | 1 | 3 s | 0 |
| Incorrect value | 1 | 3 s | 0 |
| Additional property | 1 | 4 s | 0 |
| Timeout | 1 | 5 s | 0 |
| Redirect | 1 | 3 s | 0 |

These elapsed times include cached Docker build, OpenAPI lint, and CLI startup;
the HTTP request timeout itself is configured to 2 seconds. After every case,
the runner ownership label identified zero remaining containers. Each fixture
was stopped and removed. Final label-based inventories reported zero runner
containers and zero verification fixture containers. No networks or volumes
were created for these public-command checks. Local image/build cache remains.

Shell syntax checks (`bash -n`) and `git diff --check` passed. Missing URL,
invalid network argument, and unexpected check arguments were rejected with
usage errors. All tool execution and fixture servers ran in Docker; the host
did not install or run Node.js, Bruno, or Redocly.

## Limits and next tasks

This verifies the autonomous specification and runner only. Neither real backend
has been adapted or examined by this task. Java conformance belongs to
CONTRACT-001B, .NET conformance to CONTRACT-001C, and joint closure to
CONTRACT-001D. Mandatory CI and the unpublished `v0.1.0` release remain for
CONTRACT-002. No backend checkout selection mechanism is implemented here.
