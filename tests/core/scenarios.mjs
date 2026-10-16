import { administratorBootstrap } from '../../scripts/conformance/core.mjs';

export const [administratorLogin, createNormalUser, normalUserLogin] = administratorBootstrap;
const user = name => `core/users/users-${name}.bru`;
const collection = name => `core/collections/collections-${name}.bru`;
const module = name => `core/modularity/modules-${name}.bru`;
const createdUser = [administratorLogin, createNormalUser];
const authenticatedUser = [...createdUser, normalUserLogin];
const usersReference = user('20-list-users');
const disableUser = user('36-disable-user');
const normalizeMath = module('105-normalize-math');

export const authScenarios = {
  200: [administratorLogin],
  401: ['core/auth/login-wrong-password.bru'],
  400: ['core/auth/login-empty-email.bru']
};

export const userScenarios = {
  'me:200': [administratorLogin, user('16-current-administrator')],
  'me:401': [user('17-current-user-missing-bearer')],
  'list:403': [...authenticatedUser, user('26-list-normal-authorization')],
  'create:201': createdUser,
  'list:200': [...createdUser, usersReference],
  'get:200': [...createdUser, user('21-get-created-user')],
  'patch:200': [...createdUser, disableUser],
  'create:409': [...createdUser, user('43-duplicate-email')],
  // Creation supplies the absent ID and the invalid payload's credentials.
  'get:404': [...createdUser, user('44-absent-user-get')],
  'create:400': [...createdUser, user('46-invalid-create-extra')],
  'patch:400': [...createdUser, user('57-invalid-patch-empty')]
};
export const disabledTokenScenario = [...authenticatedUser, disableUser, user('37-disabled-token-rejected')];

const collectionReference = collection('68-defaults');
// The reference assertion requires the two password-boundary users as well.
const collectionWindow = [...createdUser, usersReference,
  user('66-password-boundary-12'), user('67-password-boundary-256'),
  collectionReference, collection('70-offset-one')];
export const collectionScenarios = {
  total: [...createdUser, usersReference],
  limit: [...createdUser, usersReference],
  order: [...createdUser, usersReference],
  extra: [...createdUser, usersReference],
  'order-extra': [...createdUser, usersReference],
  offset: collectionWindow,
  window: collectionWindow,
  'negative-offset': [administratorLogin, collection('75-negative-offset')],
  'excessive-limit': [administratorLogin, collection('77-excessive-limit')]
};

const moduleReference = module('093-defaults');
const moduleDiscovery = module('130-canonical-descriptors');
const disableConflict = module('108-disable-conflict');
const enableConflict = [module('110-disable-statistics'), module('112-disable-math'), module('113-enable-conflict')];
const missingBearer = module('083-list-missing-bearer');
const missingModule = [administratorLogin, missingBearer, module('118-not-found')];
export const moduleScenarios = {
  extra: [administratorLogin, moduleReference],
  missing: [administratorLogin, moduleReference],
  'api-version': [administratorLogin, moduleReference],
  dependencies: [administratorLogin, moduleReference],
  enabled: [administratorLogin, moduleReference],
  order: [administratorLogin, moduleReference, module('094-limit-one')],
  pagination: [administratorLogin, moduleReference],
  // Discovery's inherited checks compare against moduleReference.
  'math-absent': [administratorLogin, moduleReference, moduleDiscovery],
  'statistics-absent': [administratorLogin, moduleReference, moduleDiscovery],
  'statistics-no-math': [administratorLogin, moduleReference],
  'statistics-wrong-dependency': [administratorLogin, moduleReference],
  'accepted-conflict': [administratorLogin, disableConflict],
  'accepted-enable-conflict': [administratorLogin, ...enableConflict],
  'partial-disable-conflict': [administratorLogin, disableConflict, module('109-statistics-remains-enabled-after-conflict')],
  'partial-enable-conflict': [administratorLogin, ...enableConflict,
    module('114-probe-math-enable-after-conflict'), module('115-probe-math-disable-after-conflict')],
  'stale-state': [administratorLogin, normalizeMath],
  'unauthenticated response': [missingBearer],
  'non-admin response': [...authenticatedUser, module('088-list-non-admin')],
  'accepted invalid patch': [administratorLogin, module('119-invalid-patch-empty')],
  'missing module status': missingModule,
  'missing module body': missingModule,
  'dependency conflict body': [administratorLogin, disableConflict],
  'missing module no-store': [administratorLogin, moduleReference],
  'module challenge on success': [administratorLogin, normalizeMath]
};
