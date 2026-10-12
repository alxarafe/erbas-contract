# ERBAS Contract

> One executable contract. Multiple interchangeable implementations.

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

[![Java backend CI](https://github.com/alxarafe/erbas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/alxarafe/erbas/actions/workflows/ci.yml)
[![.NET backend CI / shared conformance](https://github.com/alxarafe/alxarafe-dotnet/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/alxarafe/alxarafe-dotnet/actions/workflows/ci.yml)
[![Angular client CI](https://github.com/alxarafe/erbas-client/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/alxarafe/erbas-client/actions/workflows/ci.yml)

[![Published v0.4.0](https://img.shields.io/badge/contract-v0.4.0-blue)](https://github.com/alxarafe/erbas-contract/tree/v0.4.0)
[![OpenAPI 3.1](https://img.shields.io/badge/OpenAPI-3.1-6BA539)](openapi/erbas.yaml)
[![Bruno CLI 4.2.0](https://img.shields.io/badge/Bruno_CLI-4.2.0-F4AA41)](bruno/)
[![Docker-based validation](https://img.shields.io/badge/validation-Docker--based-2496ED)](docs/usage.md)

ERBAS Contract defines one observable HTTP API for independent backend stacks
and a shared client. OpenAPI specifies the behavior; one Bruno collection checks
it against a supplied URL, keeping implementation details outside the contract.

## ERBAS ecosystem

```mermaid
flowchart LR
    Contract["erbas-contract<br/>Defines external behavior"] -->|implemented by| Java["Java / Spring Boot"]
    Contract -->|implemented by| Dotnet["C# / ASP.NET Core"]
    Contract -->|consumed by| Client["erbas-client / Angular"]
    Contract -. future implementations .-> Other["Other stacks"]
```

| Repository | Responsibility | Current status |
| --- | --- | --- |
| [erbas-contract](https://github.com/alxarafe/erbas-contract) | Shared OpenAPI and sole Bruno conformance collection | Published immutable v0.4.0; development prepares draft 0.5.0 with CORE module administration |
| [erbas](https://github.com/alxarafe/erbas) | Java/Spring Boot backend implementing Health, AUTH-001, USERS-001 and COLLECTIONS-001 | Adopted v0.4.0; authoritative `./bin/check` requires shared conformance locally and in CI |
| [alxarafe-dotnet](https://github.com/alxarafe/alxarafe-dotnet) | .NET backend implementing Health, AUTH-001, USERS-001 and COLLECTIONS-001 plus platform modules | Adopted v0.4.0; authoritative `./bin/check` requires shared conformance locally and in CI |
| [erbas-client](https://github.com/alxarafe/erbas-client) | Angular 22 client consuming Health, AUTH-001, USERS-001 basic user administration and COLLECTIONS-001 pagination from either backend | Shared client for both backends; real Java/.NET interoperability verified |

Backends own their builds and isolated test infrastructure; this repository
owns the shared contract. The client works against either backend through its
same-origin Nginx proxy, keeping each opaque token only in memory.

## Quick start

```bash
./bin/check
# Export ERBAS_TEST_EMAIL and ERBAS_TEST_PASSWORD for an isolated administrator.
# Register the canonical development modules; see docs/usage.md.
./bin/test URL
```

`./bin/check` validates OpenAPI and verifies the runner using synthetic servers.
`./bin/test URL` validates OpenAPI and checks the already running service at URL.
The added `Contract CI` workflow invokes `./bin/check` on pull requests and
pushes to `main`, without publishing anything.

Conformance mutates users and module fixture states and requires an isolated disposable environment.
Both run through Docker; see [usage and networking](docs/usage.md).

See [development ports](docs/development-ports.md) for local infrastructure conventions.

## Current contractual coverage

Development prepares **0.5.0 draft** with administrator-only CORE module
administration. See [module administration](docs/modules.md). The published
release remains **v0.4.0**; consumers have not adopted the new API.

```text
GET /health
200 application/json
{"status":"ok"}
```

This public probe only establishes HTTP process liveness, not PostgreSQL or
dependency health; exact response rules are in [OpenAPI](openapi/erbas.yaml).

AUTH-001 adds `POST /api/auth/login`: email/password JSON, a minimal access-token
response, and distinct 400/401 errors. See [AUTH-001](docs/auth-001.md) for the
contract and test credentials; its dated compatibility review records historical
adaptation requirements.

USERS-001 adds `/api/auth/me` and administrator-only user list, get, create and
update operations. Disabled users cannot authenticate or retain access. See
[USERS-001](docs/users-001.md) for the minimal model and rules.
[COLLECTIONS-001](docs/collections.md) standardizes paged collections and applies
`items`, `offset`, `limit`, `total`, `order` to user listing. Both backends
implement these capabilities; Angular consumes basic user administration and
pagination from either backend. See the
[client development guide](https://github.com/alxarafe/erbas-client/blob/main/docs/full-stack-development.md)
for behavior and verification scope.

Java and .NET both pin published `v0.4.0` and require the shared suite through
their authoritative `./bin/check`, locally and in GitHub Actions.
.NET's `POST /api/auth/register` remains an
[implementation-specific extension](docs/implementation-extensions.md).
Angular CI checks the client and isolated runtime proxies; the
[real dual-backend demo](https://github.com/alxarafe/erbas-client/blob/main/docs/full-stack-development.md#web-002-integration-verification-2026-10-09)
provides separate integration evidence. Workflow results do not guarantee future
backend conformance.

## Documentation and next steps

The [shared demo defaults](demo/README.md) define public initial development/demo
credentials now consumed by Java, .NET and the Angular client's full-stack demo
orchestration.

Start with the [documentation index](docs/README.md) for usage, decisions,
verification evidence, versioning, and working rules.

`v0.4.0` is the first published immutable release, adopted by both backends.
CONTRACT-002 is complete. See the [release notes](docs/releases/v0.4.0.md) and
[versioning/publication procedure](docs/versioning.md) for its exact commit and
consumption policy. Consumers must pin the published version and verify conformance.
Backend workflows and their coverage are described in the
[documentation index](docs/README.md#verification-badges).

## License

Copyright (c) 2026 Alxarafe. Licensed under [Apache-2.0](LICENSE).
