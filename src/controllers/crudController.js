import { AppError, NotFoundError } from '../utils/errors.js';
import { sanitize } from '../utils/sanitize.js';
import { validationResult } from 'express-validator';

export class CRUDController {
  constructor({ model, modelDef, modelName, modelRegistry, authEngine, hooks, serviceRegistry }) {
    this.model = model;
    this.modelDef = modelDef;
    this.modelName = modelName;
    this.modelRegistry = modelRegistry;
    this.authEngine = authEngine;
    this.hooks = hooks;
    this.serviceRegistry = serviceRegistry;
  }

  findAll() {
    return async (req, res, next) => {
      try {
        const { page = 1, limit = 20, sort = '-createdAt', ...filters } = req.query;
        const sanitizedFilters = sanitize(filters);

        let query = this.model.find(sanitizedFilters);

        if (typeof query.sort === 'function') {
          query = query.sort(sort).skip((page - 1) * limit).limit(parseInt(limit));
        }

        const [docs, total] = await Promise.all([
          typeof query.exec === 'function' ? query.exec() : Promise.resolve(query),
          this.model.countDocuments(sanitizedFilters)
        ]);

        const data = docs.map(doc => this.modelRegistry.stripPrivate(this.modelName, doc));

        res.json({
          success: true,
          data,
          meta: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
        });
      } catch (err) {
        next(err);
      }
    };
  }

  findOne() {
    return async (req, res, next) => {
      try {
        const doc = await this._findById(req.params.id);
        if (!doc) return next(new NotFoundError(`${this.modelName} not found`));
        res.json({ success: true, data: this.modelRegistry.stripPrivate(this.modelName, doc) });
      } catch (err) {
        next(err);
      }
    };
  }

  create() {
    return async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({ success: false, errors: errors.array() });
        }

        let data = sanitize(req.body);

        if (this.hooks[`${this.modelName.toLowerCase()}.beforeCreate`]) {
          data = await this.hooks[`${this.modelName.toLowerCase()}.beforeCreate`](data, req) || data;
        }

        const doc = await this.model.create(data);

        if (this.hooks[`${this.modelName.toLowerCase()}.afterCreate`]) {
          await this.hooks[`${this.modelName.toLowerCase()}.afterCreate`](doc, { req, services: this.serviceRegistry.getAll() });
        }

        res.status(201).json({ success: true, data: this.modelRegistry.stripPrivate(this.modelName, doc) });
      } catch (err) {
        next(err);
      }
    };
  }

  update() {
    return async (req, res, next) => {
      try {
        const existing = await this._findById(req.params.id);
        if (!existing) return next(new NotFoundError(`${this.modelName} not found`));

        if (this.modelDef.roles?.update?.includes('owner')) {
          const ownerId = existing.userId || existing.author || existing.createdBy;
          if (ownerId && req.user && String(ownerId) !== String(req.user.id)) {
            return next(new AppError('Forbidden', 403));
          }
        }

        let data = sanitize(req.body);

        if (this.hooks[`${this.modelName.toLowerCase()}.beforeUpdate`]) {
          data = await this.hooks[`${this.modelName.toLowerCase()}.beforeUpdate`](data, req) || data;
        }

        const updated = await this.model.findByIdAndUpdate(
          req.params.id,
          { $set: data },
          { new: true, runValidators: true }
        );

        if (this.hooks[`${this.modelName.toLowerCase()}.afterUpdate`]) {
          await this.hooks[`${this.modelName.toLowerCase()}.afterUpdate`](updated, { req, services: this.serviceRegistry.getAll() });
        }

        res.json({ success: true, data: this.modelRegistry.stripPrivate(this.modelName, updated) });
      } catch (err) {
        next(err);
      }
    };
  }

  delete() {
    return async (req, res, next) => {
      try {
        const existing = await this._findById(req.params.id);
        if (!existing) return next(new NotFoundError(`${this.modelName} not found`));

        if (this.modelDef.roles?.delete?.includes('owner')) {
          const ownerId = existing.userId || existing.author || existing.createdBy;
          if (ownerId && req.user && String(ownerId) !== String(req.user.id)) {
            return next(new AppError('Forbidden', 403));
          }
        }

        if (this.hooks[`${this.modelName.toLowerCase()}.beforeDelete`]) {
          await this.hooks[`${this.modelName.toLowerCase()}.beforeDelete`](existing, req);
        }

        await this.model.findByIdAndDelete(req.params.id);

        if (this.hooks[`${this.modelName.toLowerCase()}.afterDelete`]) {
          await this.hooks[`${this.modelName.toLowerCase()}.afterDelete`](existing, { req, services: this.serviceRegistry.getAll() });
        }

        res.json({ success: true, data: null, message: `${this.modelName} deleted` });
      } catch (err) {
        next(err);
      }
    };
  }

  async _findById(id) {
    if (typeof this.model.findById === 'function') {
      return this.model.findById(id);
    }
    return this.model.findOne({ id });
  }
}
