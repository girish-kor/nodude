export function createPlugin(name, definition) {
  return {
    _name: name,
    name,
    install: definition.install || (() => {}),
    ...definition
  };
}

export const plugins = {
  audit: createPlugin('audit', {
    install(app, options = {}) {
      app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
          if (options.logger) {
            options.logger(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
          }
        });
        next();
      });
    }
  }),

  requestId: createPlugin('requestId', {
    install(app) {
      app.use((req, _res, next) => {
        req.id = req.headers['x-request-id'] || crypto.randomUUID();
        next();
      });
    }
  }),

  compression: createPlugin('compression', {
    async install(app) {
      try {
        const { default: compress } = await import('compression');
        app.use(compress());
      } catch (_) {}
    }
  })
};
