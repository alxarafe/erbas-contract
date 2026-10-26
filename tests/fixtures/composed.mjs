// The composition layer chooses installed functional fixtures; transport and CORE do not.
import { resourceFixture } from './resources.mjs';
import { readFile } from 'node:fs/promises';
import { startServer } from './server.mjs';
import { createContext } from './common.mjs';
import { coreFixture, fixtureModules as coreModules } from './core.mjs';
import { wmsFixture, fixtureModule } from './modules/wms/catalogues.mjs';
import { assistantFixture, fixtureModule as aiFixtureModule } from './modules/ai/assistant.mjs';
export { fixtureEnv } from './core.mjs';

export function fixtureModules() {
  return [...coreModules(), fixtureModule(), aiFixtureModule()];
}

export async function startFixture(options = {}) {
  const context = createContext(options);
  const capabilityDescriptors = JSON.parse(await readFile(new URL('../../openapi/modules/wms/capabilities.json', import.meta.url), 'utf8'));
  const core = coreFixture({ capabilityDescriptors, executeCapability: (descriptor, input) => {
    if (context.hasFault(options.executionFailure, 'provider-exception')) throw new Error('Synthetic provider exception');
    if (context.hasFault(options.executionFailure, 'invalid-provider-output')) return null;
    return wms.invoke(descriptor, input);
  }, ...options, availableModules: options.availableModules === undefined ? fixtureModules() : options.availableModules }, context);
  const wms = wmsFixture(options, context, core);
  const resources = resourceFixture(options, context, core);
  const assistant = assistantFixture(options, context, core);
  return startServer(async (request, response, url) => {
    if (!await resources(request, response, url) && !await wms(request, response, url) && !await assistant(request, response, url)) {
      await core.handle(request, response, url);
    }
  }, context);
}
