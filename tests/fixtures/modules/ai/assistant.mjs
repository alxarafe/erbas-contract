import { randomUUID } from 'node:crypto';
import { fixtureModuleApiVersion } from '../../common.mjs';

export const AI_ID = 'erbas.ai';
export const assistantPath = '/api/ai/assistant/invocations';
export const assistantPermission = 'ai.assistant.invoke';
export const assistantMessageMaximum = 4000;
export const assistantUnavailable = 'assistant_unavailable';
export const assistantExecutionFailed = 'assistant_execution_failed';
export const moduleDisabled = 'module_disabled';

export const directMessage = 'Reply with a short greeting.';
export const oneToolMessage = 'List the available units of measure.';
export const multipleToolsMessage = 'List the available units of measure, storage attributes and item families.';

const toolBudget = 8;
const toolPatterns = [
  { id: 'wms.uoms.list', pattern: /units? of measure/i },
  { id: 'wms.storage-attributes.list', pattern: /storage attributes?/i },
  { id: 'wms.item-families.list', pattern: /item families|item family/i }
];
const error = code => ({ code, errors: [{ code }] });
const scalarValues = value => [...value];
const validUnicodeScalars = value => scalarValues(value).every(character => {
  const codePoint = character.codePointAt(0);
  return codePoint !== 0 && (codePoint < 0xD800 || codePoint > 0xDFFF);
});

export function fixtureModule() {
  return { id: AI_ID, moduleApiVersion: fixtureModuleApiVersion, dependencies: [], enabled: true };
}

export function assistantFixture({ assistantFault } = {}, context, core) {
  const { requests, faultsReached, hasFault, serialize } = context;
  const handle = async (request, response, url) => {
    if (url.pathname !== assistantPath || request.method !== 'POST') return false;
    const actor = core.actorFor(request);
    const disabled = core.isModuleDisabled(AI_ID);
    let status;
    let body;
    let toolsUsed = [];
    const injection = name => hasFault(assistantFault, name);
    if (disabled && injection('gate-before-auth')) {
      status = 503; body = error(moduleDisabled);
    } else if (!actor?.enabled) {
      status = 401; body = error('unauthorized');
    } else if (!(actor.admin || actor.assistant || injection('ignored-permission'))) {
      status = 403; body = error('forbidden');
    } else if (disabled && !injection('ignored-gate')) {
      status = 503; body = error(moduleDisabled);
    } else if (injection('gate-before-validation')) {
      status = 503; body = error(moduleDisabled);
    } else {
      let raw = '';
      for await (const chunk of request) raw += chunk;
      let input;
      try { input = JSON.parse(raw); } catch { /* Invalid JSON follows authorization and gating. */ }
      const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
      const message = input?.message;
      const valid = object(input) && Object.keys(input).length === 1 && typeof message === 'string'
        && /\S/u.test(message) && validUnicodeScalars(message)
        && scalarValues(message).length <= assistantMessageMaximum;
      if (!valid) { status = 400; body = error('invalid_request'); }
      else if (injection('unavailable')) { status = 503; body = error(assistantUnavailable); }
      else if (injection('execution-failure')) { status = 500; body = error(assistantExecutionFailed); }
      else {
        const capabilities = core.capabilitiesFor(actor).filter(descriptor => descriptor.effect === 'read');
        const requested = new Set();
        for (const { id, pattern } of toolPatterns) if (pattern.test(message)) requested.add(id);
        for (const descriptor of capabilities) if (message.includes(descriptor.id)) requested.add(descriptor.id);
        const selected = [...requested].map(id => capabilities.find(descriptor => descriptor.id === id))
          .filter(Boolean).slice(0, toolBudget);
        let failed = false;
        if (injection('reevaluate-tool') && selected[0]) core.setModuleEnabled(selected[0].module, false);
        for (const descriptor of selected) {
          if (injection('tool-failure')) { failed = true; break; }
          const result = core.invokeCapability(actor, descriptor.id, {});
          if (result.status !== 200) { failed = true; break; }
          toolsUsed.push({ capabilityId: descriptor.id, invocationId: result.body.invocationId });
        }
        if (failed) { status = 500; body = error(assistantExecutionFailed); }
        else {
          status = 200;
          body = {
            invocationId: randomUUID(),
            answer: toolsUsed.length
              ? 'Capability results were collected for the answer.'
              : 'The assistant answered without using an ERBAS capability.',
            toolsUsed
          };
          if (injection('empty-id')) body.invocationId = '';
          if (injection('subject')) body.subject = 'internal-subject';
          if (injection('extra')) body.provider = 'synthetic-provider';
          if (injection('duplicate-id')) body.invocationId = toolsUsed[0]?.invocationId ?? body.invocationId;
          if (injection('tool-empty-id')) body.toolsUsed[0].invocationId = '';
          if (injection('tool-wrong-capability')) body.toolsUsed[0].capabilityId = 'example.wrong.list';
          if (injection('tool-input')) body.toolsUsed[0].input = {};
          if (injection('tool-write')) body.toolsUsed.push({ capabilityId: 'wms.uoms.create', invocationId: randomUUID() });
          if (injection('tool-unauthorized')) body.toolsUsed.push({ capabilityId: 'wms.uoms.list', invocationId: randomUUID() });
          if (injection('tool-order')) body.toolsUsed.reverse();
        }
      }
    }
    requests.push({ method: request.method, path: request.url, accept: request.headers.accept,
      expected: status, kind: 'assistant', toolsUsed });
    if (assistantFault) faultsReached.push(assistantFault);
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
      ...(status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}) });
    response.end(serialize(body));
    return true;
  };
  return handle;
}
