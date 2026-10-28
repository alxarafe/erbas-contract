export const scopeTests = {
  navigation: ['tests/core/navigation.test.mjs'],
  resources: ['tests/core/resources.test.mjs', 'tests/core/resource-presentation.test.mjs'],
  health: ['tests/core/health.test.mjs'],
  auth: ['tests/core/auth.test.mjs'],
  users: ['tests/core/users.test.mjs'],
  collections: ['tests/core/collections.test.mjs'],
  modules: ['tests/core/modularity.test.mjs'],
  capabilities: ['tests/core/capabilities.test.mjs', 'tests/modules/wms/capabilities.test.mjs', 'tests/modules/wms/invocations.test.mjs'],
  wms: ['tests/modules/wms/contract.test.mjs'],
  'storage-attributes': ['tests/modules/wms/contract.test.mjs'],
  'item-families': ['tests/modules/wms/contract.test.mjs'],
  ai: ['tests/ai/contract.test.mjs', 'tests/ai/assistant.test.mjs', 'tests/ai/provenance.test.mjs'],
};

const ownedDirectories = {
  'core/navigation': 'navigation', 'core/resources': 'resources', 'core/health': 'health', 'core/auth': 'auth', 'core/users': 'users',
  'core/modularity': 'modules', 'core/capabilities': 'capabilities',
  'modules/wms/uoms': 'wms', 'modules/wms/storage-attributes': 'storage-attributes',
  'modules/wms/item-families': 'item-families',
  'modules/ai': 'ai',
};
const testOwners = {
  'tests/core/health.test.mjs': 'health', 'tests/core/auth.test.mjs': 'auth',
  'tests/core/users.test.mjs': 'users', 'tests/core/collections.test.mjs': 'collections',
  'tests/core/modularity.test.mjs': 'modules', 'tests/core/capabilities.test.mjs': 'capabilities',
  'tests/modules/wms/capabilities.test.mjs': 'capabilities',
  'tests/modules/wms/invocations.test.mjs': 'capabilities',
  'tests/ai/contract.test.mjs': 'ai', 'tests/ai/assistant.test.mjs': 'ai',
  'scripts/conformance/modules/ai.mjs': 'ai',
};

export function normalizeScopes(scopes) {
  if (!scopes.length || scopes.some(scope => !Object.hasOwn(scopeTests, scope))) {
    throw new Error(`Expected one or more scopes: ${Object.keys(scopeTests).join(', ')}`);
  }
  return [...new Set(scopes)].sort();
}

export function scopedTestFiles(scopes) {
  return [...new Set(normalizeScopes(scopes).flatMap(scope => scopeTests[scope]))].sort();
}

export function classifyImpact(paths) {
  const scopes = new Set();
  for (const path of paths) {
    if (path.startsWith('docs/') || ['README.md', 'LICENSE', 'AGENTS.md'].includes(path)) continue;
    let scope = Object.hasOwn(testOwners, path) ? testOwners[path] : undefined;
    if (path === 'openapi/modules/wms/capabilities.json' ||
        path.startsWith('bruno/modules/wms/capabilities/') ||
        path.startsWith('bruno/modules/wms/invocations/')) scope = 'capabilities';
    if (path.startsWith('bruno/core/collections/')) scope = 'collections';
    for (const [directory, owner] of Object.entries(ownedDirectories)) {
      if (path.startsWith(`openapi/${directory}/`) || path.startsWith(`bruno/${directory}/`)) scope = owner;
    }
    if (!scope) return { level: 'full' };
    scopes.add(scope);
  }
  return scopes.size ? { level: 'scoped', scopes: [...scopes].sort() } : { level: 'fast' };
}
