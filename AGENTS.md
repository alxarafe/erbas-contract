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
`docs/development-ports.md`, never HTTP contract requirements. Keep OpenAPI and
Bruno independent of fixed ports and accept a supplied base URL. The runner must
not publish a stable port. Prefer Docker network access for validation.

## Execution and dependencies

Docker is mandatory. The host must not require Node.js, Bruno, Redocly, Java,
.NET, or a database runtime. Use `./bin/check` for repository verification and
`./bin/test URL` for external conformance. Both use the same OpenAPI validation.
Every failed assertion, tool error, timeout, or cleanup failure must produce a
nonzero exit status. Do not follow redirects or suppress failing tests.

Pin direct dependencies exactly, commit the dependency lockfile only when
authorized, and pin the Docker base image by version and digest. Install with
`npm ci` inside Docker; never resolve floating dependencies during checks.

## Versioning and compatibility

Use semantic versioning and immutable release tags. See `docs/versioning.md`.
There is currently no published contract version. Consumers must eventually pin
an explicit release; do not silently consume `main`.

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

After implementation, validation and scope review, review whether the task
changes public behavior, architecture, configuration, usage, development
workflow, API capabilities, repository status, or documented limitations.
If it affects any of these areas, update the relevant README and documentation
as part of the same task before its final local commit. If it does not, do not
modify documentation merely to record that the review occurred.

Keep README a brief landing page covering current capabilities, how to try them,
ecosystem relationships, verifiable badges and principal limitations. Keep
detailed architecture, decisions, processes, configuration, operations and
verification evidence in docs/; preserve historical reports as historical.

When a task changes a capability or status shared across the ERBAS ecosystem,
review status references and badges in related repository READMEs. Keep CI,
local contract conformance and full-stack demo verification distinct. If other
repositories need updates, handle them as an independent coordinated task
immediately after the functional change is merged, preferably before the next
major feature. Do not mix those updates into another repository's functional
commit or leave them indefinitely pending; obtain the required task approval.

The lifecycle is: approve task, implement, validate, review scope, review
documentation impact, update relevant docs if needed, local atomic commit,
then obtain approval for the next task. Existing separate authorization rules
for push, PR, merge, release, publication and deployment remain unchanged.

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
