# ERBAS Contract Working Agreement

## Authority and boundaries

OpenAPI is the formal specification of the shared external API. Bruno is its
executable conformance suite. Maintain exactly one shared Bruno collection.
Neither specification nor tests may branch on a backend implementation.
Backends and clients consume the contract; they cannot change it unilaterally.

This repository validates a specification and tests an explicitly supplied URL.
It does not build, start, configure, or stop backends, provision databases, own
backend initialization scripts, or assume where other repositories are located.
Backend repositories own their test infrastructure, migrations, native tests,
bounded readiness waits, and cleanup. Never mount or access the Docker socket
from the runner. Synthetic HTTP fixtures exist only to test the runner.

Development ports are local infrastructure conventions, documented in
`docs/common/development-ports.md`, never HTTP contract requirements. Keep OpenAPI and
Bruno independent of fixed ports and accept a supplied base URL. The runner must
not publish a stable port. Prefer Docker network access for validation.

## Cross-stack contract design

Before adding a shared contractual capability, review how each supported stack
currently provides or could provide the requested observable behavior.
If one stack already provides it, evaluate whether the other stack can reproduce
equivalent observable behavior reasonably and idiomatically.

If multiple stacks provide it, compare their observable semantics, security
characteristics, complexity, maintainability and testability. Choose the most
appropriate common behavior, or an appropriate intermediate/common behavior.
A framework feature does not automatically belong in the ERBAS contract.
Keep behavior implementation-specific when it is not useful or reasonably
portable as a shared capability.

After the shared behavior is chosen, each backend remains free to implement it
differently and idiomatically internally. Java need not copy .NET internals,
and .NET need not copy Spring internals. The contract standardizes observable
behavior only. Promotion of an implementation-specific capability requires
this explicit review and an approved contract change; see
`docs/common/implementation-extensions.md`.

## Execution and dependencies

Docker is mandatory. The host must not require Node.js, Bruno, Redocly, Java,
.NET, or a database runtime. Use `./bin/check` for repository verification and
`./bin/test URL` for external conformance. Both use the same OpenAPI validation.
Every failed assertion, tool error, timeout, or cleanup failure must produce a
nonzero exit status. Do not follow redirects or suppress failing tests.

Pin direct dependencies exactly, commit the dependency lockfile only when
authorized, and pin the Docker base image by version and digest. Install with
`npm ci` inside Docker; never resolve floating dependencies during checks.

### Efficient validation execution

During implementation, prefer the narrowest applicable validation: focused
tests, then `./bin/check-fast` for cheap structural feedback, then
`./bin/check-scope` for behavior owned by known scopes; use broader validation
only when required. `./bin/check-impact` remains the impact-aware planner where
appropriate. `./bin/check` remains the authoritative full repository
verification, and `./bin/test URL` remains external live-backend conformance,
not repository verification.

Do not run a long-running full `./bin/check` or other wait-heavy
repository-wide validation inside an AI-agent session merely to wait for it to
finish when the developer or CI can execute it directly. Repeated polling of a
long-running external process is discouraged because it may cause additional
model turns that repeatedly process existing repository and conversation
context even though the process itself requires no reasoning.

When full verification is mandatory and expected to take materially longer
than focused checks, normally provide the exact command for the developer or
CI to execute; stop and wait for the real result when required before task
completion or commit; continue only after the result is provided; and never
claim that full verification passed unless its result is actually known.
Required full verification remains mandatory wherever current repository or
release rules require it, including before publication when applicable.

If a long-running command genuinely must be executed by the agent, avoid
repeated polling, wait as efficiently as the tooling permits, do not repeatedly
reread unchanged files, and do not rerun unchanged validations without a
concrete reason.

## Versioning and compatibility

Use semantic versioning and immutable release tags. See `docs/common/versioning.md`.
The first published immutable release is `v0.4.0`. Preparing future releases
does not create their tags or publish them. Consumers must pin an explicit
published release; do not silently consume `main`.

Review compatibility against existing consumers and assertions. Changing routes,
required fields, status codes, permission requirements, or accepted inputs can
be incompatible. Adding properties to a closed response schema is incompatible.
During 0.x, breaking changes require a minor increment; from 1.0 onward they
require a major increment. Compatible additions use minor increments and
nonbehavioral corrections use patch increments. Document changes deliberately.

## Task lifecycle and preservation

Work in small, complete, independently verifiable tasks: analysis, explicit
scope, acceptance criteria, explicit approval, implementation, tests, final
verification, documentation, scope review, and a final local atomic commit.
Request and obtain approval before starting the next task; do not expand an
approved task into it.

Task approval also authorizes staging and the final local commit once the task
is implemented, applicable validations pass and the diff contains only that
task's changes. No second authorization is required solely for that commit.
Use one atomic commit, or the minimum number its structure requires, with clear
messages consistent with repository conventions. Preserve all other
repository-specific rules.

Do not commit incomplete tasks or tasks with failed validations. Correct and
revalidate defects found before closing a task. Do not start the next task with
uncommitted changes from the previous one. If a task exceptionally starts with
another task's pending changes, separate their commits correctly before continuing.

Inspect and preserve staged, unstaged, and untracked changes belonging to others.
Use focused patches; do not reformat unrelated code, reset, stash, overwrite,
or remove unrelated resources. Stop and explain a conflict if the approved
change cannot be isolated safely. Write versioned documentation in English.

Task approval does not authorize push, PR creation, merge, tag, release,
publication or deployment; each requires separate express authorization.
Do not claim backend conformance from `bin/check`: only `bin/test URL` verifies
the specified live service. Report actual commands, results, and limitations.

## Public documentation

The root README is a public landing page and must remain brief and scannable.
Keep extensive technical and operational documentation in `docs/`, with
`docs/README.md` as its index. Link to detailed documents instead of duplicating
their content in the root README or across documentation pages.

