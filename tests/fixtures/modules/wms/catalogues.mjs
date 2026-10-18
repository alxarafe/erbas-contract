import { randomUUID } from 'node:crypto';
import { associationFixture, itemFamiliesPath } from './associations.mjs';
import { fixtureModuleApiVersion, defaultCollectionLimit, maximumCollectionLimit } from '../../common.mjs';

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

export function fixtureModule() {
  return { id: WMS_ID, moduleApiVersion: fixtureModuleApiVersion, dependencies: [], enabled: true };
}

export function wmsFixture({ wmsFault, storageAttributeFault, itemFamilyFault, associationFault } = {}, context, { actorFor, isModuleDisabled }) {
  const { requests, hasFault, serialize } = context;
  const uoms = [];
  const storageAttributes = [];
  const itemFamilies = [];
  const associations = associationFixture({ families: itemFamilies, attributes: storageAttributes,
    actorFor, disabled: () => isModuleDisabled(WMS_ID), requests, fault: associationFault, hasFault,
    defaultLimit: defaultCollectionLimit, maximumLimit: maximumCollectionLimit });
  const handle = async (request, response, url) => {
    const path = url.pathname;
    if (await associations(request, response, url)) return true;
    if (path === uomsPath || path === storageAttributesPath || path === itemFamiliesPath) {
      const isFamily = path === itemFamiliesPath;
      const isStorageAttribute = path === storageAttributesPath || isFamily;
      const catalogue = isFamily ? itemFamilies : isStorageAttribute ? storageAttributes : uoms;
      const labelField = isStorageAttribute ? 'name' : 'description';
      const codePattern = isStorageAttribute ? storageAttributeCodePattern : uomCodePattern;
      const codeConflict = isFamily ? 'wms_item_family_code_conflict' : isStorageAttribute ? storageAttributeCodeConflict : uomCodeConflict;
      const fault = isFamily ? itemFamilyFault : isStorageAttribute ? storageAttributeFault : wmsFault;
      const actor = actorFor(request);
      const disabled = isModuleDisabled(WMS_ID);
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
      return true;
    }
    return false;
  };
  // Synthetic provider dispatch uses the same catalogue state as the existing GETs.
  handle.invoke = (descriptor, { offset = 0, limit = defaultCollectionLimit }) => {
    const catalogues = { uoms, 'storage-attributes': storageAttributes, 'item-families': itemFamilies };
    const catalogue = catalogues[descriptor.id.split('.')[1]];
    const ordered = [...catalogue].sort((a, b) => a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
    return { items: ordered.slice(offset, offset + limit), offset, limit, total: ordered.length,
      order: [{ field: 'code', direction: 'asc' }] };
  };
  return handle;
}
