# AUTH-001: minimal login

This unreleased contract adds only `POST /api/auth/login`. OpenAPI 3.1 is the
formal authority; the sole Bruno collection supplies shared conformance checks.
Health remains public and unchanged. There is no backend-specific branch.

## HTTP behavior

Send `Content-Type: application/json` and `Accept: application/json`:

```json
{"email":"user@example.test","password":"secret"}
```

`LoginRequest` is a closed object containing exactly the case-sensitive fields
`email` and `password`. Both are required, non-null, nonempty strings. Missing,
empty, wrong-type, extra or incorrectly cased fields, non-object bodies, and
malformed JSON produce 400. Passwords must be passed unchanged, including
whitespace. No email-format regex, password strength rule, or maximum length is
added to this login contract. A nonempty email without email syntax is a
credential check, not a structural failure. Email lookup normalization remains
backend-owned; no cross-backend case-normalization policy is established here.
Clients must not send duplicate JSON member names; their handling is outside
AUTH-001. Unsupported request media types and content negotiation failures are
outside this task's specified JSON exchange.

| Result | Status | `application/json` body | Required header |
| --- | --- | --- | --- |
| Authentication succeeds | 200 | `{"accessToken":"..."}` | `Cache-Control: no-store` |
| Request is invalid | 400 | `{"code":"invalid_request"}` | None |
| Credential check fails | 401 | `{"code":"invalid_credentials"}` | `WWW-Authenticate: Bearer` |

All response objects are closed. Media type case and syntactically valid
parameters are accepted. JSON whitespace and property order are insignificant.
Redirects are not conforming. Error codes are machine-readable identifiers,
not human messages. All unsuccessful credential checks, including unknown
email, wrong password and an account that cannot sign in, have the same 401
body and challenge. Do not return account-existence hints, passwords or other
credential details. Timing equivalence is not asserted by this suite.

The previous contract had no error representation. A one-field JSON error
avoids making framework-specific Problem Details defaults part of the shared
API. This does not prohibit Problem Details on endpoints outside AUTH-001.

## Token semantics and limits

