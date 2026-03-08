import { logger } from '../utils/logger.js';

export class PluginManager {
  constructor(app) {
    this.app = app;
    this.installed = new Map();
  }

  async install(plugin, options = {}) {
    if (!plugin || !plugin._name) {
      throw new Error('Invalid plugin: must have a _name property');
    }

    if (this.installed.has(plugin._name)) {
      logger.warn(`Plugin already installed: ${plugin._name}`);
      return;
    }

    await plugin.install(this.app, options);
    this.installed.set(plugin._name, plugin);
    logger.info(`Plugin installed: ${plugin._name}`);
  }

  isInstalled(name) {
    return this.installed.has(name);
  }

  getAll() {
    return [...this.installed.values()];
  }
}
