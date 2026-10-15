// Synthetic HTTP state for runner verification only; never backend infrastructure.
export const itemFamiliesPath = '/api/wms/item-families';
export const associationSegment = 'storage-attributes';
export const resources = Object.freeze({ family: 'wms_item_family', attribute: 'wms_storage_attribute', relation: 'wms_item_family_storage_attribute' });
export const codes = Object.freeze({
  invalid: 'invalid_request', unauthorized: 'unauthorized', forbidden: 'forbidden', disabled: 'module_disabled',
  familyMissing: 'wms_item_family_not_found', attributeMissing: 'wms_storage_attribute_not_found',
  relationMissing: 'wms_item_family_storage_attribute_not_found', missing: 'wms_item_family_storage_attributes_not_found',
  conflict: 'wms_item_family_storage_attribute_conflict', conflicts: 'wms_item_family_storage_attributes_conflict',
  exists: 'wms_item_family_storage_attribute_already_exists', unassociated: 'wms_item_family_storage_attribute_not_associated'
});
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const nilUuid = '00000000-0000-0000-0000-000000000000';
export const validId = value => typeof value === 'string' && uuidPattern.test(value) && value !== nilUuid;
export const envelope = value => value?.code && Object.keys(value).length === 1 ? { ...value, errors: [{ code: value.code }] } : value;

