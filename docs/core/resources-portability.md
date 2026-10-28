# Generic resource protocol portability review

CRUD-CONTRACT-001 promotes an observable protocol, not the .NET object model.
The demonstrated implementation is .NET; Java support for the new protocol is
not claimed. Published [v0.13.0](../releases/v0.13.0.md) does not establish formal
adoption by .NET, Java or `erbas-client`; consumer pins remain unchanged.
Existing Java consumers retain their published version until an explicit adoption
task implements and validates the new routes.

| Concern | .NET evidence | Java implementation assessment | Chosen public behavior |
| --- | --- | --- | --- |
| Static schemas | Resource metadata and HTTP integration tests | Plain DTOs and a resource/operation dispatch map can represent the same model | Language-neutral field/operation metadata |
| Scalars | Canonical exact numbers and date/time tests | Native arbitrary-precision numbers and calendar/instant types avoid binary floating-point loss | Exact numeric/temporal wire semantics |
| Partial update | Presence-aware field map and merged validation | A presence-aware JSON object can distinguish omission from explicit null | Partial object, no PUT or JSON Patch |
| Queries | Real persistent Assets filter/sort/page tests | Typed predicates and ordered criteria can be translated by adapters | Small AND grammar and advertised operators |
| Authority | Existing bearer and operation/action policies | Existing security can resolve effective permissions without exposing rule names | Declared/authorized booleans; context separately checked |
| Actions | Scope, availability, typed parameters and conflict tests | Dispatch and availability adapters can preserve these stages without a workflow engine | Separate authorization, availability and execution |
| Forms | Ordered neutral layout tests | DTO arrays preserve layout without a component framework dependency | Optional toolkit-neutral presentation |
| Errors | Existing common envelope | Reuse the already shared envelope | Explicit status/codes, no exception inspection |

The model is reproducible without cloning framework internals. Its complexity is
bounded by scalar fields, MANY_TO_ONE references and synchronous actions. The
chosen page is separate because forcing the legacy collection model would change
proven wire behavior. Security/error precedence is explicitly scoped to these new
routes; existing API ordering remains unchanged. Tests and conformance are shared
across implementations, never selected by backend identity. The cost of Java
adoption remains a real implementation task; portability is assessed, not asserted
as completed conformance. No generic dynamic-form or temporal framework is promoted.

The accepted security tradeoff is explicit: authenticated callers may learn a
resource's existence/module availability before CRUD permission evaluation.
Metadata already permits authenticated discovery independently of CRUD rights.
Availability redacts unauthorized contextual reasons. Authorization-first behavior
would conceal more state but would change proven generic error precedence; this
work deliberately preserves it only for these new routes. No legacy API is relaxed.
