# Usage

## Host requirements

Run commands from the repository root. The host needs Bash, Docker, and basic
shell utilities, with permission to run Docker containers. Node.js, Bruno,
Redocly, Java, .NET, PostgreSQL, and Docker Compose are not required on the host
for these checks.

## Build and validate

```bash
./bin/check
```

This validates OpenAPI and verifies the runner using synthetic HTTP servers
inside its container. It does not establish external backend conformance.
After the image has been built, the check container has no external network
access; loopback is sufficient for its fixtures.

Both public commands build the runner with the pinned base image and lockfile,
then execute the resulting immutable local image ID without tagging or
publishing it. The first build needs network access to obtain the image and
locked npm packages. Later builds can reuse Docker cache.

## Check a running service

```bash
./bin/test http://host.docker.internal:48080
```

Replace the example with the target's base URL. The command validates the same
OpenAPI and executes the sole Bruno collection against that URL. The backend
must already be ready: this command does not build, start, or wait for it.

| URL rule | Behavior |
| --- | --- |
| Scheme | HTTP or HTTPS required. |
| Credentials, query, or fragment | Rejected. |
| Base path | Supported; `/health` is appended to the base URL. |
| Trailing slashes | Normalized. |
| Redirects | Not followed; a redirect is not conforming. |

The public probe sends `Accept: application/json`. See the
[specification](../openapi/erbas.yaml) for its closed response schema and the
[ADR](decisions/0001-contract-foundation.md#representation-and-semantics) for
representation rules and liveness semantics.

## Choose Docker networking

Transport selection is independent of backend implementation. Prefer an
existing isolated Docker network when the backend is containerized.

### Existing Docker network

```bash
./bin/test --network test-network http://app:8080
```

The network and reachable service name must already exist. The runner does not
create backend networks or configure the backend.

### Default bridge and host gateway

```bash
./bin/test http://host.docker.internal:48080
```

The default bridge configuration maps `host.docker.internal` to Docker's host
gateway. On Docker Engine Linux, this does not make a service bound only to host
loopback reachable. Choose host networking for that case.

### Host networking on Linux

```bash
./bin/test --network host http://127.0.0.1:48080
```

On Linux, the runner can use the host's loopback through host networking.
Docker Desktop 4.34 and later supports host networking as an opt-in feature.
It supports Linux containers only, requires Enhanced Container Isolation to be
disabled, and operates at the TCP/UDP layer. On Docker Desktop,
`host.docker.internal` normally provides host access. See
[Docker host networking](https://docs.docker.com/engine/network/drivers/host/)
for platform support and limitations.

## Timeouts and exit status

| Operation | Limit |
| --- | --- |
| HTTP request | 2 seconds |
| Bruno process watchdog | 10 seconds |
| OpenAPI lint | 30 seconds |
| Synthetic test suite | 90 seconds |

These limits bound tool execution, not image downloads or Docker builds.
The runner does not retry failed HTTP responses.

| Exit status | Meaning |
| --- | --- |
| `0` | The requested check passed. |
| `2` | Usage or invalid base URL error. |
| `124` | A subprocess exceeded its watchdog deadline. |
| Other nonzero | Tool, assertion, HTTP, connection, timeout, or cleanup failure. |

A successful repository check is different from successful conformance of the
service examined by `bin/test`. Any failure must block the consumer's validation
flow; publication policy is documented in [versioning](versioning.md).

## Runner isolation and cleanup

The runner executes as the unprivileged `node` user, with a read-only filesystem,
a temporary `/tmp`, no capabilities, and no Docker socket or backend mounts.
It does not provision databases or assume where other repositories are located.
Backends own native tests, ephemeral infrastructure, migrations, bounded startup
waits, and cleanup of their own resources.

Runner containers have unique ownership labels and are removed after success
or failure. Only the current invocation's container can be cleaned up. Failure
to verify or complete cleanup makes the command fail. Synthetic fixture sockets
and temporary files are also cleaned up on failure.

Docker build cache and local image layers are retained for subsequent runs;
they are not published. No persistent backend resources are created here.

## Exact tooling

| Component | Exact version |
| --- | --- |
| Bruno CLI | `4.2.0` |
| Redocly CLI | `2.5.1` |
| Node Docker base | `22.22.0-bookworm-slim` |

The base image index is pinned to
`sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94`.
Direct versions are in [package.json](../docker/package.json); transitive
versions and integrity hashes are fixed in [package-lock.json](../docker/package-lock.json).
The [Dockerfile](../docker/runner.Dockerfile) installs with `npm ci --ignore-scripts`
inside Docker. Bruno and Redocly are MIT licensed; updates require an explicit
dependency and compatibility review.

For individual positive and negative test cases and recorded cleanup evidence,
see [CONTRACT-001A verification](verification/contract-001a.md).
