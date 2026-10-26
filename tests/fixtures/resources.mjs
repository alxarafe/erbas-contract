import { randomUUID } from 'node:crypto';

// Synthetic protocol fixture tests the sole runner, never backend persistence.
export const resourceProbe = 'fixture.resource-probe';
const root = '/api/resources/';
const metadataRoot = '/api/meta/resources';
const actionsRoot = '/api/resource-actions/';
const operationNames = ['list', 'get', 'create', 'update', 'delete'];
const equality = ['eq', 'ne'];
const textOperators = [...equality, 'lt', 'lte', 'gt', 'gte', 'contains', 'startsWith'];

function metadata(authorized) {
  const field = (name, type, extra = {}) => ({ name, type, nullable: false, required: false,
    readOnly: false, immutable: false, constraints: {}, enumValues: [], annotations: [],
    capabilities: { filterable: false, sortable: false, searchable: false, filterOperators: [] }, ...extra });
  const text = { filterable: true, sortable: true, searchable: false, filterOperators: textOperators };
  return { id: resourceProbe, version: '1.0.0', moduleId: 'erbas.dev.math', definitionHash: 'opaque-fixture-hash',
    idDefinition: { field: 'id' }, moduleEnabled: true,
    operations: Object.fromEntries(operationNames.map(name => [name, { declared: true, authorized }])),
    fields: [field('id', 'UUID', { readOnly: true, immutable: true }),
      field('code', 'STRING', { required: true, immutable: true, capabilities: text }),
      field('name', 'STRING', { required: true, capabilities: text }),
      field('active', 'BOOLEAN', { default: true, capabilities: { filterable: true, sortable: false, searchable: false, filterOperators: equality } }),
      field('optional', 'STRING', { nullable: true })],
    relations: [], annotations: [{ vocabulary: 'Common', term: 'Label', value: 'Protocol fixture' }],
    actions: [{ name: 'submit', scope: 'ENTITY', requiresSelection: false, authorized, annotations: [], parameters: [] }] };
}

export function resourceFixture({ resourceFault } = {}, context, { actorFor }) {
  const rows = new Map();
  return async (request, response, url) => {
    if (!url.pathname.startsWith(root) && !url.pathname.startsWith(metadataRoot) && !url.pathname.startsWith(actionsRoot)) return false;
    const actor = actorFor(request);
    let status = 200, result;
    const failure = (code, value) => { status = code; result = { code: value }; };
    const meta = metadata(Boolean(actor?.admin));
    let body = '';
    for await (const chunk of request) body += chunk;
    let input;
    try { input = body ? JSON.parse(body) : {}; } catch { failure(400, 'invalid_request'); }
    if (!actor?.enabled) failure(401, 'unauthorized');
    else if (status === 400) { /* malformed transport precedes domain execution */ }
    else if (url.pathname === metadataRoot) {
      const { id, version, moduleId, definitionHash, operations } = meta;
      result = [{ id, version, moduleId, definitionHash, operations, metadataPath: `${metadataRoot}/${id}` }];
    } else if (url.pathname === `${metadataRoot}/${resourceProbe}`) {
      result = meta;
      if (context.hasFault(resourceFault, 'operators')) result.fields[0].capabilities.filterOperators = ['contains'];
    } else if (url.pathname.startsWith(actionsRoot)) {
      if (url.pathname.endsWith('/availability')) result = [];
      else if (!url.pathname.endsWith('/submit/execute')) failure(404, 'resource_action_not_found');
      else if (Object.keys(input.parameters ?? {}).length) failure(400, 'invalid_request');
      else if (!actor.admin) failure(403, 'forbidden');
      else { status = 204; result = undefined; }
    } else if (!url.pathname.startsWith(root + resourceProbe)) failure(404, 'resource_not_found');
    else if (!actor.admin) failure(403, 'forbidden');
    else {
      const id = url.pathname.slice((root + resourceProbe).length + 1);
      if (request.method === 'POST') {
        const row = { id: randomUUID(), code: input.code, name: input.name, active: input.active ?? true, optional: input.optional ?? null };
        rows.set(row.id, row); result = row; status = 201; response.setHeader('Location', root + resourceProbe + '/' + row.id);
      } else if (id && !rows.has(id)) failure(404, 'resource_not_found');
      else if (request.method === 'PATCH') {
        if (Object.hasOwn(input, 'code')) failure(context.hasFault(resourceFault, 'conflict') ? 400 : 409, 'resource_conflict');
        else if (Object.keys(input).some(key => !['name', 'active', 'optional'].includes(key))) failure(400, 'invalid_request');
        else { result = { ...rows.get(id), ...input }; rows.set(id, result); }
      } else if (request.method === 'DELETE') { rows.delete(id); status = 204; }
      else if (id) result = rows.get(id);
      else if (url.searchParams.has('sort') && url.searchParams.get('sort') === '__unknown') failure(400, 'invalid_request');
      else {
        let matches = [...rows.values()];
        for (const value of url.searchParams.getAll('filter')) { const filter = JSON.parse(value); matches = matches.filter(row => row[filter.field] === filter.value); }
        const offset = Number(url.searchParams.get('offset') ?? 0), limit = Number(url.searchParams.get('limit') ?? 50);
        result = { items: matches.slice(offset, offset + limit), offset, limit, total: matches.length };
        if (context.hasFault(resourceFault, 'total')) result.total++;
      }
    }
    context.requests.push({ method: request.method, path: request.url, expected: status });
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}) });
    response.end(status === 204 ? undefined : context.serialize(result));
    return true;
  };
}
