# Implementation-specific extensions

ERBAS standardizes observable behavior across stacks, while allowing useful,
idiomatic implementation-specific capabilities. Classify exposed behavior as
follows:

| Classification | Meaning | Portable client dependency |
| --- | --- | --- |
| Contractual | Defined by shared OpenAPI where applicable and covered by shared conformance where applicable. | Portable/common clients may depend on it. |
| Implementation-specific | Exposed by one implementation or framework, outside the shared ERBAS contract; it may remain useful and idiomatic. | Portable clients must not depend on it. |
| Experimental/deprecated | Implementation-specific behavior with an explicit additional warning that permanence is not guaranteed. | Portable clients must not depend on it; consumers must heed the warning. |

An implementation-specific capability becomes contractual only after an
explicit cross-stack observable-behavior review and an approved contract change.
Review equivalent behavior, security, complexity, maintainability and
testability as required by the [working agreement](../AGENTS.md#cross-stack-contract-design).
A framework feature alone is not grounds for promotion. Backends remain free
to implement the chosen shared behavior differently internally.

For a current concrete example, .NET exposes `POST /api/auth/register` as an
implementation-specific Identity extension. It is outside shared OpenAPI and
Bruno conformance, and portable clients must not depend on it. The .NET
[current documentation](https://github.com/alxarafe/alxarafe-dotnet/blob/main/README.md#status-and-documentation)
also warns that it may change or disappear. This does not require Java to clone
the endpoint. Shared account creation uses administrator-only `POST /api/users`
under [USERS-001](users-001.md).

This document defines classifications and promotion rules, not an exhaustive
catalogue of implementation-specific endpoints.
