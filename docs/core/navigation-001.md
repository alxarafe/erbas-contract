# NAVIGATION-CONTRACT-001: effective application navigation

This extends the local unpublished v0.13.0 candidate alongside, but logically
separate from, the [Generic Resource Runtime protocol](resources-001.md).
Existing published definitions and backend pins remain unchanged. Navigation is
curated presentation/discovery, never authorization or a resource schema.

## Request and effective representation

GET /api/meta/navigation is one authenticated request for the whole application.
It accepts standard Accept-Language and If-None-Match headers, no query parameters.
Authentication is checked before projection or cache validation. The server
resolves the authoritative current context, installed/enabled modules and effective
permissions, then returns an ordered tree:

```json
{
  "version": "opaque-context-bound-version",
  "items": [{
    "id": "example.application",
    "label": "Application",
    "order": 10,
    "children": [{
      "id": "example.register",
      "label": "Register",
      "order": 10,
      "target": {"type": "RESOURCE", "resource": "example.register"},
      "children": []
    }]
  }]
}
```

IDs are stable, opaque and globally unique. Siblings are ordered by declared order
ascending then ordinal ID ascending; clients preserve response order. Containers
omit target and have nonempty effective children. Actionable nodes are leaves
with empty children. Empty containers are removed recursively. An empty items array
is valid 200. No enabled/visible/authorized flags or permission policy names are
sent: the server already filtered the result for this user/context.

Labels are final display text under existing Accept-Language negotiation, not
localization keys or HTML. Each implementation uses its existing localization
conventions and documented fallback; no new translation framework is prescribed.
Optional icon is an opaque client-understood identifier, never a mandated icon
library, image URL or executable decoration.

## Targets and resource integration

RESOURCE contains exactly type/resource. Resource identifies a valid discoverable
list-capable resource. The client resolves its existing metadata for fields,
capabilities, filters, actions and forms. A resource can exist without a navigation
entry; navigation never enumerates or copies all resource schemas automatically.

ROUTE contains exactly type/route. Route is an application-local absolute path,
without external/protocol-relative URL, traversal, query or fragment. Its router
owns interpretation; navigation creates no application page. Current paths use
ASCII alphanumeric/underscore/hyphen segments with optional trailing slash.
ROUTE can represent an installed custom page/configuration/process, independently
of CRUD. No dashboard, report or process engine is introduced.

The discriminator is explicit. Future meaningful target variants can extend the
union through deliberate contract evolution, without replacing the envelope or
hierarchy. Clients must not execute an unsupported target descriptor; ignore that
entry and prune newly empty client containers when handling a newer protocol.
ACTION/REPORT/DASHBOARD/PROCESS are not contracted target kinds in this candidate.

## Effective authorization and context

Unavailable module contributions and inaccessible actionable targets are omitted.
RESOURCE visibility includes its list authorization and context, with optional
stricter presentation requirements. ROUTE visibility must use effective existing
authorization/context requirements. Group requirements may hide a whole subtree.
No new permission namespace or client-side permission evaluator is prescribed.

Navigation may combine platform and tenant-scoped entries. Ordinary unavailable,
inactive or ambiguous tenant context omits entries requiring it while preserving
eligible platform navigation. No accessible entries is still successful 200.
Context configuration failures use the existing generic unavailable/error
semantics. There is no new tenant-selection API/header in this contract.

Navigation does not grant authority. An old item may remain visible until the next
validation, but every target endpoint rechecks its own authorization and state.
Resource/action precedence and legacy Users/Modules/WMS conventions are unchanged.
Navigation performs authentication, rejects unsupported query input, resolves
current identity/context, filters declarations by module/authorization, localizes
and orders the effective tree, then evaluates HTTP conditional caching.

## Conditional caching and client loading

200 returns version/items, ETag, private/no-cache and Vary including Authorization
and Accept-Language. Version is opaque and equals the ETag without quotes. It is
not a release number or a Resource record version. Effective user/context and
language participate in identity: another user/context must not receive 304 for
an old context's version even when item lists happen to look alike.

The server recomputes effectiveness before checking If-None-Match. A matching tag
returns 304 without body, retaining cache metadata. Role/permission, module,
declaration or presentation changes that affect the result change the version.
Changes that do not affect effective navigation need not change it. Relevant
future context-selection headers must also participate in cache variation.
Private caching is required; no shared/public menu cache is allowed.

Clients establish authenticated context, fetch once, retain body/version in memory
and revalidate when needed. Logout/context switch clears both body and ETag.
There is no requirement to poll on route changes. No snapshot consistency across
concurrent authorization changes is promised. Future server-push invalidation
could name this version, but no event, SignalR or SSE protocol is introduced.
The canonical menu always remains retrievable through this GET.

## Errors, portability and verification

The existing ErrorResponse is reused. Unauthenticated requests keep existing 401
and Bearer challenge semantics, regardless of If-None-Match. Unsupported queries
are 400; required context configuration failure is 503; unexpected resolution
failure is 500 without internal details. Errors use no-store. There is no
navigation-specific error envelope or requirement for one request per module.

The model is portable: .NET contributes declarations through existing module
composition and authorization; Java can collect equivalent module-owned DTOs,
project through its existing authority/localization and implement the same HTTP
cache semantics. No framework registration, permission policy name or storage
mechanism is contractual. Java/client adoption is not claimed. A tree was chosen
to give clients a ready-to-render hierarchy; internal parent-ID declarations are
not a public registry or an administration API.

The sole conformance collection covers authenticated/anonymous loading, recursive
shape/order, valid resource references, stable ETags, identity separation, 304 and
logout. Synthetic failures prove rejection of empty groups, leaked schemas and
cross-user cache reuse. Backend tests cover startup validation, permissions,
module filtering, context changes, localization and endpoint authority. Existing
published conformance and the expanded candidate are validated separately.

Generic client readiness now includes authentication/context bootstrap, one menu
fetch, hierarchical rendering, RESOURCE → metadata → static CRUD pages, ROUTE
handoff, action dialogs/execution and common errors. Unknown custom routes still
require an installed application page. Dynamic Assets composition, workflows,
bulk UI, joins/expansions, server-push and stale-write UI remain outside v0.13.0.
