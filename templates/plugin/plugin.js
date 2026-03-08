import { createPlugin } from "@nodude/code/plugins";

export default createPlugin("{{name}}", {
  install(app, options = {}) {
    app.use((req, res, next) => {
      // Plugin logic here
      next();
    });
  },
});
