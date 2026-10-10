import { createServer } from 'node:http';

export const fixtureEnv = { ...process.env, ERBAS_TEST_EMAIL: 'fixture@example.test', ERBAS_TEST_PASSWORD: 'synthetic-"-\\-password' };

// The fixture owns its comparison; consumers only observe stable opaque IDs.
export function userCollection(users, offset = 0, limit = 50) {
  const ordered = [...users].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return { items: ordered.slice(offset, offset + limit), offset, limit, total: ordered.length,
    order: [{ field: 'id', direction: 'asc' }] };
}

export async function startFixture({ status = 200, contentType = 'application/json', body = '{"status":"ok"}', redirect = false, hang = false, auth = {}, users = {}, acceptDisabledTokens = false, collectionFault } = {}) {
  const requests = [];
  const accounts = new Map([['synthetic-admin', { id: 'synthetic-admin', email: fixtureEnv.ERBAS_TEST_EMAIL,
    enabled: true, admin: true, password: fixtureEnv.ERBAS_TEST_PASSWORD }]]);
  const tokens = new Map([['synthetic.token_123', 'synthetic-admin']]);
  const publicUser = ({ id, email, enabled, admin }) => ({ id, email, enabled, admin });
  let nextId = 1;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://fixture.test');
    const path = url.pathname;
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
      if (override.hang) return;
      response.writeHead(override.status ?? expected, {
        'Content-Type': override.contentType ?? 'application/json',
        ...(expected === 200 ? { 'Cache-Control': 'no-store' } : {}),
        ...(expected === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}),
        ...override.headers
      });
      response.end(override.body ?? JSON.stringify(expected === 200 ? { accessToken: token }
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
        const limit = limitText === null ? 50 : Number(limitText);
        const integer = value => value === null || /^-?\d+$/.test(value);
        const validOffset = integer(offsetText) && Number.isInteger(offset) && offset >= 0;
        const validLimit = integer(limitText) && Number.isInteger(limit) && limit >= 1 && limit <= 100;
        if ((!validOffset && !(collectionFault === 'negative-offset' && offset === -1))
            || (!validLimit && !(collectionFault === 'excessive-limit' && limit === 101))) {
          expected = 400; result = { code: 'invalid_request' };
        } else {
          expected = 200; result = userCollection([...accounts.values()].map(publicUser),
            collectionFault === 'offset' ? 0 : offset, limit);
          if (collectionFault === 'total') result.total++;
          if (collectionFault === 'limit') result.limit = result.items.length;
          if (collectionFault === 'order') result.order = [{ field: 'email', direction: 'asc' }];
          if (collectionFault === 'window' && offset === 1) {
            result.items = userCollection([...accounts.values()].map(publicUser), 0, limit).items;
          }
          if (collectionFault === 'extra') result.hasMore = true;
          if (collectionFault === 'order-extra') result.order[0].comparison = 'internal';
        }
      } else if (!target) { expected = 404; result = { code: 'user_not_found' }; }
      else { expected = 200; result = publicUser(target); }
      requests.push({ method: request.method, path: request.url, accept: request.headers.accept, expected });
      const override = users[`${operation}:${expected}`] ?? {};
      if (override.hang) return;
      response.writeHead(override.status ?? expected, {
        'Content-Type': override.contentType ?? 'application/json', 'Cache-Control': 'no-store',
        ...(expected === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}), ...override.headers
      });
      response.end(override.body ?? JSON.stringify(result));
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
    async close() {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  };
}
