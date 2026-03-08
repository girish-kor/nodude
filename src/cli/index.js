#!/usr/bin/env node
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const [, , command, name] = process.argv;

const commands = {
  "generate:model": generateModel,
  "generate:service": generateService,
  "generate:plugin": generatePlugin,
  new: generateProject,
  help: showHelp,
};

async function run() {
  const handler = commands[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
  }
  await handler(name);
}

async function generateModel(name) {
  if (!name) {
    console.error("Model name required");
    process.exit(1);
  }
  const content = `export default {
  name: '${capitalize(name)}',
  schema: {
    name: { type: 'String', required: true },
    createdBy: { type: 'ObjectId', ref: 'User' }
  },
  timestamps: true,
  roles: {
    create: ['user', 'admin'],
    read: ['*'],
    update: ['owner', 'admin'],
    delete: ['owner', 'admin']
  }
};
`;
  await mkdir("models", { recursive: true });
  await writeFile(join("models", `${name}.model.js`), content);
  console.log(`✅ Model created: models/${name}.model.js`);
}

async function generateService(name) {
  if (!name) {
    console.error("Service name required");
    process.exit(1);
  }
  const content = `import { defineService } from 'nodude';

export default defineService('${name}', {
  async doSomething(data) {
    // implement
    return data;
  }
});
`;
  await mkdir("services", { recursive: true });
  await writeFile(join("services", `${name}.service.js`), content);
  console.log(`✅ Service created: services/${name}.service.js`);
}

async function generatePlugin(name) {
  if (!name) {
    console.error("Plugin name required");
    process.exit(1);
  }
  const content = `import { createPlugin } from 'nodude/plugins';

export default createPlugin('${name}', {
  install(app, options = {}) {
    // Add express middleware or setup
    app.use((req, res, next) => {
      next();
    });
  }
});
`;
  await mkdir("plugins", { recursive: true });
  await writeFile(join("plugins", `${name}.plugin.js`), content);
  console.log(`✅ Plugin created: plugins/${name}.plugin.js`);
}

async function generateProject(name) {
  if (!name) {
    console.error("Project name required");
    process.exit(1);
  }
  const base = join(process.cwd(), name);
  await mkdir(base, { recursive: true });

  await writeFile(
    join(base, "server.js"),
    `import { createApp } from 'nodude';

const app = await createApp({
  database: { type: 'sqlite', filename: './dev.db' },
  auth: { secret: process.env.JWT_SECRET || 'dev-secret' },
  models: [
    {
      name: 'User',
      auth: true,
      schema: {
        name:     { type: 'String', required: true },
        email:    { type: 'String', required: true, unique: true },
        password: { type: 'String', required: true, private: true },
        role:     { type: 'String', default: 'user', enum: ['user', 'admin'] }
      }
    }
  ]
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`🚀 Server running on http://localhost:\${PORT}\`));
`,
  );

  await writeFile(
    join(base, "package.json"),
    JSON.stringify(
      {
        name,
        version: "1.0.0",
        type: "module",
        scripts: { start: "node server.js", dev: "node --watch server.js" },
        dependencies: { nodude: "^1.0.0" },
      },
      null,
      2,
    ),
  );

  await writeFile(
    join(base, ".env"),
    `PORT=3000\nJWT_SECRET=change-me-in-production\n`,
  );
  await writeFile(join(base, ".gitignore"), `node_modules\n.env\n*.db\n`);

  console.log(`✅ Project created: ${name}/`);
  console.log(`   cd ${name} && npm install && npm start`);
}

function showHelp() {
  console.log(`
nodude CLI

Usage:
  abc new <project-name>         Create a new project
  abc generate:model <name>      Generate a model file
  abc generate:service <name>    Generate a service file
  abc generate:plugin <name>     Generate a plugin file
  abc help                       Show this help
`);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
