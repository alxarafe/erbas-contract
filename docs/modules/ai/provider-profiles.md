# Accepted AI provider profiles (ERBAS-CONTRACT-AIP-001)

Status: accepted MVP integration targets, not a new published HTTP release.
Official references reviewed on 2026-11-07. These are subsets of existing external
protocols that ERBAS consumes, not a protocol that providers must implement for
ERBAS. Compatibility is assessed for an endpoint/model/configuration combination;
a product name or a claim of API compatibility is not evidence of acceptance.

## Boundary with AI-001

[AI-001](ai-001.md) remains the public, provider-neutral assistant contract in
published v0.14.0: the request has only `message`; a successful response has only
`invocationId`, `answer` and `toolsUsed`. Provenance retains its two closed
capability/primitive variants and only successful CORE execution IDs. Provider
call IDs are conversation identifiers, never substitutes for those execution IDs.
No provider configuration, history or new administration endpoint is public.
OpenAPI, Bruno, consumer pins and immutable release tags are unchanged.

The protocol adapter handles HTTP, external message encoding and decoding.
ERBAS CORE owns current identity, effective READ discovery, permission/module
checks, input validation, execution and audit. Revalidate on every attempt.
Protocol compliance grants no authority: reject unregistered tools, WRITE,
provider built-in tools, arbitrary URLs, SQL, files and privilege changes.
Tool results are untrusted data, not instructions. Operational facts require
successful authorized reads; a fluent final answer alone proves no ERP access.

## A. OpenAI-compatible Chat Completions