The README must link the other ERBAS ecosystem repositories. Badges may only
represent real, verifiable states. General CI success, contractual conformance,
and the implemented contract version are distinct facts and must not be
presented as interchangeable. Keep links, compatibility states, and badges
updated as the ecosystem evolves; do not advertise workflows or releases that
do not exist.

## Documentation impact review

Every task must review its documentation impact after implementation, validation
and scope review, before the final local commit. If it changes public behavior,
architecture, configuration, usage, development workflow, API capabilities,
repository status or documented limitations, update the relevant documentation
within the same task and the same future pull request. Otherwise, do not modify
documentation merely to record that the review occurred.

README.md is a stable, brief public landing page for project purpose, high-level
capabilities, architecture and ecosystem relationships, essential quick start,
onboarding and configuration, principal limitations, verifiable badges and links
to detailed documentation. It is not a changelog, task history, endpoint catalog,
record of individual WEB-003 slices or exhaustive inventory of internal checks.
Do not change it merely because an endpoint, field, validation or test is added
or changed, or an internal task is completed. Change README only when its
high-level description, onboarding, architecture, essential configuration,
principal capabilities or limitations become materially false or incomplete.

Functional and technical detail belongs preferably in `docs/`. Feature code and
documentation normally belong in the same task and pull request; use separate
functional and documentation commits when that improves review, for example
`feat(...): ...` and `docs: ...`. Do not automatically create a follow-up DOCS task
or coordinated documentation synchronization after each feature.

Cross-repository documentation synchronization is necessary only for a shared
policy change, a contractual or published version change, an architecture or
ecosystem change, materially false information in another repository, or a
significant milestone that actually affects several repositories. Review related
status references when one of these conditions applies; obtain task approval
for necessary changes in other repositories and keep each repository's commits
separate. Preserve historical references and reports as historical; never rewrite
them to appear current. Change badges only when the verifiable fact they represent
changes. Keep CI, local contract conformance and real full-stack demo verification
distinct.

Write public documentation in English. Complete necessary documentation updates
before the final local commit, then obtain approval before starting the next task.
Independent authorization for push, PR creation, merge, tag, release, publication
and deployment remains required.

## Engineering simplicity

Prefer simple, explicit and maintainable solutions.

Apply these principles:

- **KISS** — keep solutions as simple as the requirements allow.
- **DRY** — avoid duplicated logic and duplicated sources of truth.
- **YAGNI** — do not build abstractions, extension points or infrastructure without a concrete current need.
- **Occam's razor** — when several solutions satisfy the requirements equally well, prefer the one with fewer concepts, dependencies and moving parts.
- **Reuse before invention** — prefer existing mechanisms, conventions and components before introducing new ones.

Do not introduce layers, helpers, factories, interfaces, services or abstractions merely for architectural symmetry or possible future use.

Simplicity must not compromise correctness, security, performance, clarity, testability or contractual behavior.

When duplication is small and removing it would create a more complex abstraction, prefer the clearer solution over mechanically applying DRY.

### No magic literals

Do not use magic literals.

Any literal with contractual, domain, protocol, configuration or behavioral
meaning must have one explicit and descriptive source of truth instead of being
scattered through implementation code, tests, templates, scripts or configuration.
This includes, where applicable:

- numeric and string values;
- endpoint paths, URLs and path fragments;
- HTTP header names, media types, HTTP/status/error codes and protocol tokens;
- state names, configuration keys and environment-variable names;
- contract field names and regular expressions with semantic meaning;
- timeouts, limits, sizes and thresholds;
- database/schema identifiers when they carry semantic meaning.

Prefer, in this order:

1. Existing framework/platform constants or enums.
2. Existing project/domain constants or types.
3. Existing configuration.
4. A narrowly scoped named constant or enum introduced for the concrete need.

Do not introduce local constants that merely duplicate an available and clearer
framework facility, such as HTTP status, header or media-type abstractions.
Examples of meaningful values that should not be scattered:

```text
USERS_PAGE_SIZE = 50
USERS_ENDPOINT = "/api/users"
JSON_MEDIA_TYPE = "application/json"
```

Do not mechanically replace every literal with a constant. A literal may remain
inline when it has no independent semantic meaning, its value is obvious from
the immediate local structure, naming it would reduce clarity, or it is incidental
fixture data whose exact value is irrelevant. Examples include simple array
indexes, trivial loop counters, structural zero/one values without domain meaning,
and arbitrary test values used only as distinct fixtures. Do not introduce
pointless constants such as `ZERO`, `ONE` or `TRUE` without a named domain or
protocol concept.

The objective is to eliminate hidden meaning and duplicated sources of truth,
prevent accidental inconsistencies, and improve readability and maintainability.
It is not a global constants catalog, needless abstraction, or replacement of
every string or number. Apply KISS, DRY, YAGNI, Occam's razor and reuse before
invention; this rule must reinforce simplicity.

Tests are subject to the same rule for production, contractual, protocol or
domain behavior. Do not duplicate production-significant literals unnecessarily:
prefer an exported `USERS_PAGE_SIZE` when asserting the production page size.
A deliberate contractual boundary such as 100 may use a named test/contract
constant when that improves semantic clarity. Arbitrary fixture values may
remain local. Do not couple tests unnecessarily to implementation internals;
correctness and test independence remain important.

The shared contract standardizes observable behavior, not implementation
internals. Each stack may represent contractual values idiomatically in its own
constants, enums or types. This rule does not make erbas-contract a general
constants package or require shared cross-language source-code constants or
generated constants infrastructure.

During scope review, explicitly inspect newly introduced meaningful literals and
confirm that no magic literals were added.
