import { createServer } from 'node:http';

export const fixtureEnv = { ...process.env, ERBAS_TEST_EMAIL: 'fixture@example.test', ERBAS_TEST_PASSWORD: 'synthetic-"-\\-password' };

export async function startFixture({ status = 200, contentType = 'application/json', body = '{"status":"ok"}', redirect = false, hang = false, auth = {} } = {}) {
  const requests = [];
  const server = createServer(async (request, response) => {
    if (request.url === '/api/auth/login') {
      let raw = '';
      for await (const chunk of request) raw += chunk;
      let input;
      try { input = JSON.parse(raw); } catch { /* Malformed JSON is contractual 400. */ }
      const valid = input && !Array.isArray(input) && typeof input === 'object'
        && Object.keys(input).length === 2 && typeof input.email === 'string' && input.email.length > 0
        && typeof input.password === 'string' && input.password.length > 0;
      const correct = valid && input.email === fixtureEnv.ERBAS_TEST_EMAIL && input.password === fixtureEnv.ERBAS_TEST_PASSWORD;
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
      response.end(override.body ?? JSON.stringify(expected === 200 ? { accessToken: 'synthetic.token_123' }
        : { code: expected === 400 ? 'invalid_request' : 'invalid_credentials' }));
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
