# ADR 0001: Neutral contract and HTTP liveness probe

Status: Architecture approved; foundation implemented by CONTRACT-001A.

## Context

ERBAS has independent backend implementations and a common web client. Their
observable API must converge through a neutral contract, rather than assigning
ownership to the implementation with the most existing functionality.

The initial task needs one small executable contract without migrating
authentication, permissions, modules, or client functionality.

## Route decision

| Candidate | Assessment |
| --- | --- |
| `GET /health` | Conventional technical route, already present in one implementation, and able to coexist with an implementation's operational probes. |
| `GET /api/health` | Consistent with an API prefix, but adds a new route in both implementations without a necessary benefit for this probe. |

Choose `GET /health` deliberately as the shared public contract. Existing use
in one implementation is a useful migration property, not contractual authority.
Existing operational routes such as `/actuator/health` remain backend concerns.

## Representation and semantics

Request: `GET /health`, `Accept: application/json`, no authentication.

Response: HTTP 200, `application/json` with valid optional media type parameters,
and the parsed JSON object `{"status":"ok"}`. `status` is required with constant
value `ok`; additional properties are forbidden. Formatting and object property
order are not contractual. Redirects do not conform and must not be followed.

This is process liveness after HTTP startup. Database connectivity and readiness
of dependencies are deliberately outside its meaning. No failure representation
or additional operation is specified by this initial contract.

## Repository responsibilities

OpenAPI 3.1 is the formal specification. Exactly one Bruno collection checks
conformance, parameterized by `baseUrl`. No implementation selectors or branches
are allowed in either artifact or the runner.

The Docker runner validates a specification and examines a URL. It never builds
or starts backends, provisions databases, accesses their source repositories, or
mounts the Docker socket. Generic Docker network selection is transport
configuration, not implementation behavior.

Backends own clean isolated PostgreSQL instances, migrations, native tests,
builds, startup, bounded readiness waits, and cleanup. They will invoke an
explicitly fixed contract version. Joint verification composes those independent
mechanisms; it does not transfer infrastructure ownership here.

`bin/check` validates the repository and the runner through synthetic HTTP
fixtures. `bin/test URL` invokes the same structural validation and sole Bruno
collection against an already running target. Repository verification alone
does not prove backend conformance. Both commands fail closed on errors and
clean up their own temporary runner container.

## Delivery boundaries

CONTRACT-001A covers the autonomous contract foundation and runner tests.
CONTRACT-001B and CONTRACT-001C adapt each backend separately. CONTRACT-001D
records joint verification and closes the composed objective. CONTRACT-002 owns
mandatory CI integration and the first published release. No version is
published, and no backend conformance is asserted, by CONTRACT-001A.
