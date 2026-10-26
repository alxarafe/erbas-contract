import { createHash } from 'node:crypto';
import { resourceProbe } from './resources.mjs';

export function navigationFixture({ navigationFault } = {}, context, { actorFor }) {
  return async (request, response, url) => {
    if (url.pathname !== '/api/meta/navigation') return false;
    const actor = actorFor(request);
    let status, body;
    const headers = { 'Content-Type': 'application/json' };
    if (!actor?.enabled) { status = 401; body = { code: 'unauthorized' }; headers['WWW-Authenticate'] = 'Bearer'; headers['Cache-Control'] = 'no-store'; }
    else {
      const items = actor.admin ? [{ id: 'fixture.navigation', label: 'Application', order: 10,
        children: [{ id: 'fixture.navigation.register', label: 'Register', order: 10, target: { type: 'RESOURCE', resource: resourceProbe }, children: [] }] }] : [];
      if (context.hasFault(navigationFault, 'empty-group')) items.push({ id: 'fixture.empty', label: 'Empty', order: 20, children: [] });
      if (context.hasFault(navigationFault, 'schema-leak') && items.length) items[0].fields = [];
      const version = createHash('sha256').update(JSON.stringify({ subject: actor.id, items })).digest('hex');
      const etag = '"' + version + '"';
      headers.ETag = etag; headers.Vary = 'Authorization, Accept-Language'; headers['Cache-Control'] = 'private, no-cache';
      if (context.hasFault(navigationFault, 'context-cache') && !actor.admin && request.headers['if-none-match']) { status = 304; headers.ETag = request.headers['if-none-match']; }
      else status = request.headers['if-none-match'] === etag ? 304 : 200;
      body = { version, items };
    }
    context.requests.push({ method: request.method, path: request.url, expected: status });
    response.writeHead(status, headers); response.end(status === 304 ? undefined : context.serialize(body));
    return true;
  };
}
