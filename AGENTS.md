# ERBAS Contract Working Agreement

## Contract and boundaries

OpenAPI formally specifies the shared external API; Bruno is its executable
conformance suite. Maintain exactly one shared collection. Neither the
specification nor tests may branch on backend implementation, and consumers
cannot change the contract unilaterally.

This repository validates the specification and tests an explicitly supplied
URL. It does not build, start, configure or stop backends, provision databases,
own backend initialization scripts or assume other repositories' locations.
Backend repositories own their test infrastructure, migrations, native tests,
bounded readiness waits and cleanup. Never mount or access the Docker socket
from the runner; synthetic HTTP fixtures only test the runner.

Development ports are local infrastructure conventions, not HTTP contract
requirements; see `docs/common/development-ports.md`. OpenAPI and Bruno must be
independent of fixed ports and accept a supplied base URL. The runner must not
publish a stable port; prefer Docker network access for validation.

Before adding a shared contractual capability, review how each supported stack
provides or could provide the observable behavior. If only one provides it,
evaluate whether the other can reproduce it reasonably and idiomatically. If
multiple stacks provide it, compare observable semantics, security, complexity,
maintainability and testability; choose the most appropriate common or
intermediate behavior. Framework features do not automatically belong in the
contract; keep behavior implementation-specific if it is not useful or
reasonably portable. The contract standardizes observable behavior, not internal
implementation: each backend may implement it idiomatically. Promotion of an
implementation-specific capability requires this review and an approved contract
change; see `docs/common/implementation-extensions.md`.

## Execution and validation

Docker is mandatory; the host must not require Node.js, Bruno, Redocly, Java,
.NET or a database runtime. Pin direct dependencies exactly and the Docker base
image by version and digest; commit the lockfile only when authorized. Install
with `npm ci` inside Docker; never resolve floating dependencies during checks.
Every failed assertion, tool error, timeout or cleanup failure must produce a
nonzero exit status. Do not follow redirects or suppress failing tests.

When a task requires Docker or another repository runtime environment that is
missing but normally preparable, prepare it using the repository's supported
commands, including starting services and building required images. A missing
but preparable environment is not by itself a reason to stop. Do not add
host-installed tooling.

Use the narrowest useful validation during implementation: focused tests, then
`./bin/check-fast` for structural feedback, then `./bin/check-scope` for known
scopes; use `./bin/check-impact` as the impact-aware planner where appropriate.
Use broader validation only when required. `./bin/check` is authoritative full
repository verification; `./bin/test URL` is live-backend conformance for the
specified service, not repository verification. Both use the same OpenAPI
validation. Never claim backend conformance from `./bin/check`.

Run the validation needed to complete the task, including repository-wide builds,
full test suites, image builds and conformance runs when required. Do not avoid a
command merely because it takes time; wait for legitimate validation to finish.
Never repeatedly poll a running process when the tool can wait efficiently, rerun
unchanged failing commands without a concrete reason, or reread unchanged
material. Never claim validation passed without its actual result; missing or
failed mandatory validation blocks task completion and commit. Delegate work to
the developer or CI only for a real external limitation such as unavailable
credentials, an inaccessible external service, permissions genuinely unavailable
to the agent, an operation requiring human authorization, or infrastructure that
the repository's supported workflow cannot provision. Report actual commands,
results and limitations.

Perform only the minimum reconnaissance needed to act safely. Batch independent
inspection where practical, bound command output, and prefer targeted searches
and file ranges to whole trees, large logs, broad dumps or complete large files.
Do not reread unchanged material without a concrete reason or explore unrelated
alternatives after establishing an implementation path or blocker.

## Versioning and compatibility

Use semantic versioning and immutable release tags; see
`docs/common/versioning.md`. The first published immutable release is `v0.4.0`.
Preparing future releases does not create tags or publish them. Consumers must
pin an explicit published release, never silently consume `main`.

Review compatibility against existing consumers and assertions. Changes to
routes, required fields, status codes, permission requirements or accepted
inputs can be incompatible; adding properties to a closed response schema is
incompatible. During 0.x, breaking changes require a minor increment; from 1.0
onward they require a major increment. Compatible additions use minor increments
and nonbehavioral corrections use patch increments. Document changes deliberately.

## Task lifecycle and preservation

