# nodude

> Reduce Node.js backend code by 80–100%. Define models, routes, and services. Everything else is automatic.

## Install

```bash
npm install nodude
```

## Quickstart

```js
import { createApp } from "nodude";

const app = await createApp({
  database: { type: "mongodb", uri: process.env.MONGO_URI },
  auth: { secret: process.env.JWT_SECRET },
  models: [
    {
      name: "User",
      schema: {
        name: { type: "String", required: true },
        email: { type: "String", required: true, unique: true },
        password: { type: "String", required: true, private: true },
        role: { type: "String", default: "user", enum: ["user", "admin"] },
      },
      auth: true,
    },
    {
      name: "Product",
      schema: {
        title: { type: "String", required: true },
        price: { type: "Number", required: true },
        stock: { type: "Number", default: 0 },
      },
      roles: {
        create: ["admin"],
        update: ["admin"],
        delete: ["admin"],
        read: ["*"],
      },
    },
  ],
});

app.listen(3000, () => console.log("API running on :3000"));
```

That 20 lines of code generates:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/users` (admin)
- `GET /api/v1/users/:id`
- `PUT /api/v1/users/:id`
- `DELETE /api/v1/users/:id`
- `GET /api/v1/products`
- `GET /api/v1/products/:id`
- `POST /api/v1/products` (admin)
- `PUT /api/v1/products/:id` (admin)
- `DELETE /api/v1/products/:id` (admin)
- `GET /health`

---

## Configuration

```js
const app = await createApp({
  port: 3000,
  apiPrefix: '/api/v1',
  database: {
    type: 'mongodb' | 'postgresql' | 'sqlite',
    uri: 'mongodb://...',
    // or for pg: { host, port, user, password, database }
    // or for sqlite: { filename: './data.db' }
  },
  auth: {
    secret: 'your-jwt-secret',
    expiresIn: '7d',
    refreshEnabled: true,
    refreshExpiresIn: '30d'
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100
  },
  cors: { origin: '*' },
  logging: { level: 'info', format: 'json' },
  models: [...],
  plugins: [...]
});
```

## Model Schema Definition

```js
{
  name: 'Post',
  schema: {
    title:   { type: 'String',  required: true, minLength: 3, maxLength: 100 },
    body:    { type: 'String',  required: true },
    author:  { type: 'ObjectId', ref: 'User' },
    tags:    { type: '[String]' },
    status:  { type: 'String', enum: ['draft','published'], default: 'draft' },
    views:   { type: 'Number', default: 0, private: false },
    secret:  { type: 'String', private: true }  // excluded from responses
  },
  timestamps: true,
  roles: {
    create: ['user', 'admin'],
    read:   ['*'],
    update: ['owner', 'admin'],
    delete: ['owner', 'admin']
  },
  hooks: {
    beforeCreate: async (data, req) => { /* mutate data */ },
    afterCreate:  async (doc, req)  => { /* side effects */ }
  }
}
```

## Custom Services

```js
import { createApp, defineService } from 'nodude';

const emailService = defineService('email', {
  async sendWelcome(user) { /* ... */ }
});

const app = await createApp({
  models: [...],
  services: [emailService],
  hooks: {
    'user.afterCreate': async (user, { services }) => {
      await services.email.sendWelcome(user);
    }
  }
});
```

## Custom Routes

```js
const app = await createApp({
  models: [...],
  routes: [
    {
      method: 'GET',
      path: '/api/v1/stats',
      roles: ['admin'],
      handler: async (req, res) => {
        res.json({ users: await req.db.count('User') });
      }
    }
  ]
});
```

## Plugins

```js
import { createPlugin } from "nodude/plugins";

const auditPlugin = createPlugin("audit", {
  install(app, options) {
    app.use(async (req, res, next) => {
      req.on("finish", () => console.log(`${req.method} ${req.path}`));
      next();
    });
  },
});
```

## CLI

```bash
npx nodude generate:model Product
npx nodude generate:service payment
npx nodude generate:plugin analytics
npx nodude new my-api
```

## Database Support

| Database   | Adapter        | Status |
| ---------- | -------------- | ------ |
| MongoDB    | Mongoose       | ✅     |
| PostgreSQL | pg             | ✅     |
| SQLite     | better-sqlite3 | ✅     |

## Health Check

`GET /health` returns:

```json
{
  "status": "ok",
  "uptime": 3600,
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## License

MIT
