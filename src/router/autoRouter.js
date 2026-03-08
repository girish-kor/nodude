import express from 'express';
import { CRUDController } from '../controllers/crudController.js';
import { AuthController } from '../controllers/authController.js';
import { ValidationEngine } from '../validation/validationEngine.js';
import { logger } from '../utils/logger.js';

export class AutoRouter {
  constructor({ config, modelRegistry, serviceRegistry, authEngine, hooks }) {
    this.config = config;
    this.modelRegistry = modelRegistry;
    this.serviceRegistry = serviceRegistry;
    this.authEngine = authEngine;
    this.hooks = hooks;
  }

  async build() {
    const router = express.Router();
    const validator = new ValidationEngine();

    for (const [name, def] of this.modelRegistry.getAll()) {
      const model = this.modelRegistry.get(name);
      const prefix = `/${name.toLowerCase()}s`;

      if (def.auth) {
        const authCtrl = new AuthController({
          model,
          modelDef: def,
          authEngine: this.authEngine,
          hooks: this.hooks,
          modelName: name
        });

        router.post('/auth/register', validator.buildRules(def.schema, ['email', 'password']), authCtrl.register());
        router.post('/auth/login', validator.buildRules(def.schema, ['email', 'password']), authCtrl.login());
        router.post('/auth/logout', this.authEngine.authenticate(), authCtrl.logout());
        router.get('/auth/me', this.authEngine.authenticate(), authCtrl.me());

        if (this.config.auth?.refreshEnabled) {
          router.post('/auth/refresh', authCtrl.refresh());
        }

        logger.info(`Auth routes registered for model: ${name}`);
      }

      const ctrl = new CRUDController({
        model,
        modelDef: def,
        modelName: name,
        modelRegistry: this.modelRegistry,
        authEngine: this.authEngine,
        hooks: this.hooks,
        serviceRegistry: this.serviceRegistry
      });

      const readMiddleware = this._buildRoleMiddleware(def.roles?.read);
      const createMiddleware = this._buildRoleMiddleware(def.roles?.create);
      const updateMiddleware = this._buildRoleMiddleware(def.roles?.update);
      const deleteMiddleware = this._buildRoleMiddleware(def.roles?.delete);

      const createRules = validator.buildRules(def.schema, this._getRequiredFields(def.schema));

      router.get(prefix, ...readMiddleware, ctrl.findAll());
      router.get(`${prefix}/:id`, ...readMiddleware, ctrl.findOne());
      router.post(prefix, ...createMiddleware, createRules, ctrl.create());
      router.put(`${prefix}/:id`, ...updateMiddleware, ctrl.update());
      router.patch(`${prefix}/:id`, ...updateMiddleware, ctrl.update());
      router.delete(`${prefix}/:id`, ...deleteMiddleware, ctrl.delete());

      logger.info(`CRUD routes registered: ${prefix}`);
    }

    return router;
  }

  _buildRoleMiddleware(roles) {
    if (!roles || roles.includes('*')) return [];
    return [this.authEngine.authenticate(), this.authEngine.authorize(roles)];
  }

  _getRequiredFields(schema) {
    return Object.entries(schema)
      .filter(([, def]) => def?.required === true)
      .map(([field]) => field);
  }
}
