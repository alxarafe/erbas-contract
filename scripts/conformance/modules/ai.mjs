import { administratorBootstrap } from '../core.mjs';

export const aiScopes = Object.freeze({ ai: 'ai' });
export const aiFullPaths = ['modules/ai/assistant'];

export function aiScopePaths(scope) {
  return scope === aiScopes.ai ? [...administratorBootstrap, ...aiFullPaths] : undefined;
}
