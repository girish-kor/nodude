import { logger } from '../../utils/logger.js';

export class ModelRegistry {
  constructor(db) {
    this.db = db;
    this.models = {};
    this.definitions = {};
  }

  async register(modelDef) {
    const { name, schema, timestamps = true, indexes = [], hooks = {}, roles = {}, auth = false } = modelDef;

    const adapter = this.db.getAdapter();
    const model = adapter.buildModel(name, schema, { timestamps, indexes });

    this.models[name] = model;
    this.definitions[name] = {
      name,
      schema,
      timestamps,
      indexes,
      hooks,
      roles,
      auth,
      privateFields: this._getPrivateFields(schema)
    };

    logger.info(`Model registered: ${name}`);
    return model;
  }

  get(name) {
    return this.models[name];
  }

  getDef(name) {
    return this.definitions[name];
  }

  getAll() {
    return Object.entries(this.definitions);
  }

  hasModel(name) {
    return !!this.models[name];
  }

  _getPrivateFields(schema) {
    return Object.entries(schema)
      .filter(([, def]) => def?.private === true)
      .map(([field]) => field);
  }

  stripPrivate(name, doc) {
    const def = this.definitions[name];
    if (!def?.privateFields?.length) return doc;
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
    for (const field of def.privateFields) {
      delete obj[field];
    }
    return obj;
  }
}
