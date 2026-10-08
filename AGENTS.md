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
scope, acceptance criteria, implementation, tests, final verification, and
documentation. Publication or deployment is a separate authorized step when
applicable. Do not expand an approved task into the next task.

Inspect and preserve staged, unstaged, and untracked changes belonging to others.
Use focused patches; do not reformat unrelated code, reset, stash, overwrite,
or remove unrelated resources. Stop and explain a conflict if the approved
change cannot be isolated safely. Write versioned documentation in English.

Do not commit, push, tag, publish, or deploy without express authorization.
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
