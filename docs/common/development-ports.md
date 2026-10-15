# Ecosystem development ports

These ports are conventions for local development infrastructure. They do not
form part of the HTTP contract. OpenAPI and the single shared Bruno collection
remain neutral; callers supply the target base URL.

| Component | Default host port | Container port | Host-port variable |
| --- | --- | --- | --- |
| Java API | 48080 | 8080 | `ERBAS_JAVA_PORT` |
| .NET API | 48081 | 8080 | `ERBAS_DOTNET_PORT` |
| Angular client | 48082 | 80 | `ERBAS_CLIENT_PORT` |
| PostgreSQL | Not published | 5432 | None |

Development API publications bind exclusively to `127.0.0.1` by default:

```yaml
# Java
ports:
  - "127.0.0.1:${ERBAS_JAVA_PORT:-48080}:8080"
```

```yaml
# .NET
ports:
  - "127.0.0.1:${ERBAS_DOTNET_PORT:-48081}:8080"
```

The default health URLs are `http://127.0.0.1:48080/health` and
`http://127.0.0.1:48081/health`. Override the appropriate variable when another
host port is needed; the API's container port remains 8080. Java's former
`ERBAS_APP_PORT` variable is replaced by `ERBAS_JAVA_PORT`.

If a port is occupied, identify its owner without stopping it. Use an available
override for verification and record both the conventional and actual port.
PostgreSQL remains accessible inside the Docker network on 5432 and is not
published during ordinary development or validation.

## Validation and repository ownership

Backends own their development and ephemeral environments. Validation should
use service URLs on isolated Docker networks, with no host publications, whenever
possible. Native and contractual tests must not depend on 48080, 48081 or 48082
being available. If host access is necessary, discover an assigned port or use
an available override. Remove only resources owned by that validation run.

`erbas-contract` offers no API. Its Docker runner has no stable published port
and tests an explicitly supplied URL. Prefer its existing `--network NETWORK`
interface for containerized backends; see [networking](../usage.md#choose-docker-networking).

Java and .NET implement published `v0.4.0`: Health (`{"status":"ok"}`), AUTH-001,
USERS-001 and COLLECTIONS-001. Both require shared Bruno conformance through
their own authoritative `./bin/check`, locally and in CI.

`erbas-client` implements the Angular application and Docker/Nginx runtime.
It consumes Health, AUTH-001, USERS-001 basic user administration and
COLLECTIONS-001 pagination from either backend through same-origin proxy paths.
Its publication binds `127.0.0.1:${ERBAS_CLIENT_PORT:-48082}` to container port 80.
Host ports remain infrastructure settings, not HTTP contract requirements. See
client development below for the supported proxy routes and methods.

Implementation-specific instructions belong to [Java development](https://github.com/alxarafe/erbas/blob/main/docs/usage.md#development),
[.NET development](https://github.com/alxarafe/alxarafe-dotnet/blob/main/docs/usage.md),
and [client development](https://github.com/alxarafe/erbas-client/blob/main/docs/full-stack-development.md).
