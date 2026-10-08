# erbas-contract

The neutral, shared external HTTP contract for ERBAS. OpenAPI is the formal
specification; a single Bruno collection is its executable conformance suite.
There is no published release yet. The first planned release is `v0.1.0`.

## Responsibilities

This repository validates OpenAPI and checks an explicitly supplied base URL.
It does not know how a backend is built, started, configured, or persisted.
It contains no backend database configuration, backend-specific branches,
repository-location assumptions, or application build orchestration.

Each backend owns its native tests, clean ephemeral database, migrations,
application startup, bounded readiness wait, invocation of the shared contract,
and cleanup even after failure. The client consumes OpenAPI. Neither backend
nor client can change the external contract unilaterally.

## Local execution

The host needs Bash, Docker, and basic shell utilities. It does not need Node.js,
Bruno, Redocly, Java, .NET, PostgreSQL, or Docker Compose for this task.

```bash
./bin/check
./bin/test http://host.docker.internal:48080
```

`bin/check` validates OpenAPI and tests the runner against synthetic HTTP
servers inside its container. It does **not** establish external backend
conformance. After the image has been built, its check container has no external
network access; loopback is sufficient for the synthetic fixtures.

`bin/test URL` validates the same OpenAPI and runs the sole Bruno collection
against that URL. The application must already be ready. The command never
starts or waits for a backend. URL credentials, query strings, and fragments
are rejected. A base path is supported; trailing slashes are normalized.

Select an existing Docker network explicitly when necessary:

```bash
./bin/test --network test-network http://app:8080
```

The default bridge configuration maps `host.docker.internal` to Docker's host
gateway. On Docker Engine Linux, that gateway does not make a service bound
only to host loopback reachable. Use host networking for that case:

```bash
./bin/test --network host http://127.0.0.1:48080
```

Host networking is supported on Linux and is opt-in on supported Docker Desktop
versions. On Docker Desktop, `host.docker.internal` normally provides host
access. See [Docker host networking](https://docs.docker.com/engine/network/drivers/host/).
Prefer an existing isolated Docker network when testing containerized backends.
Transport selection is independent of backend implementation.

Both scripts build the runner using the lockfile and then execute the resulting
immutable local image ID, without tagging or publishing it. Docker build cache
and local image layers remain available for later runs. Network access is
required on the first build to obtain the pinned image and locked npm packages.

The runner executes as the unprivileged `node` user, with a read-only filesystem,
a temporary `/tmp`, no capabilities, and no Docker socket or backend mounts.
Containers have unique ownership labels and are removed after success or
failure. Only this invocation's container can be cleaned up. An inability to
verify or complete container cleanup makes the command fail.

## Contract coverage

The only specified operation is public `GET /health` with
`Accept: application/json`. A conforming service returns:

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{"status":"ok"}
```

`status` is required, its sole allowed value is `ok`, and additional properties
are prohibited. JSON whitespace and object property order are irrelevant.
The media type is matched case-insensitively and valid optional parameters,
including `charset=utf-8`, are accepted. Redirects are not followed.

This proves only HTTP process liveness after startup. It does not establish
database health, readiness of dependencies, or conformance of other endpoints.

The HTTP request has a 2-second timeout. The Bruno process has an independent
10-second deadline. OpenAPI lint has a 30-second deadline and the synthetic test
suite has a 90-second deadline. These limits bound execution, not image download
or Docker builds. Invalid arguments, structural errors, assertions, connection
errors, timeouts, and cleanup errors produce nonzero exit codes. Usage errors
return 2; the process watchdog returns 124.

## Runner verification

`bin/check` uses the same collection for every fixture, exercising:

- Valid JSON, alternate whitespace and escaped JSON values.
- Valid token and quoted media type parameters.
- Incorrect status, media type, malformed media type parameter, and body value.
- Additional or missing properties and malformed JSON.
- A redirect whose destination would otherwise conform.
- An HTTP server that never responds.
- Invalid OpenAPI structure, invalid URLs, and the process watchdog.

Fixtures are synthetic runner tests, not alternative backend implementations.
Their sockets and temporary files are closed or removed even on failure.

## Reproducible tooling

| Component | Exact version |
| --- | --- |
| Bruno CLI | `4.2.0` |
| Redocly CLI | `2.5.1` |
| Node Docker base | `22.22.0-bookworm-slim` |

The base image index is pinned to
`sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94`.
Transitive npm versions and integrity hashes are fixed in
`docker/package-lock.json`. Installation uses `npm ci --ignore-scripts` inside
Docker. Bruno and Redocly are MIT licensed; version updates require an explicit
dependency and compatibility review.

See [the architecture decision](docs/decisions/0001-contract-foundation.md),
[versioning](docs/versioning.md), [working rules](AGENTS.md), and the
[CONTRACT-001A verification record](docs/verification/contract-001a.md).

## Incremental delivery

`CONTRACT-001A` supplies this autonomous foundation. Java adaptation belongs to
`CONTRACT-001B`, .NET adaptation to `CONTRACT-001C`, and joint verification and
closure to `CONTRACT-001D`. None is implied by success of the runner's self-tests.

Mandatory GitHub Actions integration, publication of `v0.1.0`, and definitive
consumption of a published version belong to `CONTRACT-002`. No workflow,
reusable Action, backend version declaration, or release is created here.
