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

The synthetic battery keeps one full positive run of all 494 requests / 2190 named checks. Existing successful behavior is preserved;
legacy errors now require the v0.8.0 envelope.
Health cases retain their single-request scope. AUTH, Users, Collections,
Modules, UoM, Storage Attribute and ItemFamily faults use test-only ordered
scenarios when their scopes would replay unrelated requests. Scenarios select
original requests, including only their prerequisite HTTP setup and any
required persisted-state verification. Folder variables, scripts and
assertions still execute. Every negative case must reach its configured defect;
scenarios do not change request assertions, fault coverage or the shared HTTP
contract. Each run starts a fresh Bruno process, sequentially, with `--bail`.
`bin/test` always executes the complete collection. Scope selection is not a
public command option. See [earlier scoped verification evidence](verification/contract-006b.md)
for the historical coverage and measured comparison with CONTRACT-006A.

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

Export nonempty `ERBAS_TEST_EMAIL` and `ERBAS_TEST_PASSWORD` for a disposable
enabled administrator in an isolated validation environment before invoking
`bin/test`. Missing credentials are a
usage error, never a skipped login check. USERS-001 creates and modifies users;
never run the suite against production. Unique test users remain until the
backend disposes of its environment. See [USERS-001](core/users-001.md) for required
account state and mutations; development suite counters are in [v0.10.0 preparation notes](releases/v0.10.0.md). COLLECTIONS-001
checks paged user windows and totals; use an environment without concurrent
external mutations during the run. See [collections](common/collections.md).
See
[AUTH-001](core/auth-001.md) for
negative fixture prerequisites, safe injection, scenarios and logging rules.

Full conformance requires the backend to register the canonical
AVAILABLE development modules `erbas.dev.math` (no dependencies) and
`erbas.dev.statistics` (depends exactly on Math). They are reserved ERBAS
development/conformance infrastructure, not required production business modules;
normal production does not register them by default. No module-ID environment
variables are required or accepted as fixture configuration. See
[fixture prerequisites](core/modules.md#conformance-fixture-and-mutations).
`bin/test` passes only the two administrator credential variables without logging
secrets. `bin/check` requires neither and uses the same canonical synthetic modules.

CONTRACT-003 changes these modules' persistent enabled states. Use an isolated,
disposable environment without concurrent administrators or functional use; never
run the suite against production. Success leaves both enabled; after failure,
discard the environment. Java/.NET consume published v0.6.0. Published conformance
requires enabled AVAILABLE `erbas.wms` and an initially empty UoM catalogue.
Published v0.7.0 additionally requires an empty Storage Attribute catalogue.
Published v0.8.0 additionally requires an initially empty ItemFamily catalogue,
association support and the standard error envelope. Published v0.9.0 adds
capability discovery; the existing catalogue prerequisites remain unchanged.
Use it against a backend only after separately approved adoption. WMS mutations
persist catalogue rows and associations and restore the module enabled; dispose
of the environment. See [WMS-003](modules/wms/wms-003.md). No backend/client v0.9.0 adoption
or conformance is claimed.

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
| Bruno process watchdog (full conformance) | 120 seconds |
| Bruno process watchdog (scoped conformance) | 30 seconds; ItemFamily scope 90 seconds |
| Bruno process watchdog (synthetic scenario) | 10 seconds |
| OpenAPI lint | 30 seconds |
| Synthetic test suite | 900 seconds |

Within the synthetic suite, full Bruno runs retain a 130-second outer test
budget so the 120-second full-conformance watchdog and fixture cleanup can
finish on slower hosted runners. Targeted mutation scenarios have 15-second
outer budgets, including cleanup. HTTP timeout and stuck-subprocess assertions
remain bounded independently.

The expanded WMS-003 fault battery uses a bounded 900-second suite budget;
individual HTTP requests retain their 2-second limit.

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
flow; publication policy is documented in [versioning](common/versioning.md).

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

## Capability discovery conformance

The full suite includes [CORE-CAP-001](core/capabilities-001.md): authenticated
effective discovery and three WMS-owned descriptors. The existing enabled admin,
normal user created by the suite and AVAILABLE `erbas.wms` fixture prerequisites
remain sufficient; no new credentials or permission configuration is required.
The suite disables and restores WMS using existing module administration to
observe discovery filtering. Run only against a disposable supplied service URL.
Schemas referenced by descriptors resolve against the bundled OpenAPI from the
explicitly selected contract revision, not against the service URL.

The unpublished v0.10.0 full suite also includes
[CORE-CAP-002](core/capabilities-002.md) READ invocation. It uses the same service
URL, credentials and disposable WMS prerequisites. Invocation results are compared
with the existing GET collections for default and explicit offset/limit windows;
the suite also disables/restores WMS to verify masked invocation responses.
No backend/client v0.10.0 adoption or live conformance is claimed. Unexpected
execution failures have one safe HTTP 500 response; the suite does not require a
public fault-injection interface or intentionally break a supplied backend.
