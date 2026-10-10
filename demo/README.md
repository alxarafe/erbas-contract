# Shared development/demo defaults

[defaults.env](defaults.env) is the canonical source for the initial public
credentials of the ERBAS full-stack development/demo environment. These values
are deliberately public, are not secrets and must never be used in production.
They are an ecosystem development/demo convention hosted by the neutral shared
repository, not production configuration, OpenAPI or Bruno conformance artifacts.
They do not change the HTTP contract or its draft version.

Consumers will use this precedence for each value:

1. An explicit `ERBAS_DEMO_*` environment variable supplied by the developer.
2. The corresponding value in `erbas-contract/demo/defaults.env`.

The administrator identity has `enabled=true` and `admin=true`. The regular
identity has `enabled=true` and `admin=false`. These defaults assign no
module-specific permissions; Catalog and AiAgent permissions remain separate.

These are initial defaults only. Disabling an account, changing its password
in a future feature, or otherwise modifying it can make the defaults stop
authenticating. The checked-in file does not restore mutated accounts.
The developer may reset/recreate the development environment or provide
`ERBAS_DEMO_*` overrides. Account-reset behavior is outside this task.

Backend and client adoption takes place in separate repository tasks. This
repository neither provisions these identities nor replaces the explicit
`ERBAS_TEST_*` credentials required by the [conformance runner](../docs/usage.md).
