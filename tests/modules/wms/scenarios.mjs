import { administratorLogin } from '../../core/scenarios.mjs';

const uom = name => `modules/wms/uoms/wms-${name}.bru`;
const storage = name => `modules/wms/storage-attributes/storage-${name}.bru`;
const family = name => `modules/wms/item-families/families-${name}.bru`;
const uomMaximum = uom('142-create-maximum');
const uomSingle = uom('143-create-single-character');
const uomList = uom('144-ordered-defaults');
const disableUoms = uom('136-disable');
export const uomScenarios = {
  'accepted-duplicate': [administratorLogin, uomSingle, uom('145-duplicate')],
  'lost-state': [administratorLogin, uomMaximum, uomList],
  order: [administratorLogin, uomMaximum, uomSingle, uomList],
  'unicode-length': [administratorLogin, uomMaximum],
  'gate-before-auth': [administratorLogin, disableUoms, uom('139-anonymous-disabled')],
  'ignored-gate': [administratorLogin, disableUoms, uom('137-disabled-query')],
  extra: [administratorLogin, uomMaximum],
  pagination: [administratorLogin, uom('131-initial-empty')],
  'untrimmed-description': [administratorLogin, uomMaximum],
  'untrimmed-persistence': [administratorLogin, uomMaximum, uomList],
  'length-before-trim': [administratorLogin, uomMaximum]
};

const storageMaximum = storage('194-create-maximum');
const storageSingle = storage('195-create-single-character');
const storageList = storage('196-ordered-defaults');
export const storageScenarios = {
  'accepted-duplicate': [administratorLogin, storageSingle, storage('197-duplicate')],
  'ignored-gate': [administratorLogin, storage('188-disable'), storage('189-disabled-query')],
  order: [administratorLogin, storageMaximum, storageSingle, storageList],
  pagination: [administratorLogin, storage('183-initial-empty')],
  'unicode-length': [administratorLogin, storageMaximum],
  'untrimmed-description': [administratorLogin, storageMaximum],
  'length-before-trim': [administratorLogin, storageMaximum],
  'untrimmed-persistence': [administratorLogin, storageMaximum, storageList],
  'normalized-code': [administratorLogin, storage('210-lowercase')],
  'accepted-extra': [administratorLogin, storage('215-extra-property')]
};

const familyMaximum = family('278-create-maximum');
export const itemFamilyScenarios = {
  'normalized-code': [administratorLogin, family('294-lowercase')],
  'unicode-length': [administratorLogin, familyMaximum],
  'untrimmed-persistence': [administratorLogin, familyMaximum, family('280-ordered-defaults')],
  'accepted-duplicate': [administratorLogin, family('279-create-single-character'), family('281-duplicate')]
};

// Master indexes in the existing requests require Z, A, M in this order.
const masterZ = family('351-master-wms003_z');
const masters = [masterZ, family('352-master-wms003_a'), family('353-master-wms003_m')];
const replaceAssociations = family('386-put-replace');
const putMissing = family('400-put-multiple-missing');
const patchConflicts = family('402-patch-multiple-conflicts');
const associationSetup = [administratorLogin, familyMaximum];
const conflictSetup = [...associationSetup, ...masters, replaceAssociations];
export const associationScenarios = {
  // A nonempty initial relation is essential: clearing empty state proves nothing.
  'partial-put': [...associationSetup, masterZ, family('378-create-association'),
    putMissing, family('401-put-multiple-missing-unchanged')],
  'partial-patch': [...conflictSetup, patchConflicts, family('403-patch-multiple-conflicts-unchanged')],
  'missing-conflict-detail': [...conflictSetup, patchConflicts],
  'missing-resource-detail': [...associationSetup, masterZ, putMissing]
};
