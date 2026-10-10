# Shared development/demo defaults

[defaults.env](defaults.env) is the canonical source for the initial public
credentials of the ERBAS full-stack development/demo environment. These values
are deliberately public, are not secrets and must never be used in production.
They are an ecosystem development/demo convention hosted by the neutral shared
repository, not production configuration, OpenAPI or Bruno conformance artifacts.
They do not change the HTTP contract or its draft version.

Consumers use this precedence for each value:

1. An explicitly exported `ERBAS_DEMO_*` environment variable supplied by the developer.
2. The corresponding value in `erbas-contract/demo/defaults.env`.

The administrator identity has `enabled=true` and `admin=true`. The regular
identity has `enabled=true` and `admin=false`. These defaults assign no
module-specific permissions; Catalog and AiAgent permissions remain separate.

These are initial defaults only. Disabling an account, changing its password
in a future feature, or otherwise modifying it can make the defaults stop
authenticating. The checked-in file does not restore mutated accounts.
The developer may reset/recreate the development environment or provide
matching `ERBAS_DEMO_*` overrides. Persisted accounts are never silently reset,
re-enabled, promoted or demoted by the orchestration.

`erbas-client` owns full-stack demo orchestration: it reads this defaults file
and passes the effective administrator values to Java's existing controlled
authentication bootstrap and .NET's existing CORE administrator seed. The
backends remain independently runnable and do not read the defaults file directly.
After startup, the orchestration creates/verifies the regular demo user through
the shared administrator-authorized `POST /api/users` API and verifies both
identities by login and `/api/auth/me`.

`erbas-contract` does not provision identities itself. The explicit `ERBAS_TEST_*`
credentials required by the [conformance runner](../docs/usage.md) remain
independent of the demo defaults.
