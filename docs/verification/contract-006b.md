# CONTRACT-006B: scoped synthetic conformance

## Scope and preserved behavior

This optimization changes synthetic execution only. OpenAPI, the contract version,
all 130 Bruno request definitions and all 506 named checks remain unchanged.
`./bin/check` still validates OpenAPI and runs all 96 tests. Its positive
integration case executes exactly 130 requests. `./bin/test URL` retains the
unambiguous full-suite default; no live backend was examined for this task.

`runBruno` accepts a named internal scope and credentials, not arbitrary CLI
arguments or an alternate collection directory. Bruno 4.2.0 supports multiple
request/folder paths and executes them in argument order. Scopes select the
original files directly from the sole collection. Root group requests are
selected by their existing filename prefixes and sorted by their original
`meta.seq`; no request metadata or duplicate definitions are needed.

| Scope | Selected definitions and bootstrap | Maximum ordinary requests before bail |
| --- | --- | ---: |
| Full (default) | Root requests, then the complete Modules folder | 130 |
| Health | Original Health request only | 1 |
| AUTH | All 14 original login requests | 14 |
| Users | Administrator login, then all 52 original Users requests | 53 |
| Collections | Administrator login, normal-user creation, user listing, both password-boundary creations, then all 15 Collections requests | 20 |
| Modules | Administrator login, normal-user creation/login, then the complete 48-request Modules folder | 51 |

Collections uses HTTP bootstrap only. The first listing sets
`usersTotalAfterFirstCreation`, and the original 12- and 256-character password
boundary requests create the two additional accounts expected by COLLECTIONS-001.
The normal account has the same final enabled/non-admin state as in the full
suite. Faults affecting the bootstrap listing still fail at that original
contractual operation; late pagination faults reach their original target paths.

Modules retains its existing bootstrap and entire sequence, including dependency
conflicts, idempotence, persistent changes and detection of partial mutations.
Only the temporary subset-copy helper is replaced by direct path selection.
Descriptor discovery beyond the first 100 modules still executes 52 HTTP requests,
including its additional page request.

Every Bruno invocation starts a new process. Execution stays sequential. `--bail`,
HTTP timeouts, process watchdogs, outer test budgets, secret protection and cleanup
remain unchanged. There is no public scope flag or alternate check command.

## Fault reachability and coverage review

The original test names and fault inventories were compared with the starting
`main`; none were removed or renamed. Original assertion semantics remain intact.
Health retains its exact one-request/no-redirect assertion. AUTH, Users and Modules
overrides record their application at the targeted response; collection and module
mutation branches record their configured fault when reached. Disabled-token
acceptance also records its application. Records contain identifiers only, never
credentials, tokens or bodies.

Each negative test requires nonzero conformance status and evidence that its
configured defect was reached. Existing pagination target-path and canonical
module discovery assertions remain. Scope exclusion assertions also guard Health,
AUTH, Users and Collections. These checks supplement the shared Bruno assertions;
they do not replace fault detection with fixture-only validation.

The battery preserves 79 faults: Health 9, AUTH 20, Users 17 (including disabled
tokens), Collections 9 and Modules 24. Five positive Health representation cases,
one complete positive suite and one positive paged Modules discovery remain.
Together these use 86 Bruno invocations. The remaining ten tests cover runner,
validation, inventory and fixture behavior.

## Measured comparison

Measured on 2026-10-13 using Docker, cached build layers and the pinned dependencies.
The CONTRACT-006A numbers below are the measured baseline supplied with the approved
task; they remain historical evidence, not a newly rerun baseline.

The complete post-change command was `/usr/bin/time ./bin/check` (exit 0).
Temporary test instrumentation counted requests received during each Bruno call
and measured call wall time with `performance.now()`. It was removed before final
verification and is not part of the runner. No raw Bruno diagnostics were exposed.

| Metric | CONTRACT-006A | CONTRACT-006B | Reduction |
| --- | ---: | ---: | ---: |
| Total `./bin/check` | 500.08 s | 306.95 s | 193.13 s (38.62%) |
| Synthetic battery (Node test duration) | 497.09 s | 303.09 s | 194.00 s (39.03%) |
| Bruno CLI invocations | 86 | 86 | 0 |
| Fixture instances | 90 | 90 | 0 |
| HTTP requests executed by Bruno | 2,332 | 1,096 | 1,236 (53.00%) |
| Full positive Bruno call | ~20.39 s | 20.40 s | Effectively unchanged |

Fixture instances are 86 Bruno-bound fixtures plus four fixture instances in the
three native HTTP tests. The temporary URL-keyed registry observed 89 distinct
base URLs because a loopback port was reused; distinct URLs are not instance
counts. Native HTTP requests are excluded from the Bruno request totals.

| Execution group | Bruno calls | Executed requests | Bruno call wall time |
| --- | ---: | ---: | ---: |
| Full positive suite | 1 | 130 | 20.40 s |
| Health faults | 9 | 9 | 16.14 s |
| Positive Health cases | 5 | 5 | 8.17 s |
| AUTH faults | 20 | 32 | 37.78 s |
| Users faults | 17 | 225 | 59.69 s |
| Collections faults | 9 | 59 | 21.67 s |
| Modules faults | 24 | 584 | 127.50 s |
| Positive paged Modules discovery | 1 | 52 | 10.65 s |
| Total | 86 | 1,096 | 302.00 s |

Group times include CLI startup and process completion; battery duration also
includes the remaining tests and fixture handling. The result matches the
estimated 1,096 requests and lies within the 280–340-second target range.
Modules remains the largest group and was deliberately not shortened.

The measured check reported 96 tests, 96 passes, zero failures, zero skips and
zero cancellations. The inventory test confirmed 130 definitions and 506 named
checks. Fixture cleanup completed; the check command returned success after its
owned-container cleanup verification. Final verification after removing temporary instrumentation also passed with
96/96 tests, zero failures/skips/cancellations, 313.32 s total and a 310.51 s
synthetic battery (exit 0). The small run-to-run variation leaves both measured
checks within the target range. This evidence concerns the repository runner,
not Java/.NET backend conformance or full-stack demo verification.
