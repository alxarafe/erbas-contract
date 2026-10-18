// The composition layer chooses installed functional fixtures; transport and CORE do not.
import { readFile } from 'node:fs/promises';
import { startServer } from './server.mjs';
import { createContext } from './common.mjs';
import { coreFixture, fixtureModules as coreModules } from './core.mjs';
import { wmsFixture, fixtureModule } from './modules/wms/catalogues.mjs';
export { fixtureEnv } from './core.mjs';

export function fixtureModules() {
  return [...coreModules(), fixtureModule()];
}

export async function startFixture(options = {}) {
  const context = createContext(options);
  const capabilityDescriptors = JSON.parse(await readFile(new URL('../../openapi/modules/wms/capabilities.json', import.meta.url), 'utf8'));
  const core = coreFixture({ capabilityDescriptors, ...options, availableModules: options.availableModules === undefined ? fixtureModules() : options.availableModules }, context);
  const wms = wmsFixture(options, context, core);
  return startServer(async (request, response, url) => {
    if (!await wms(request, response, url)) await core.handle(request, response, url);
  }, context);
}
