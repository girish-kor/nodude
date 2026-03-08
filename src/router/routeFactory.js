export function defineRoute(definition) {
  return {
    method: 'GET',
    roles: [],
    ...definition
  };
}