References: [chat creation](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create),
[function calling](https://developers.openai.com/api/docs/guides/function-calling),
[authentication](https://developers.openai.com/api/reference/overview#authentication)
and [errors](https://developers.openai.com/api/docs/guides/error-codes).
This profile does not require compatibility with the complete OpenAI platform.

| Element | Required MVP subset |
| --- | --- |
| Transport | HTTP `POST` to the administratively configured chat-completions operation, conventionally `/v1/chat/completions`; JSON request and HTTP 200 JSON completion. Base-path prefixes may differ. |
| Request | Nonempty configured `model`, ordered `messages`; non-streaming (`stream: false` or documented equivalent default). |
| Messages | Text `system` and `user`; `assistant` with text and/or `tool_calls`; `tool` with text `content` and the matching `tool_call_id`. |
| Tools | `tools[]` entries with `type: "function"` and `function.name`, `description`, `parameters` (JSON Schema object). Names are adapter-owned mappings to effective READ IDs. |
| Tool response | `choices[0].message`, role `assistant`; each function call has a nonempty `id`, `type: "function"`, `function.name` and `function.arguments` containing a JSON-encoded object as a string. |
| Final response | A nonempty assistant text in `choices[0].message.content`, with absent or empty `tool_calls`; null content is acceptable on a tool-call turn. |

Preserve the assistant call message, original arguments and ID, then append its
correlated tool result before asking for the next completion. Results may contain
JSON serialized as text. Decode the arguments string once; preserve JSON types,
fields and numeric meaning. Schema violations still require CORE validation.

Optional controls include `tool_choice: "auto"`, `parallel_tool_calls: false`
and `n: 1`. If an adapter sends them, test that configuration explicitly;
support for parallel execution is not required. Metadata such as response ID,
usage and timestamps is optional for ERBAS consumption. Do not require strict
structured-output mode, optional schemas to become required fields, model
discovery, legacy `functions`/`function_call`, developer-role substitution,
multimodal content, reasoning features, streaming or another API family.
Models requiring those features are outside this text-only profile until reviewed.

## B. Ollama native chat

References: [chat](https://docs.ollama.com/api/chat),
[tool calling](https://docs.ollama.com/capabilities/tool-calling),
[message/call fields](https://github.com/ollama/ollama/blob/main/api/types.go),
[authentication](https://docs.ollama.com/api/authentication)
and [errors](https://docs.ollama.com/api/errors).
The native protocol is distinct from an OpenAI-compatible endpoint served by
the same software. Select the protocol explicitly, not by guessing from a brand.

| Element | Required MVP subset / difference |
| --- | --- |
| Transport | HTTP `POST /api/chat`, JSON, configured `model`, ordered `messages`, explicit `stream: false` (native streaming is the default). |
| Tools | Function definitions use `type`, `function.name`, `description` and JSON Schema `parameters`, as above. |
| Response | HTTP 200, `done: true`, `message.role: "assistant"`; text final `message.content` or `message.tool_calls[]`. No `choices` wrapper. |
| Arguments | `tool_calls[].function.arguments` is a JSON object, not the Chat Completions JSON string. No coercion of strings to numbers or omission of invalid fields. |
| Correlation | Preserve the assistant's tool calls, then append `role: "tool"`, serialized result `content` and `tool_name`. Preserve native `id`/`tool_call_id` when available. If absent, assign a request-local correlation ID and associate sequentially by position/name; never use a guessed CORE ID. |
| Metadata | `function.index`, `done_reason`, counts, timings and `thinking` are not business facts or required final-answer text. Optional metadata cannot replace a valid message. |

The minimum conversation is sequential; verify name/order fallback with the
target server version when it supplies no call IDs. A tool turn may have empty
content; a final turn needs nonempty text. An incomplete non-streaming response
is invalid. Preserve the native call shape rather than inserting the other
profile's encoded argument strings. Neither profile guarantees valid generated
arguments or truthful answers merely because the response is well formed.

## Common acceptance and safety criteria

An integration is accepted only after the following checks; they apply without
testing a commercial name or adding a provider-name branch:

1. Endpoint, protocol and model come from managed server configuration. A new
   endpoint satisfying a profile is a configuration candidate for that protocol
   adapter, not a reason to change this contract or create a brand adapter.
2. Authentication is configurable when required: at minimum explicit no-auth
   for a trusted local service and managed Bearer authentication where used.
   Native local Ollama does not require authentication; other deployment modes
   must be assessed rather than assumed equivalent. No credentials in fixtures.
3. Exchange text/system instructions and the original user message correctly;
   replay the complete ordered history of calls, arguments and results.
4. Present effective READ tools with usable JSON Schemas. Resolve local `$ref`
   references inside the adapter without modifying published descriptors.
   Schema keywords supported by the chosen endpoint/model must be checked.
5. Receive function calls and correlate each result unambiguously. Reject
   malformed, ambiguous or unsupported call sets; never silently drop calls.
6. Preserve arguments through serialization and CORE input validation. For
   example `{"limit":"50"}` is not `{"limit":50}`. Do not remove fields, clamp
   bounds or repair identifiers automatically.
7. Append successful outputs or safe recoverable input feedback to history.
   Error-feedback wording and orchestration are internal ERBAS policy, not a
   provider wire standard. Never retry authorization denial with more privilege.
8. Obtain a final text grounded in actual synthetic tool results and observe
   provenance separately through AI-001. Test missing evidence as well as success.
9. Distinguish HTTP failures, malformed completions, transport failures,
   cancellation and bounded timeout. A successful HTTP status is insufficient.
10. Repeat with a differently named synthetic model/endpoint using configuration
    only. This proves absence of brand dispatch in that adapter, not universal
    compatibility with every external service or model.

Configure finite positive request/connect deadlines, bounded response sizes and
a finite invocation/tool-attempt budget, including rejected attempts. Exact
defaults, maxima, recovery counts and scheduling are backend decisions; Java's
current timeout limits are not requirements imposed on external providers.
Provider-level retries are not required: if used, bound them and never replay
completed business operations. Treat authentication/configuration errors,
rate limits and unavailability distinctly internally; expose only AI-001's
existing safe responses. Non-200 HTTP, error bodies (including an `error` field
in an otherwise successful response), invalid JSON, missing required fields,
invalid argument encoding and truncated completions must not execute tools.
For reported `finish_reason: "length"` or native incomplete generation, do not
claim a complete final answer. Do not expose raw upstream error bodies.

Endpoints and secrets require administrative access control, validated allowed
destinations, TLS or explicitly trusted isolated local HTTP, redirect/proxy
controls and an approved data-egress policy. A loopback listener can still relay
to a remote model; endpoint location alone does not authorize remote data use.
Never accept URLs, credentials or models from generated text or AI-001 bodies.
Keep prompts, arguments, business payloads, responses and secrets out of ordinary
logs; use bounded audit metadata. Secret rotation/storage is implementation-owned.

## Verification and present implementation limits

The language-independent [exchange fixtures](../../../tests/fixtures/modules/ai/provider-exchanges.json)
contain synthetic messages, schemas and results for both wire formats. Their
outer scenario labels are test packaging, not an ERBAS provider API. Existing
Node tests and the local fixture server check text, READ call/result/final cycles,
invalid arguments, malformed responses, HTTP unavailability and transport loss.
They require no credentials, downloaded models or external inference in CI.
Run `./bin/check-scope ai`, then the authoritative `./bin/check` for repository
verification. Fixture self-consistency is not a test of Java/.NET adapters or a
certification of a real provider. Backend repositories should consume the examples
and retain real-provider evidence, including version/model, configuration,
operation, argument fidelity, permissions, outcome and limitations.

Java's current reference is native Ollama; .NET has a common Chat Completions
transport, an unauthenticated local Ollama configuration and an authenticated
configuration with additional provider-specific retry/error handling. Those
timeouts, retry codes, aliases, metrics and dispatch classes are antecedents,
not cross-stack requirements. In particular, current brand-based configuration
does not yet demonstrate configuration-only acceptance of arbitrary compatible
services. Backend adoption/gap tests remain separate work. Adding these targets
does not certify either implementation against every criterion.

Wire compatibility and model quality are separate: declared tool support,
synthetic exchange checks and successful real-model/business reads are distinct
evidence. Invalid generated arguments and model refusal to correct them remain
possible. Do not infer universal reliability from a single successful run.

## Current MVP / Future extensions

MVP: OpenAI-compatible Chat Completions, Ollama native, managed provider
configuration and READ tool calling. One adapter per accepted protocol suffices;
no new catalogue, plugin registry or agent framework is specified.

Possible future work, not implemented or required here: other external protocols,
model/capability discovery, tenant/user selection, provider fallback, streaming,
embeddings for RAG, and usage/cost metrics. Existing implementation experiments
do not make these extensions part of the common MVP. Full external-API coverage,
cloud authentication variants and mandatory numeric schema modes remain pending.
