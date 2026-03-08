export function defineModel(name, definition) {
  return {
    name,
    ...definition
  };
}