Use the returned nonempty string unchanged as
`Authorization: Bearer <accessToken>` against the issuing backend. The token
must fit the bearer header syntax in
[RFC 6750 section 2.1](https://www.rfc-editor.org/rfc/rfc6750#section-2.1).
This specifies transport syntax only, not OAuth, JWT, claims, signing,
encryption, storage or internal token layout. The scheme is already fixed to
Bearer; a `tokenType` field would repeat it.

Expiry metadata is unnecessary for obtaining and sending the token. Tokens
can expire or become invalid; clients must not decode them or assume an
unlimited lifetime. Refresh and automatic session renewal require a future
contract. No token exchange or cross-backend token acceptance is promised.
Protected endpoints and their expired-token responses are also future scope.
Bruno can verify token syntax here but cannot prove token usability without a
shared protected endpoint; each backend must verify that effect in its own
integration tests. Do not introduce `/me` just to test it.

Registration, logout, refresh, password recovery/change, MFA, OAuth/OIDC,
roles, permissions, user administration and `/me` are excluded. Production
transport requires HTTPS; allowing HTTP for isolated local verification does
not prescribe production transport. Secrets and tokens must not be logged.

## Test credentials and runner

The backend owns provisioning of an isolated disposable test account. Export
`ERBAS_TEST_EMAIL` and `ERBAS_TEST_PASSWORD` using your test environment's secret
injection, then run:

```bash
./bin/test URL
# Or, on an existing isolated network:
./bin/test --network test-network http://app:8080
```

Both variables must be nonempty; there are no live-service defaults. Missing
credentials fail with exit 2 before building or contacting the service. A
successful full-contract result must include login, so silent skipping would
give misleading conformance. Existing consumers pinned to the Health-only
revision retain their old runner behavior until explicitly updated.

The isolated backend fixture must ensure that `absent@auth-001.invalid` and
`not-an-email` cannot authenticate, and that the supplied password followed by
`-AUTH-001-incorrect` is rejected for the test account. These are negative
fixture inputs, never real production identities or secrets. Use a fresh
account and disposable environment: failed login attempts may affect internal
lockout state. This repository does not provision or reset accounts and never
calls a registration endpoint. Provisioning belongs to each backend's test
infrastructure and needs separate implementation approval.

Credentials pass to Docker by environment variable name, not command-line
values, and to Bruno through `bru.getProcessEnv` and `req.setBody`, preserving
JSON quoting and backslashes. They are not build arguments or image contents.
Docker administrators can inspect container environment variables; use only
disposable test credentials. Bruno output is captured and withheld, even on
failure, because faulty responses or transport errors can echo secrets.
The runner reports a generic success/failure and preserves its nonzero exit
status. No response or credential artifacts are written to disk.

`./bin/check` needs no external credentials or backend. Its synthetic server
uses an explicitly fictitious account, checks all request shapes and outcomes,
and tests rejection of incorrect status, response structure, token type/syntax,
media types, caching/challenge headers, redirects and timeouts. Existing Health
negative tests remain. Tests use the same full Bruno collection.

The malformed-JSON case sends a text body with the valid case-insensitive
media type `Application/JSON`. This avoids the pinned runner's HTTP library
automatically quoting invalid JSON strings for lowercase `application/json`.
The fixture asserts that the received body really fails JSON parsing; merely
sending a valid JSON string would not cover malformed JSON.

## Backend compatibility review (2026-10-09)

Read-only local source review; no live backend conformance is claimed.

### .NET

Reviewed `alxarafe/alxarafe-dotnet` at
`d9db3b0f379df0e32485f3dcd22001bfe2b80482`, specifically
`src/Alxarafe.Host/AuthEndpoints.cs`, `Program.cs`, and
`tests/Alxarafe.Host.IntegrationTests/PlatformApiTests.cs`.
The route, method and request's email/password strings already align.
The integration test confirms 200 and a nonempty access token. The endpoint
uses `PasswordSignInAsync` with the bearer scheme and lockout on failure.

Its .NET 10 bearer handler writes the sign-in response directly, including
access token, expiry and refresh token; see the
[versioned official handler source](https://github.com/dotnet/aspnetcore/blob/v10.0.0/src/Security/Authentication/BearerToken/src/BearerTokenHandler.cs).
Therefore replacing `Results.Empty` alone does not establish the closed
LoginResponse: the response-writing integration needs adaptation.
Remove extra response fields, set no-store, and retain a usable bearer token.
Failure currently calls `Results.Problem(401)`, with global Problem Details
customization adding a trace identifier. Adapt to the common closed JSON error
and generic Bearer challenge. Explicitly enforce structural 400 behavior,
including case-sensitive fields and rejection of additional fields; record
binding and framework defaults alone do not demonstrate this behavior.
Malformed JSON handling must use the same contractual error body.
These are source-derived adaptation requirements, not executed backend tests.

[Microsoft's Identity explanation](https://devblogs.microsoft.com/dotnet/whats-new-with-identity-in-dotnet-8/)
describes proprietary bearer tokens. They are conceptually compatible as opaque
client tokens: Java does not need to reproduce or validate that internal format.
Cross-stack token acceptance would be a separate unresolved architectural task.

### Java

Reviewed `alxarafe/erbas` at
`f78c1aa0e94be64ed2a2561a4b483ad16d529702`: Java 25, Spring Boot 4.1.1,
HTTP adapter for Health, JDBC/Flyway infrastructure and no security dependency
or authentication use case. No existing login behavior is claimed.
[Spring Security's authentication architecture](https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html)
supports credential authentication behind authentication providers;
[bearer resource server support](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/index.html)
handles JWT or opaque tokens. This demonstrates conceptual feasibility without
requiring ASP.NET token internals or mandating either Spring token mechanism.
Dependency selection, exact versions, credential persistence and token issuance
remain separate backend decisions. Keep domain/application logic independent
of HTTP and security framework details; implement observable mappings in adapters.

## Decisions and acceptance

The requested scope authorizes only this contract task. The resulting contract
choices are recorded here for review before backend implementation: closed
request/response, minimal JSON error codes, mandatory full-suite credentials,
opaque bearer syntax, no-store, generic challenge and no expiry metadata.
Backend dependencies, provisioning, lockout policies and shared token trust
remain pending; nothing here approves their implementation.

Acceptance: OpenAPI lint, synthetic full-suite success, deliberate
nonconformance detection, unchanged Health coverage, Docker-only `bin/check`,
compatibility documentation, and no edits to consumers. Publication, tags,
commits, deployment and consumer revision updates are not authorized.
