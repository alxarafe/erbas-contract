import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const coreScopes = Object.freeze({
  health: 'health', auth: 'auth', users: 'users', collections: 'collections', modules: 'modules', capabilities: 'capabilities', resources: 'resources', navigation: 'navigation'
});
export const coreFullPaths = ['core/health', 'core/auth', 'core/users', 'core/collections', 'core/modularity'];
export const coreCapabilityPaths = ['core/capabilities'];
const administratorLogin = 'core/auth/login-success.bru';
const createNormalUser = 'core/users/users-19-create-normal-user.bru';
const normalUserLogin = 'core/users/users-22-normal-user-login.bru';
const listUsers = 'core/users/users-20-list-users.bru';
const passwordBoundaryRequests = ['core/users/users-66-password-boundary-12.bru', 'core/users/users-67-password-boundary-256.bru'];
export const administratorBootstrap = [administratorLogin, createNormalUser, normalUserLogin];

export async function coreScopePaths(scope, collectionDirectory) {
  if (scope === coreScopes.navigation) return [...administratorBootstrap, 'core/resources/resources-592-discovery.bru', 'core/navigation'];
  if (scope === coreScopes.resources) return [...administratorBootstrap, 'core/resources'];
  if (scope === coreScopes.health) return ['core/health/health.bru'];
  if (scope === coreScopes.capabilities) return [...administratorBootstrap, ...coreCapabilityPaths];
  if (scope === coreScopes.modules) return [...administratorBootstrap, 'core/modularity'];
  if (![coreScopes.auth, coreScopes.users, coreScopes.collections].includes(scope)) return undefined;
  const directory = `core/${scope}`;
  const requests = [];
  for (const file of await readdir(join(collectionDirectory, directory))) {
    if (file.endsWith('.bru') && file !== 'folder.bru') {
      const source = await readFile(join(collectionDirectory, directory, file), 'utf8');
      requests.push({ file: `${directory}/${file}`, sequence: Number(source.match(/seq: (\d+)/)[1]) });
    }
  }
  const selected = requests.sort((a, b) => a.sequence - b.sequence).map(request => request.file);
  if (scope === coreScopes.auth) return selected;
  if (scope === coreScopes.users) return [administratorLogin, ...selected];
  return [administratorLogin, createNormalUser, listUsers, ...passwordBoundaryRequests, ...selected];
}
