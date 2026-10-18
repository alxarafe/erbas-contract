export const wmsScopes = Object.freeze({ wms: 'wms', storageAttributes: 'storage-attributes', itemFamilies: 'item-families' });
const scopePaths = {
  [wmsScopes.wms]: 'modules/wms/uoms',
  [wmsScopes.storageAttributes]: 'modules/wms/storage-attributes',
  [wmsScopes.itemFamilies]: 'modules/wms/item-families'
};
export const wmsFullPaths = [scopePaths[wmsScopes.wms], scopePaths[wmsScopes.storageAttributes], scopePaths[wmsScopes.itemFamilies]];
export const wmsCapabilityPaths = ['modules/wms/capabilities', 'modules/wms/invocations'];
const itemFamilyConformanceTimeoutMs = 90000;
export function wmsScopePaths(scope) {
  return Object.hasOwn(scopePaths, scope) ? [scopePaths[scope]] : undefined;
}

export function wmsScopeTimeoutMs(scope) {
  return scope === wmsScopes.itemFamilies ? itemFamilyConformanceTimeoutMs : undefined;
}
