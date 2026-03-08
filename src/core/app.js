import express from "express";
import { loadConfig } from "../config/loader.js";
import { setupMiddleware } from "../middleware/index.js";
import { DatabaseManager } from "../database/index.js";
import { ModelRegistry } from "../database/models/modelRegistry.js";
import { AutoRouter } from "../router/autoRouter.js";
import { AuthEngine } from "../auth/index.js";
import { PluginManager } from "../plugins/pluginManager.js";
import { ServiceRegistry } from "../services/serviceRegistry.js";
import { logger } from "../utils/logger.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { healthCheck } from "../middleware/healthCheck.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";

export async function createApp(userConfig = {}) {
  const config = loadConfig(userConfig);
  const expressApp = express();
  expressApp._config = config;

  logger.setLevel(config.logging?.level || "info");
  logger.info("Initializing nodude...");

  const db = new DatabaseManager(config.database);
  await db.connect();
  expressApp._db = db;

  const modelRegistry = new ModelRegistry(db);
  const serviceRegistry = new ServiceRegistry();
  const authEngine = new AuthEngine(config.auth);
  const pluginManager = new PluginManager(expressApp);

  setupMiddleware(expressApp, config);

  expressApp.get("/health", healthCheck(db));

  if (config.models?.length) {
    for (const modelDef of config.models) {
      await modelRegistry.register(modelDef);
    }
  }

  if (config.services?.length) {
    for (const svc of config.services) {
      serviceRegistry.register(svc);
    }
  }

  if (config.plugins?.length) {
    for (const plugin of config.plugins) {
      await pluginManager.install(plugin);
    }
  }

  expressApp.use((req, _res, next) => {
    req.db = db;
    req.models = modelRegistry;
    req.services = serviceRegistry;
    req.auth = authEngine;
    next();
  });

  const autoRouter = new AutoRouter({
    config,
    modelRegistry,
    serviceRegistry,
    authEngine,
    hooks: config.hooks || {},
  });

  const router = await autoRouter.build();
  expressApp.use(config.apiPrefix || "/api/v1", router);

  if (config.routes?.length) {
    const customRouter = express.Router();
    for (const route of config.routes) {
      const method = route.method.toLowerCase();
      const middlewares = [];
      if (route.roles && route.roles.length) {
        middlewares.push(authEngine.authenticate());
        middlewares.push(authEngine.authorize(route.roles));
      }
      customRouter[method](
        route.path.replace(config.apiPrefix || "/api/v1", ""),
        ...middlewares,
        route.handler,
      );
    }
    expressApp.use("/", customRouter);
  }

  expressApp.use(errorHandler);

  gracefulShutdown(expressApp, db);

  logger.info(`nodude ready. Prefix: ${config.apiPrefix || "/api/v1"}`);

  return expressApp;
}