Work in small, complete, independently verifiable tasks: analysis, explicit
scope and acceptance criteria, explicit approval, implementation, tests, final
verification, documentation, scope review and a final local atomic commit.
Obtain approval before starting the next task; do not expand an approved task
into it. Task approval also authorizes staging and the final local commit once
implementation and applicable validations pass and the diff contains only that
task's changes; no second authorization is needed solely for that commit. Use
one atomic commit, or the minimum its structure requires, with clear messages
consistent with repository conventions.

Do not commit incomplete tasks or tasks with failed validations; correct and
revalidate defects before closing. Do not start the next task with uncommitted
changes from the previous one. If a task exceptionally starts with another
task's pending changes, separate their commits correctly before continuing.
Inspect and preserve others' staged, unstaged and untracked changes. Use focused
patches; do not reformat unrelated code, reset, stash, overwrite or remove
unrelated resources. Stop and explain if the approved change cannot be isolated
safely. Task approval does not authorize push, PR creation, merge, tag, release,
publication or deployment; each requires separate express authorization.

## Documentation

Write versioned and public documentation in English. After implementation,
validation and scope review, review documentation impact before the final local
commit. Update relevant documentation in the same task and future PR when public
behavior, architecture, configuration, usage, development workflow, API
capabilities, repository status or documented limitations change; otherwise do
not modify documentation merely to record the review. Feature code and docs
normally belong in the same task and PR; separate functional and documentation
commits may improve review. Do not automatically create a follow-up DOCS task or
coordinate documentation synchronization after each feature.

Keep the root README a brief, scannable public landing page covering purpose,
high-level capabilities, architecture and ecosystem relationships, essential
quick start, onboarding and configuration, principal limitations, verifiable
badges and links. Link the other ERBAS ecosystem repositories and detailed docs;
put extensive functional, technical and operational detail in `docs/`, indexed
by `docs/README.md`, without duplication across pages. README is not a changelog,
task history, endpoint catalog, WEB-003 slice record or inventory of internal
checks. Do not change it merely for an endpoint, field, validation, test or task;
change it when its high-level description, onboarding, architecture, essential
configuration, principal capabilities or limitations become materially false or
incomplete.

Badges must represent real, verifiable states; CI success, contractual
conformance and implemented contract version are distinct. Keep links,
compatibility states and badges current; do not advertise nonexistent workflows
or releases, and change badges only when their represented facts change.
Distinguish CI, local contract conformance and real full-stack demo verification.
Cross-repository documentation synchronization is necessary only for a shared
policy, contractual or published version, architecture or ecosystem change,
materially false information in another repository, or a significant milestone
that actually affects several repositories. Review related status references in
those cases, obtain task approval for changes in other repositories and keep
commits separate. Preserve historical references and reports as historical.

Keep this file focused on broadly applicable repository rules; reference existing
docs for detailed task-specific procedures rather than duplicating them. Do not
create documentation merely to shorten this file.

## Engineering simplicity

Prefer simple, explicit, maintainable solutions: apply KISS, DRY and YAGNI; reuse
existing mechanisms, conventions and components before inventing new ones; and,
where solutions are otherwise equal, prefer fewer concepts, dependencies and
moving parts. Do not add layers, helpers, factories, interfaces, services,
abstractions, extension points or infrastructure merely for symmetry or possible
future use. Simplicity must not compromise correctness, security, performance,
clarity, testability or contractual behavior. When removing small duplication
would create a more complex abstraction, prefer clarity over mechanical DRY.

Do not scatter magic literals: give values with contractual, domain, protocol,
configuration or behavioral meaning one explicit, descriptive source of truth
across code, tests, templates, scripts and configuration. This includes meaningful
numbers and strings, paths and URLs, HTTP headers, media types, status and error
codes, protocol tokens, states, configuration and environment keys, contract
fields, regular expressions, timeouts, limits, sizes, thresholds and database or
schema identifiers. Prefer, in order: existing framework/platform constants or
enums; existing project/domain constants or types; existing configuration; then a
narrowly scoped named constant or enum. Do not duplicate a clearer framework
facility with a local constant.

Do not mechanically name literals with no independent meaning, obvious local
structure, or incidental fixture values, when naming reduces clarity. Simple
indexes, counters, structural zero/one and arbitrary distinct fixtures may remain
inline; avoid pointless constants without a domain or protocol concept. Tests
follow the same rule for production, contractual, protocol and domain behavior:
prefer existing production constants when appropriate, or a named test/contract
constant for a meaningful boundary, without unnecessary coupling to internals.
Each stack may represent contract values idiomatically; this repository is not a
general constants package and does not require shared cross-language or generated
constants. During scope review, inspect newly introduced meaningful literals and
confirm no magic literals were added.
