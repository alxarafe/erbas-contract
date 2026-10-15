import { associationFixture, itemFamiliesPath, envelope } from './wms-003.mjs';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

export const fixtureEnv = { ...process.env, ERBAS_TEST_EMAIL: 'fixture@example.test', ERBAS_TEST_PASSWORD: 'synthetic-"-\\-password' };

export const MATH_ID = 'erbas.dev.math';
export const STATISTICS_ID = 'erbas.dev.statistics';
export const WMS_ID = 'erbas.wms';
export const storageAttributesPath = '/api/wms/storage-attributes';
export const storageAttributeCodePattern = /^[A-Z][A-Z0-9_]{0,29}$/;
export const storageAttributeCodeConflict = 'wms_storage_attribute_code_conflict';
export const uomsPath = '/api/wms/uoms';
export const uomCodePattern = /^[A-Z][A-Z0-9]{0,9}$/;
export const wmsLabelMaximum = 255;
const wmsLabelTrimPattern = /^[ \t\r\n]+|[ \t\r\n]+$/g;
export const uomCodeConflict = 'wms_uom_code_conflict';
export const moduleDisabled = 'module_disabled';

export const disabledTokenFault = 'acceptDisabledTokens';

export const modulesPath = '/api/modules';
export const moduleNotFound = 'module_not_found';
export const moduleDependencyConflict = 'module_dependency_conflict';
const fixtureModuleApiVersion = 1;
const defaultCollectionLimit = 50;
export const maximumCollectionLimit = 100;

export function fixtureModules() {
  return [
    { id: STATISTICS_ID, moduleApiVersion: fixtureModuleApiVersion, dependencies: [MATH_ID], enabled: true },
    { id: MATH_ID, moduleApiVersion: fixtureModuleApiVersion, dependencies: [], enabled: true },
    { id: WMS_ID, moduleApiVersion: fixtureModuleApiVersion, dependencies: [], enabled: true }
  ];
}

// The fixture owns its comparison; consumers only observe stable opaque IDs.
export function userCollection(users, offset = 0, limit = defaultCollectionLimit) {
  const ordered = [...users].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return { items: ordered.slice(offset, offset + limit), offset, limit, total: ordered.length,
    order: [{ field: 'id', direction: 'asc' }] };
}

