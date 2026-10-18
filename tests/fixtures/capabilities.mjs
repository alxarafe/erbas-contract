import { randomUUID } from 'node:crypto';
import { defaultCollectionLimit, maximumCollectionLimit } from './common.mjs';

export const capabilitiesPath = '/api/core/capabilities';
export const invocationSuffix = '/invocations';
export const capabilityExecutionFailed = 'capability_execution_failed';
export const capabilityNotFound = 'capability_not_found';
// Independent fixture checks are compared with the normative OpenAPI by tests.
export const capabilityIdPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?![\s\S])/;

export function capabilityFixture({ capabilityDescriptors, capabilityFault, executeCapability, invocationFault }, context, core) {
  const { requests, faultsReached, hasFault, serialize } = context;
  return async (request, response, url) => {
    const path = url.pathname;
    if (path !== capabilitiesPath && !path.startsWith(capabilitiesPath + '/')) return false;
    const invocation = request.method === 'POST' && path.endsWith(invocationSuffix);
    const invocationId = invocation ? randomUUID() : undefined;
    const actor = core.actorFor(request);
    const detail = path !== capabilitiesPath;
    const id = detail ? decodeURIComponent(path.slice(capabilitiesPath.length + 1, invocation ? -invocationSuffix.length : undefined)) : undefined;
    const offsetText = url.searchParams.get('offset');
    const limitText = url.searchParams.get('limit');
    const offset = offsetText === null ? 0 : Number(offsetText);
    const limit = limitText === null ? defaultCollectionLimit : Number(limitText);
    const validInteger = value => value === null || /^-?\d+(?![\s\S])/.test(value);
    const validQuery = detail ? !url.search : [...url.searchParams.keys()].every(key =>
      ['offset', 'limit'].includes(key) && url.searchParams.getAll(key).length === 1)
      && validInteger(offsetText) && validInteger(limitText)
      && Number.isSafeInteger(offset) && offset >= 0 && Number.isSafeInteger(limit)
      && limit >= 1 && limit <= maximumCollectionLimit;
    let status;
    let body;
    if (!actor?.enabled) { status = 401; body = { code: 'unauthorized' }; }
    else if (!validQuery || detail && !capabilityIdPattern.test(id)) {
      status = 400; body = { code: 'invalid_request' };
    } else {
      const effective = capabilityDescriptors.filter(descriptor =>
        (core.moduleAvailable(descriptor.module) || hasFault(capabilityFault, 'ignored-module'))
        && (actor.admin || descriptor.requiredPermissions.length === 0 || hasFault(capabilityFault, 'disclosure')));
      const target = effective.find(descriptor => descriptor.id === id);
      status = detail && !target ? 404 : 200;
      body = status === 404 ? { code: capabilityNotFound }
        : structuredClone(detail ? target : core.collection(effective, offset, limit));
      if (invocation && target) {
        let raw = '';
        for await (const chunk of request) raw += chunk;
        let input;
        try { input = JSON.parse(raw); } catch { /* Invalid JSON after effective lookup. */ }
        const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
        const valid = object(input) && Object.keys(input).length === 1 && object(input.input)
          && Object.keys(input.input).every(key => ['offset', 'limit'].includes(key))
          && (input.input.offset === undefined || Number.isInteger(input.input.offset) && input.input.offset >= 0)
          && (input.input.limit === undefined || Number.isInteger(input.input.limit)
            && input.input.limit >= 1 && input.input.limit <= maximumCollectionLimit);
        if (!valid) { status = 400; body = { code: 'invalid_request' }; }
        else {
          try {
            const output = executeCapability(target, input.input);
            // Null/non-object output is already known to violate the generic envelope.
            if (!object(output)) throw new Error('Synthetic non-contractual provider output');
            body = { invocationId, capabilityId: id, output };
          } catch {
            status = 500; body = { code: capabilityExecutionFailed };
          }
          if (hasFault(invocationFault, 'wrong-id')) body.capabilityId = 'example.wrong.list';
          if (hasFault(invocationFault, 'empty-id')) body.invocationId = '';
          if (hasFault(invocationFault, 'extra')) body.subject = 'internal-subject';
          if (hasFault(invocationFault, 'output')) body.output.items = [{ secret: 'invalid' }];
          if (hasFault(invocationFault, 'pagination')) body.output.offset++;
        }
      }
      const first = !invocation && detail ? status === 200 && body : body.items?.[0];
      if (first && hasFault(capabilityFault, 'extra')) first.requiredRole = 'fixture-role';
      if (first && hasFault(capabilityFault, 'id')) first.id = 'invalid';
      if (first && hasFault(capabilityFault, 'schema')) first.inputSchema = { type: 'invented' };
      if (first && hasFault(capabilityFault, 'version')) first.version = 'latest';
      if (body.items?.length && hasFault(capabilityFault, 'duplicates')) {
        body.items.push(structuredClone(body.items[0])); body.total++;
      }
      if (body.items?.length && hasFault(capabilityFault, 'cross-page-duplicate')) body.items[0] = structuredClone(effective[0]);
    }
    requests.push({ method: request.method, path: request.url, accept: request.headers.accept, expected: status,
      ...(invocation ? { invocationId } : {}) });
    const faultBody = capabilityFault === 'malformed-json' ? '{' : undefined;
    if (faultBody) faultsReached.push(capabilityFault);
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
      ...(status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}) });
    response.end(faultBody ?? serialize(body));
    return true;
  };
}
