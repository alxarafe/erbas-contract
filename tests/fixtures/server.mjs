import { createServer } from 'node:http';

export async function startServer(handle, { requests, faultsReached }) {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://fixture.test');
    await handle(request, response, url);
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
