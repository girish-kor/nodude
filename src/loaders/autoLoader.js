import { readdir } from 'fs/promises';
import { join, extname } from 'path';
import { pathToFileURL } from 'url';
import { logger } from '../utils/logger.js';

export async function autoLoadModules(dir, extensions = ['.js']) {
  const modules = [];

  let files;
  try {
    files = await readdir(dir, { withFileTypes: true });
  } catch {
    return modules;
  }

  for (const file of files) {
    const fullPath = join(dir, file.name);
    if (file.isDirectory()) {
      const nested = await autoLoadModules(fullPath, extensions);
      modules.push(...nested);
    } else if (extensions.includes(extname(file.name))) {
      try {
        const mod = await import(pathToFileURL(fullPath).href);
        modules.push({ path: fullPath, module: mod });
        logger.debug(`Auto-loaded: ${fullPath}`);
      } catch (err) {
        logger.warn(`Failed to auto-load ${fullPath}: ${err.message}`);
      }
    }
  }

  return modules;
}

export async function autoLoadRoutes(app, routesDir, prefix = '') {
  const modules = await autoLoadModules(routesDir);
  for (const { module } of modules) {
    if (module.default && typeof module.default === 'function') {
      app.use(prefix, module.default);
      logger.info(`Route loaded from ${routesDir}`);
    }
  }
}