export function associationFixture({ families, attributes, actorFor, disabled, requests, fault, hasFault, defaultLimit, maximumLimit }) {
  const relations = new Map();
  return async (request, response, url) => {
    if (!url.pathname.startsWith(itemFamiliesPath + '/')) return false;
    const parts = url.pathname.slice(itemFamiliesPath.length + 1).split('/');
    const [familyId, segment, attributeId] = parts;
    const method = request.method;
    const actor = actorFor(request);
    let status;
    let result;
    let location;
    const fail = (httpStatus, code, errors = [{ code }]) => { status = httpStatus; result = { code, errors }; };
    const detail = (code, resource, resourceId, path) => ({ code, resource, resourceId, ...(path ? { path } : {}) });
    if (!actor?.enabled) fail(401, codes.unauthorized);
    else if (!actor.admin) fail(403, codes.forbidden);
    else if (disabled()) fail(503, codes.disabled);
    else {
      let raw = '';
      for await (const chunk of request) raw += chunk;
      let input;
      try { input = JSON.parse(raw); } catch { /* Structural stage below. */ }
      const object = input && typeof input === 'object' && !Array.isArray(input);
      const array = value => Array.isArray(value) && value.every(validId) && new Set(value).size === value.length;
      const query = url.searchParams;
      const decimal = text => text === null || /^-?\d+$/.test(text);
      const offsetText = query.get('offset');
      const limitText = query.get('limit');
      const offset = offsetText === null ? 0 : Number(offsetText);
      const limit = limitText === null ? defaultLimit : Number(limitText);
      const validQuery = [...query.keys()].every(key => ['offset', 'limit'].includes(key) && query.getAll(key).length === 1)
        && decimal(offsetText) && decimal(limitText) && Number.isInteger(offset) && offset >= 0
        && Number.isInteger(limit) && limit >= 1 && limit <= maximumLimit;
      const knownProperties = object && Object.keys(input);
      const duplicateProperty = raw.match(/"(?:storageAttributeId|storageAttributeIds|add|remove)"\s*:/g)?.length !== knownProperties?.length;
      const validBody = method === 'POST' ? object && knownProperties.join(',') === 'storageAttributeId' && validId(input.storageAttributeId)
        : method === 'PUT' ? object && knownProperties.join(',') === 'storageAttributeIds' && array(input.storageAttributeIds)
        : method === 'PATCH' ? object && knownProperties.every(key => ['add', 'remove'].includes(key))
          && knownProperties.every(key => array(input[key])) && (input.add?.length || input.remove?.length)
        : true;
      const valid = validId(familyId) && segment === associationSegment && parts.length === (method === 'DELETE' ? 3 : 2)
        && (method !== 'DELETE' || validId(attributeId)) && (method === 'GET' ? validQuery : !url.search)
        && validBody && (!['POST', 'PUT', 'PATCH'].includes(method) || !duplicateProperty);
      if (!valid) fail(400, codes.invalid);
      else {
        const family = families.find(value => value.id === familyId);
        const state = relations.get(familyId) ?? new Set();
        const refs = method === 'POST' ? [{ id: input.storageAttributeId, path: '/storageAttributeId' }]
          : method === 'PUT' ? input.storageAttributeIds.map((id, index) => ({ id, path: `/storageAttributeIds/${index}` }))
          : method === 'PATCH' ? ['add', 'remove'].flatMap(key => (input[key] ?? []).map((id, index) => ({ id, path: `/${key}/${index}`, operation: key })))
          : method === 'DELETE' ? [{ id: attributeId }] : [];
        const missing = [];
        if (!family) missing.push(detail(codes.familyMissing, resources.family, familyId));
        for (const ref of refs) if (!attributes.some(value => value.id === ref.id)) missing.push(detail(codes.attributeMissing, resources.attribute, ref.id, ref.path));
        if (missing.length) {
          fail(404, missing.length === 1 ? missing[0].code : codes.missing, missing);
          if (['PUT', 'PATCH'].includes(method) && hasFault(fault, `partial-${method.toLowerCase()}`)) state.clear();
        } else if (method === 'GET') {
          const ordered = attributes.filter(value => state.has(value.id)).sort((a, b) => a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
          status = 200; result = { items: ordered.slice(offset, offset + limit), offset, limit, total: ordered.length, order: [{ field: 'code', direction: 'asc' }] };
        } else if (method === 'POST') {
          if (state.has(input.storageAttributeId)) fail(409, codes.conflict, [detail(codes.exists, resources.attribute, input.storageAttributeId, '/storageAttributeId')]);
          else {
            state.add(input.storageAttributeId); status = 201;
            result = { itemFamilyId: familyId, storageAttribute: attributes.find(value => value.id === input.storageAttributeId) };
            location = `${itemFamiliesPath}/${familyId}/${associationSegment}/${input.storageAttributeId}`;
          }
        } else if (method === 'PUT') {
          relations.set(familyId, new Set(input.storageAttributeIds)); status = 204;
        } else if (method === 'PATCH') {
          const conflicts = refs.filter(ref => ref.operation === 'add' ? state.has(ref.id) : !state.has(ref.id))
            .map(ref => detail(ref.operation === 'add' ? codes.exists : codes.unassociated, resources.attribute, ref.id, ref.path));
          if (conflicts.length) {
            fail(409, codes.conflicts, conflicts);
            if (hasFault(fault, 'partial-patch')) state.clear();
            if (hasFault(fault, 'missing-conflict-detail')) result.errors.pop();
          } else {
            for (const ref of refs) if (ref.operation === 'add') state.add(ref.id); else state.delete(ref.id);
            status = 204;
          }
        } else if (method === 'DELETE') {
          if (!state.has(attributeId)) fail(404, codes.relationMissing, [detail(codes.relationMissing, resources.relation, attributeId)]);
          else { state.delete(attributeId); status = 204; }
        }
        if (method !== 'PUT') relations.set(familyId, state);
        if (result?.errors?.length > 1 && hasFault(fault, 'missing-resource-detail')) result.errors.pop();
      }
    }
    requests.push({ method, path: request.url, accept: request.headers.accept, expected: status });
    response.writeHead(status, { 'Cache-Control': 'no-store', ...(status !== 204 ? { 'Content-Type': 'application/json' } : {}),
      ...(status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}), ...(location ? { Location: location } : {}) });
    response.end(result ? JSON.stringify(result) : undefined);
    return true;
  };
}
