# Contract versioning

No version has been published. `v0.1.0` is the first planned release; OpenAPI's
`info.version: 0.1.0` identifies the intended draft, not an existing release tag.
Do not create backend version declarations or claim consumption of a published
release during CONTRACT-001A.

## Future release policy

Use semantic versions with immutable `vMAJOR.MINOR.PATCH` tags. Each backend
must explicitly declare the contract release it implements and test that same
release. Consumers must not automatically follow `main`. Updating a contract
version requires a deliberate change and conformance verification.

Before 1.0, incompatible changes increment MINOR. Starting at 1.0, incompatible
changes increment MAJOR. Compatible additions increment MINOR; corrections
without observable behavior changes increment PATCH. Record compatibility
impact and changes before requesting release authorization.

Examples of potentially incompatible changes include changing routes, methods,
status codes, authentication, permissions, validations, required fields, or
error structures. Adding a property to the closed `/health` response is
incompatible even if the original `status` property remains intact.

During pre-release backend integration, an explicitly selected local checkout
may be tested with recorded source identity and an explicit unreleased-checkout
opt-in. That mechanism belongs to CONTRACT-001B and CONTRACT-001C; it is not
implemented here and must not masquerade as a published version.

## Publication and enforcement

CONTRACT-002 will establish release tagging, fixed backend consumption, and
mandatory GitHub Actions integration. Local and workflow validation must invoke
the same versioned commands. Publishing or deploying a backend must depend on
successful shared-contract conformance against its clean ephemeral environment.

Tags, commits, pushes, releases, publication, and deployment require express
authorization. A passing local check does not authorize any of these actions.
