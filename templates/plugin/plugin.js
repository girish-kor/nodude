import { createPlugin } from "nodude/plugins";

export default createPlugin("{{name}}", {
  install(app, options = {}) {
    app.use((req, res, next) => {
      // Plugin logic here
      next();
    });
  },
});
