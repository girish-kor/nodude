const registry = new Map();

export class ServiceRegistry {
  register(service) {
    registry.set(service._name || service.name, service);
    return this;
  }

  get(name) {
    return registry.get(name);
  }

  getAll() {
    return Object.fromEntries(registry);
  }

  has(name) {
    return registry.has(name);
  }
}

export function defineService(name, implementation) {
  return {
    _name: name,
    name,
    ...implementation
  };
}
