# ADR 0002: Contract source ownership boundaries

Status: accepted for unpublished v0.8.0 preparation.

## Decision

ERBAS has one public HTTP API, one erbas-contract semantic version, one canonical
OpenAPI entry point (`openapi/erbas.yaml`) and one shared Bruno collection.
Physical source ownership is separated into:

| Owner | Responsibility |
| --- | --- |
| Common | Reusable HTTP error, pagination and security primitives; neutral runner/transport infrastructure. |
| CORE | Non-disableable platform behavior: health, authentication, users and module administration. |
| Functional modules | Disableable capabilities, including all WMS business definitions. |

CORE and functional contracts depend on common primitives. Common never depends
on functional modules; CORE never depends on functional modules. The root
composition layer may enumerate and reference installed contract modules, but
owns no business definitions. `GET/PATCH /api/modules` is CORE administration,
not the contents of a functional module.

Each functional module owns its OpenAPI sources, Bruno requests, scope definitions,
synthetic state/handlers/faults, tests and normative documentation. Composition
combines the existing CORE security/module observations with installed functional
fixtures. Neutral server code owns only transport and lifecycle. The runner's
facade composes explicitly ordered scope paths without a plugin framework.

`moduleApiVersion` remains independent of the erbas-contract version. Source
modularization does not create independently versioned public APIs or versioned
HTTP route prefixes. The [public versioning policy](../common/api-conventions.md#public-api-versioning-policy)
continues to apply unchanged.

## Rationale and consequences

Explicit physical ownership prevents business definitions from leaking into
platform infrastructure and makes future module changes easier to review.
One composition preserves consumer entry points and shared conformance. Existing
public component names remain registered at the root through external references.
No generated second specification or separate module release identity is stored.

OpenAPI definitions, including their descriptive strings, are moved unchanged;
legacy plain-text document paths in those strings retain their original values
for exact resolved equivalence. The [documentation index](../README.md) provides
current normative document locations. Historical evidence remains global, with
relative links updated only for navigation.

A canonical, fully dereferenced Redocly comparison against the authorized base
proves public contract preservation. Permanent tests enforce source-reference
boundaries, fixture/test ownership, one root/collection, version 0.8.0 and the
unchanged 494-request / 2190-check conformance inventory.
