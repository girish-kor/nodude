import mongoose from 'mongoose';

export class MongoAdapter {
  constructor(config) {
    this.config = config;
    this.models = {};
  }

  async connect() {
    const uri = this.config.uri || 'mongodb://localhost:27017/autobackend';
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
  }

  async disconnect() {
    await mongoose.disconnect();
  }

  buildModel(name, schemaDef, options = {}) {
    if (this.models[name]) return this.models[name];

    const mongoSchema = {};
    for (const [field, def] of Object.entries(schemaDef)) {
      if (field === '_id') continue;
      mongoSchema[field] = this._mapFieldType(def);
    }

    const schema = new mongoose.Schema(mongoSchema, {
      timestamps: options.timestamps !== false,
      toJSON: { virtuals: true, getters: true },
      toObject: { virtuals: true }
    });

    if (options.indexes) {
      for (const idx of options.indexes) {
        schema.index(idx.fields, idx.options || {});
      }
    }

    const model = mongoose.models[name] || mongoose.model(name, schema);
    this.models[name] = model;
    return model;
  }

  _mapFieldType(def) {
    if (typeof def === 'string') return { type: this._resolveType(def) };

    const mapped = {};
    if (def.type) {
      if (def.type === '[String]') return [{ type: String }];
      if (def.type === '[Number]') return [{ type: Number }];
      if (def.type === '[ObjectId]') return [{ type: mongoose.Schema.Types.ObjectId, ref: def.ref }];
      mapped.type = this._resolveType(def.type);
    }
    if (def.required) mapped.required = def.required;
    if (def.unique) mapped.unique = def.unique;
    if (def.default !== undefined) mapped.default = def.default;
    if (def.enum) mapped.enum = def.enum;
    if (def.ref) mapped.ref = def.ref;
    if (def.minLength) mapped.minlength = def.minLength;
    if (def.maxLength) mapped.maxlength = def.maxLength;
    if (def.min !== undefined) mapped.min = def.min;
    if (def.max !== undefined) mapped.max = def.max;
    return mapped;
  }

  _resolveType(t) {
    switch (t) {
      case 'String': return String;
      case 'Number': return Number;
      case 'Boolean': return Boolean;
      case 'Date': return Date;
      case 'ObjectId': return mongoose.Schema.Types.ObjectId;
      case 'Mixed': return mongoose.Schema.Types.Mixed;
      default: return String;
    }
  }

  getModel(name) {
    return this.models[name];
  }

  async count(modelName, query = {}) {
    const model = this.models[modelName];
    if (!model) return 0;
    return model.countDocuments(query);
  }
}