export async function startFixture({ status = 200, contentType = 'application/json', body = '{"status":"ok"}', redirect = false, hang = false, auth = {}, users = {}, acceptDisabledTokens = false, collectionFault, modules = {}, moduleFault, wmsFault, storageAttributeFault, itemFamilyFault, associationFault, errorFault, availableModules = fixtureModules() } = {}) {
  const requests = [];
  const faultsReached = [];
  // Record fault application, never secrets or response bodies. A reduced bootstrap
  // must reach the configured defect rather than fail on unrelated missing state.
  const hasFault = (configured, name) => {
    if (configured !== name) return false;
    faultsReached.push(name);
    return true;
  };
  const accounts = new Map([['synthetic-admin', { id: 'synthetic-admin', email: fixtureEnv.ERBAS_TEST_EMAIL,
    enabled: true, admin: true, password: fixtureEnv.ERBAS_TEST_PASSWORD }]]);
  const tokens = new Map([['synthetic.token_123', 'synthetic-admin']]);
  const registry = new Map(availableModules.map(module => [module.id, structuredClone(module)]));
  const uoms = [];
  const storageAttributes = [];
  const itemFamilies = [];
  const associations = associationFixture({ families: itemFamilies, attributes: storageAttributes,
    actorFor: request => accounts.get(tokens.get((request.headers.authorization ?? '').replace(/^Bearer /, ''))),
    disabled: () => registry.get(WMS_ID)?.enabled === false, requests, fault: associationFault, hasFault, defaultLimit: defaultCollectionLimit, maximumLimit: maximumCollectionLimit });
  const serialize = value => {
    const result = envelope(value);
    if (result?.errors && errorFault) {
      hasFault(errorFault, errorFault);
      if (errorFault === 'missing-errors') delete result.errors;
      if (errorFault === 'empty-errors') result.errors = [];
      if (errorFault === 'malformed-detail') result.errors = [{ resourceId: 'fixture' }];
    }
    return JSON.stringify(result);
  };
  const publicUser = ({ id, email, enabled, admin }) => ({ id, email, enabled, admin });
  let nextId = 1;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://fixture.test');
    const path = url.pathname;
    if (await associations(request, response, url)) return;
    if (path === uomsPath || path === storageAttributesPath || path === itemFamiliesPath) {
      const isFamily = path === itemFamiliesPath;
      const isStorageAttribute = path === storageAttributesPath || isFamily;
      const catalogue = isFamily ? itemFamilies : isStorageAttribute ? storageAttributes : uoms;
      const labelField = isStorageAttribute ? 'name' : 'description';
      const codePattern = isStorageAttribute ? storageAttributeCodePattern : uomCodePattern;
      const codeConflict = isFamily ? 'wms_item_family_code_conflict' : isStorageAttribute ? storageAttributeCodeConflict : uomCodeConflict;
      const fault = isFamily ? itemFamilyFault : isStorageAttribute ? storageAttributeFault : wmsFault;
      const actor = accounts.get(tokens.get((request.headers.authorization ?? '').replace(/^Bearer /, '')));
      const disabled = registry.get(WMS_ID)?.enabled === false;
      let expected;
      let result;
      if (disabled && !actor?.enabled && hasFault(fault, 'gate-before-auth')) {
        expected = 503; result = { code: moduleDisabled };
      } else if (!actor?.enabled) { expected = 401; result = { code: 'unauthorized' }; }
      else if (!actor.admin) { expected = 403; result = { code: 'forbidden' }; }
      else if (disabled && !hasFault(fault, 'ignored-gate')) {
        expected = 503; result = { code: moduleDisabled };
      } else if (request.method === 'POST') {
        let raw = '';
        for await (const chunk of request) raw += chunk;
        let input;
        try { input = JSON.parse(raw); } catch { /* Invalid JSON follows authorization and gating. */ }
        const description = typeof input?.[labelField] === 'string'
          ? input[labelField].replace(wmsLabelTrimPattern, '') : undefined;
        const unicodeFault = typeof description === 'string'
          && description.length !== [...description].length && hasFault(fault, 'unicode-length');
        const length = typeof description === 'string'
          ? hasFault(fault, 'length-before-trim') ? [...input[labelField]].length
            : unicodeFault ? description.length : [...description].length : 0;
        if (typeof input?.code === 'string' && /[a-z]/.test(input.code) && hasFault(fault, 'normalized-code')) input.code = input.code.toUpperCase();
        const valid = input && !Array.isArray(input)
          && (Object.keys(input).sort().join(',') === ['code', labelField].sort().join(',') || (input.extra === true && hasFault(fault, 'accepted-extra')))
          && (raw.match(new RegExp('"(?:code|' + labelField + ')"\\s*:', 'g')) ?? []).length === 2
          && typeof input.code === 'string' && codePattern.test(input.code)
          && !/[\r\n]/.test(input.code)
          && typeof input[labelField] === 'string' && length > 0 && length <= wmsLabelMaximum
          && /[^ \t\r\n]/.test(input[labelField]) && !/[\u0000\uD800-\uDFFF]/u.test(input[labelField])
          && !url.search;
        if (!valid) { expected = 400; result = { code: 'invalid_request' }; }
        else if (catalogue.some(uom => uom.code === input.code) && !hasFault(fault, 'accepted-duplicate')) {
          expected = 409; result = { code: codeConflict };
        } else {
          result = { id: randomUUID(), code: input.code,
            [labelField]: hasFault(fault, 'untrimmed-description') ? input[labelField] : description };
          catalogue.push(structuredClone(result));
          if (fault === 'untrimmed-persistence') catalogue.at(-1)[labelField] = input[labelField];
          expected = 201;
          if (hasFault(fault, 'extra')) result.extra = true;
        }
      } else {
        const query = url.searchParams;
        const offsetText = query.get('offset');
        const limitText = query.get('limit');
        const offset = offsetText === null ? 0 : Number(offsetText);
        const limit = limitText === null ? defaultCollectionLimit : Number(limitText);
        const integer = text => text === null || /^-?\d+$/.test(text);
        const valid = [...query.keys()].every(key => ['offset', 'limit'].includes(key) && query.getAll(key).length === 1)
          && integer(offsetText) && integer(limitText) && Number.isInteger(offset) && offset >= 0
          && Number.isInteger(limit) && limit >= 1 && limit <= maximumCollectionLimit;
        if (!valid) { expected = 400; result = { code: 'invalid_request' }; }
        else {
          const ordered = [...catalogue].sort((a, b) => a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
          if (ordered.some(uom => uom[labelField] !== uom[labelField].replace(wmsLabelTrimPattern, ''))) {
            hasFault(fault, 'untrimmed-persistence');
          }
          if (ordered.length > 0 && hasFault(fault, 'lost-state')) ordered.length = 0;
          if (ordered.length > 1 && hasFault(fault, 'order')) ordered.reverse();
          expected = 200;
          result = { items: ordered.slice(offset, offset + limit), offset, limit, total: ordered.length,
            order: [{ field: 'code', direction: 'asc' }] };
          if (hasFault(fault, 'pagination')) result.offset++;
        }
      }
      requests.push({ method: request.method, path: request.url, accept: request.headers.accept, expected });
      response.writeHead(expected, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
        ...(expected === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}) });
      response.end(serialize(result));
      return;
    }
    if (path === modulesPath || path.startsWith(`${modulesPath}/`)) {
      const operation = request.method === 'PATCH' ? 'patch' : 'list';
      const actor = accounts.get(tokens.get((request.headers.authorization ?? '').replace(/^Bearer /, '')));
      let expected;
      let result;
      if (!actor?.enabled) { expected = 401; result = { code: 'unauthorized' }; }
      else if (!actor.admin) { expected = 403; result = { code: 'forbidden' }; }
      else if (operation === 'list') {
        const offsetText = url.searchParams.get('offset');
        const limitText = url.searchParams.get('limit');
        const offset = offsetText === null ? 0 : Number(offsetText);
        const limit = limitText === null ? defaultCollectionLimit : Number(limitText);
        const integer = text => text === null || /^-?\d+$/.test(text);
        if (!integer(offsetText) || !integer(limitText) || !Number.isInteger(offset) || offset < 0
            || !Number.isInteger(limit) || limit < 1 || limit > maximumCollectionLimit) {
          expected = 400; result = { code: 'invalid_request' };
        } else {
          const listed = [...registry.values()].filter(module =>
            !(module.id === MATH_ID && hasFault(moduleFault, 'math-absent'))
            && !(module.id === STATISTICS_ID && hasFault(moduleFault, 'statistics-absent')));
          expected = 200; result = userCollection(listed, offset, limit);
          // Mutations are synthetic runner faults, never alternative backend behavior.
          result = structuredClone(result);
          const first = result.items[0];
          const statistics = result.items.find(module => module.id === STATISTICS_ID);
          if (statistics && hasFault(moduleFault, 'statistics-no-math')) statistics.dependencies = [];
          if (statistics && hasFault(moduleFault, 'statistics-wrong-dependency')) statistics.dependencies = ['wrong-fixture'];
          if (first && hasFault(moduleFault, 'extra')) first.extra = true;
          if (first && hasFault(moduleFault, 'missing')) delete first.enabled;
          if (first && hasFault(moduleFault, 'api-version')) first.moduleApiVersion = 0;
          if (first && hasFault(moduleFault, 'dependencies')) first.dependencies = null;
          if (first && hasFault(moduleFault, 'enabled')) first.enabled = 'true';
          if (hasFault(moduleFault, 'order')) result.items.reverse();
          if (hasFault(moduleFault, 'pagination')) result.limit++;
        }
      } else {
        let raw = '';
        for await (const chunk of request) raw += chunk;
        let input;
        try { input = JSON.parse(raw); } catch { /* Invalid JSON is 400 after authorization. */ }
        const valid = input && typeof input === 'object' && !Array.isArray(input)
          && Object.keys(input).length === 1 && typeof input.enabled === 'boolean';
        const id = decodeURIComponent(path.slice(modulesPath.length + 1));
        const target = registry.get(id);
        if (!valid) { expected = 400; result = { code: 'invalid_request' }; }
        else if (!target) { expected = 404; result = { code: moduleNotFound }; }
        else {
          const conflict = input.enabled
            ? target.dependencies.some(dependency => !registry.get(dependency).enabled)
            : [...registry.values()].some(module => module.enabled && module.dependencies.includes(id));
          if (conflict && !hasFault(moduleFault, 'accepted-conflict')
              && !(input.enabled && hasFault(moduleFault, 'accepted-enable-conflict'))) {
            expected = 409; result = { code: moduleDependencyConflict };
            if (!input.enabled && hasFault(moduleFault, 'partial-disable-conflict')
                || input.enabled && hasFault(moduleFault, 'partial-enable-conflict')) {
              target.enabled = input.enabled;
            }
          } else {
            target.enabled = input.enabled;
            expected = 200; result = structuredClone(target);
            if (hasFault(moduleFault, 'stale-state')) result.enabled = !input.enabled;
          }
        }
      }
      requests.push({ method: request.method, path: request.url, accept: request.headers.accept, expected });
      const override = modules[`${operation}:${expected}`] ?? {};
      if (modules[`${operation}:${expected}`]) faultsReached.push(`${operation}:${expected}`);
      response.writeHead(override.status ?? expected, {
        'Content-Type': override.contentType ?? 'application/json', 'Cache-Control': 'no-store',
        ...(expected === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}), ...override.headers
      });
      response.end(override.body ?? serialize(result));
      return;
    }
    if (request.url === '/api/auth/login') {
      let raw = '';
      for await (const chunk of request) raw += chunk;
      let input;
      try { input = JSON.parse(raw); } catch { /* Malformed JSON is contractual 400. */ }
      const valid = input && !Array.isArray(input) && typeof input === 'object'
        && Object.keys(input).length === 2 && typeof input.email === 'string' && input.email.length > 0
        && typeof input.password === 'string' && input.password.length > 0;
      const account = valid && [...accounts.values()].find(user => user.email === input.email
        && user.password === input.password && user.enabled);
      const correct = Boolean(account);
      const token = correct && (account.id === 'synthetic-admin' ? 'synthetic.token_123' : `synthetic.user_${account.id}`);
      if (correct) tokens.set(token, account.id);
      const expected = !valid ? 400 : correct ? 200 : 401;
      // Record shapes and outcomes only, never the actual credentials.
      requests.push({ method: request.method, path: request.url, accept: request.headers.accept,
        contentType: request.headers['content-type'], expected, malformed: input === undefined });
      const override = auth[expected] ?? {};
      if (auth[expected]) faultsReached.push(String(expected));
      if (override.hang) return;
      response.writeHead(override.status ?? expected, {
        'Content-Type': override.contentType ?? 'application/json',
        ...(expected === 200 ? { 'Cache-Control': 'no-store' } : {}),
        ...(expected === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}),
        ...override.headers
      });
      response.end(override.body ?? serialize(expected === 200 ? { accessToken: token }
        : { code: expected === 400 ? 'invalid_request' : 'invalid_credentials' }));
      return;
    }
    if (path === '/api/auth/me' || path === '/api/users' || path.startsWith('/api/users/')) {
      const isMe = path === '/api/auth/me';
      const operation = isMe ? 'me' : request.method === 'POST' ? 'create'
        : request.method === 'PATCH' ? 'patch' : path === '/api/users' ? 'list' : 'get';
      const actor = accounts.get(tokens.get((request.headers.authorization ?? '').replace(/^Bearer /, '')));
      let expected;
      let result;
      let raw = '';
      for await (const chunk of request) raw += chunk;
      let input;
      try { input = JSON.parse(raw); } catch { /* Invalid JSON handled below. */ }
      const object = input && typeof input === 'object' && !Array.isArray(input);
      const id = path.startsWith('/api/users/') ? decodeURIComponent(path.slice('/api/users/'.length)) : null;
      const target = accounts.get(id);
      if (!actor || (!actor.enabled && !acceptDisabledTokens)) {
        expected = 401; result = { code: 'unauthorized' };
      } else if (!isMe && !actor.admin) {
        expected = 403; result = { code: 'forbidden' };
      } else if (isMe) {
        expected = 200; result = publicUser(actor);
      } else if (operation === 'create') {
        const valid = object && Object.keys(input).sort().join(',') === 'admin,email,password'
          && typeof input.email === 'string' && input.email.length > 0
          && typeof input.password === 'string' && [...input.password].length >= 12 && [...input.password].length <= 256
          && typeof input.admin === 'boolean';
        if (!valid) { expected = 400; result = { code: 'invalid_request' }; }
        else if ([...accounts.values()].some(user => user.email === input.email)) {
          expected = 409; result = { code: 'email_conflict' };
        } else {
          const user = { ...input, id: `opaque-${nextId++}`, enabled: true };
          accounts.set(user.id, user);
          expected = 201; result = publicUser(user);
        }
      } else if (operation === 'patch') {
        const valid = object && Object.keys(input).length > 0
          && Object.entries(input).every(([key, value]) => ['enabled', 'admin'].includes(key) && typeof value === 'boolean');
        if (!valid) { expected = 400; result = { code: 'invalid_request' }; }
        else if (!target) { expected = 404; result = { code: 'user_not_found' }; }
        else {
          const updated = { ...target, ...input };
          if (![...accounts.values()].some(user => {
            const candidate = user.id === id ? updated : user;
            return candidate.enabled && candidate.admin;
          })) { expected = 409; result = { code: 'last_admin' }; }
          else { accounts.set(id, updated); expected = 200; result = publicUser(updated); }
        }
      } else if (operation === 'list') {
        const offsetText = url.searchParams.get('offset');
        const limitText = url.searchParams.get('limit');
        const offset = offsetText === null ? 0 : Number(offsetText);
        const limit = limitText === null ? defaultCollectionLimit : Number(limitText);
        const integer = value => value === null || /^-?\d+$/.test(value);
        const validOffset = integer(offsetText) && Number.isInteger(offset) && offset >= 0;
        const validLimit = integer(limitText) && Number.isInteger(limit) && limit >= 1 && limit <= maximumCollectionLimit;
        if ((!validOffset && !(offset === -1 && hasFault(collectionFault, 'negative-offset')))
            || (!validLimit && !(limit === 101 && hasFault(collectionFault, 'excessive-limit')))) {
          expected = 400; result = { code: 'invalid_request' };
        } else {
          expected = 200; result = userCollection([...accounts.values()].map(publicUser),
            hasFault(collectionFault, 'offset') ? 0 : offset, limit);
          if (hasFault(collectionFault, 'total')) result.total++;
          if (hasFault(collectionFault, 'limit')) result.limit = result.items.length;
          if (hasFault(collectionFault, 'order')) result.order = [{ field: 'email', direction: 'asc' }];
          if (offset === 1 && hasFault(collectionFault, 'window')) {
            result.items = userCollection([...accounts.values()].map(publicUser), 0, limit).items;
          }
          if (hasFault(collectionFault, 'extra')) result.hasMore = true;
          if (hasFault(collectionFault, 'order-extra')) result.order[0].comparison = 'internal';
        }
      } else if (!target) { expected = 404; result = { code: 'user_not_found' }; }
      else { expected = 200; result = publicUser(target); }
      if (actor && !actor.enabled && acceptDisabledTokens) faultsReached.push(disabledTokenFault);
      requests.push({ method: request.method, path: request.url, accept: request.headers.accept, expected });
      const override = users[`${operation}:${expected}`] ?? {};
      if (users[`${operation}:${expected}`]) faultsReached.push(`${operation}:${expected}`);
      if (override.hang) return;
      response.writeHead(override.status ?? expected, {
        'Content-Type': override.contentType ?? 'application/json', 'Cache-Control': 'no-store',
        ...(expected === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}), ...override.headers
      });
      response.end(override.body ?? serialize(result));
      return;
    }
    requests.push({ method: request.method, path: request.url, accept: request.headers.accept });
    if (hang) return;
    if (redirect && request.url === '/health') {
      response.writeHead(302, { Location: '/target' });
      response.end();
      return;
    }
    response.writeHead(status, { 'Content-Type': contentType });
    response.end(body);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    requests,
    faultsReached,
    async close() {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  };
}
