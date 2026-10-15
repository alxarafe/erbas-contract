export const fixtureModuleApiVersion = 1;
export const defaultCollectionLimit = 50;
export const maximumCollectionLimit = 100;
export const envelope = value => value?.code && Object.keys(value).length === 1 ? { ...value, errors: [{ code: value.code }] } : value;

export function createContext({ errorFault } = {}) {
  const requests = [];
  const faultsReached = [];
  const hasFault = (configured, name) => {
    if (configured !== name) return false;
    faultsReached.push(name);
    return true;
  };
  const serialize = value => {
    const result = envelope(value);
    if (result?.errors && errorFault) {
      hasFault(errorFault, errorFault);
      if (errorFault === 'missing-errors') delete result.errors;
      if (errorFault === 'empty-errors') result.errors = [];
      if (errorFault === 'malformed-detail') result.errors = [{ resourceId: 'fixture' }];
    }
    return JSON.stringify(result);
  };
  return { requests, faultsReached, hasFault, serialize };
}
