// examples/minimal-api/server.js
// ─────────────────────────────────────────────────────────────────
// ENTRY POINT — Run with: node examples/minimal-api/server.js
// ─────────────────────────────────────────────────────────────────

import { createApp, defineService } from "../../src/index.js";

// ═══════════════════════════════════════════════════════════════
// STEP 1 — DEFINE CUSTOM SERVICES
// Services hold reusable business logic that controllers/hooks call.
// defineService(name, implementation) registers it into the framework.
// ═══════════════════════════════════════════════════════════════

const notifyService = defineService("notify", {
  async send(user, message) {
    // In production: swap this for nodemailer, SendGrid, Twilio, etc.
    console.log(`[notify] → ${user.email}: ${message}`);
  },

  async sendSMS(phoneNumber, message) {
    console.log(`[sms] → ${phoneNumber}: ${message}`);
  },
});

const auditService = defineService("audit", {
  async log(action, performedBy, targetResource) {
    // In production: write to a database audit table or external log sink
    console.log(
      `[audit] ${action} | by: ${performedBy} | on: ${targetResource}`,
    );
  },
});

// ═══════════════════════════════════════════════════════════════
// STEP 2 — BOOTSTRAP THE ENTIRE APP WITH createApp()
//
// createApp() does ALL of this automatically:
//   ✔ Connects to the database
//   ✔ Builds ORM models from your schema definitions
//   ✔ Generates CRUD controllers for every model
//   ✔ Generates all REST routes and mounts them
//   ✔ Sets up JWT auth endpoints for auth:true models
//   ✔ Applies role-based access control per route
//   ✔ Validates all incoming request bodies
//   ✔ Sanitizes inputs against XSS
//   ✔ Applies security headers (helmet)
//   ✔ Applies CORS
//   ✔ Applies rate limiting
//   ✔ Sets up centralized error handling
//   ✔ Exposes /health endpoint
//   ✔ Registers graceful shutdown handlers
// ═══════════════════════════════════════════════════════════════

const app = await createApp({
  // ─────────────────────────────────────────────────────────────
  // GLOBAL SERVER CONFIG
  // ─────────────────────────────────────────────────────────────
  port: 3000,

  // All auto-generated routes are prefixed with this
  apiPrefix: "/api/v1",

  // ─────────────────────────────────────────────────────────────
  // DATABASE
  // Switch type to 'mongodb' or 'postgresql' with zero other changes.
  // ─────────────────────────────────────────────────────────────
  database: {
    type: "sqlite", // 'sqlite' | 'mongodb' | 'postgresql'
    filename: ":memory:", // ':memory:' = in-RAM SQLite, perfect for dev/testing
    // For MongoDB:    uri: 'mongodb://localhost:27017/myapp'
    // For PostgreSQL: uri: 'postgresql://user:pass@localhost:5432/myapp'
  },

  // ─────────────────────────────────────────────────────────────
  // JWT AUTHENTICATION CONFIG
  // ─────────────────────────────────────────────────────────────
  auth: {
    secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
    expiresIn: "7d", // Access token lifetime
    refreshEnabled: false, // Set true to enable POST /auth/refresh
    refreshExpiresIn: "30d", // Refresh token lifetime (if enabled)
    saltRounds: 10, // bcrypt cost factor for password hashing
  },

  // ─────────────────────────────────────────────────────────────
  // RATE LIMITING — Applied globally to every endpoint
  // ─────────────────────────────────────────────────────────────
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minute rolling window
    max: 200, // max 200 requests per window per IP
  },

  // ─────────────────────────────────────────────────────────────
  // CORS — Passed directly to the `cors` npm package
  // ─────────────────────────────────────────────────────────────
  cors: {
    origin: "*", // Production: replace with your frontend domain
    // origin: 'https://myapp.com'
    // origin: ['https://myapp.com', 'https://admin.myapp.com']
  },

  // ─────────────────────────────────────────────────────────────
  // LOGGING
  // ─────────────────────────────────────────────────────────────
  logging: {
    level: "info", // 'silent' | 'error' | 'warn' | 'info' | 'http' | 'debug'
    format: "combined", // morgan format: 'combined' | 'dev' | 'short' | 'tiny'
  },

  // ─────────────────────────────────────────────────────────────
  // REGISTER SERVICES — Available in hooks and custom routes
  // ─────────────────────────────────────────────────────────────
  services: [notifyService, auditService],

  // ═══════════════════════════════════════════════════════════════
  // STEP 3 — MODEL DEFINITIONS
  //
  // This is the ONLY backend code developers write.
  // Every model below auto-generates:
  //   • Database table/collection
  //   • ORM model
  //   • Input validation rules
  //   • Full CRUD REST endpoints
  //   • Role-based access control per operation
  //   • XSS sanitization
  //   • Pagination, sorting, filtering on GET /collection
  // ═══════════════════════════════════════════════════════════════
  models: [
    // ───────────────────────────────────────────────────────────
    // MODEL 1: User — auth:true makes this the authentication model
    //
    // Auto-generates these EXTRA endpoints because auth:true:
    //   POST /api/v1/auth/register   → hash password, return JWT
    //   POST /api/v1/auth/login      → verify password, return JWT
    //   POST /api/v1/auth/logout     → (token invalidation hook point)
    //   GET  /api/v1/auth/me         → return current user from token
    //
    // Plus standard CRUD:
    //   GET    /api/v1/users         → list users (admin only)
    //   GET    /api/v1/users/:id     → get one user (admin only)
    //   PUT    /api/v1/users/:id     → update user (owner or admin)
    //   DELETE /api/v1/users/:id     → delete user (admin only)
    // ───────────────────────────────────────────────────────────
    {
      name: "User",
      auth: true, // ← Activates auth endpoint generation

      schema: {
        // field: { type, required, unique, minLength, maxLength, enum, default, private }
        name: {
          type: "String",
          required: true,
          minLength: 2,
          maxLength: 80,
        },
        email: {
          type: "String",
          required: true,
          unique: true,
          // The validation engine auto-detects 'email' field name
          // and applies isEmail() + normalizeEmail() automatically
        },
        password: {
          type: "String",
          required: true,
          private: true, // ← NEVER returned in any API response
          // The validation engine auto-detects 'password' field
          // and applies minLength(6) automatically
          // bcrypt hashing is applied automatically on register
        },
        role: {
          type: "String",
          default: "user",
          enum: ["user", "admin"], // Validated automatically
        },
        bio: {
          type: "String",
          maxLength: 500, // Validated automatically
        },
        phone: {
          type: "String",
          maxLength: 20,
        },
      },

      timestamps: true, // Adds createdAt + updatedAt automatically

      // Per-operation role access control
      // '*' = public (no token required)
      // Named roles = token required + role must match
      // 'owner' = token required + document must belong to req.user
      roles: {
        create: ["*"], // Anyone can register (handled via /auth/register)
        read: ["admin"], // Only admins can list/get users
        update: ["owner", "admin"], // User can update themselves; admin can update anyone
        delete: ["admin"], // Only admin can delete users
      },
    },

    // ───────────────────────────────────────────────────────────
    // MODEL 2: Product
    //
    // Auto-generates:
    //   GET    /api/v1/products         → public product listing (paginated)
    //   GET    /api/v1/products/:id     → public single product
    //   POST   /api/v1/products         → create product (admin only)
    //   PUT    /api/v1/products/:id     → update product (admin only)
    //   DELETE /api/v1/products/:id     → delete product (admin only)
    // ───────────────────────────────────────────────────────────
    {
      name: "Product",

      schema: {
        title: {
          type: "String",
          required: true,
          minLength: 2,
          maxLength: 120,
        },
        description: {
          type: "String",
          maxLength: 2000,
        },
        price: {
          type: "Number",
          required: true,
          min: 0, // Validated automatically
        },
        stock: {
          type: "Number",
          default: 0,
          min: 0,
        },
        category: {
          type: "String",
          enum: ["electronics", "clothing", "food", "other"],
          default: "other",
        },
        sku: {
          type: "String",
          maxLength: 50,
        },
        active: {
          type: "Boolean",
          default: true,
        },
        costPrice: {
          type: "Number",
          min: 0,
          private: true, // Internal field — never exposed in API responses
        },
      },

      timestamps: true,

      roles: {
        create: ["admin"],
        read: ["*"], // Public — no token needed to browse products
        update: ["admin"],
        delete: ["admin"],
      },
    },

    // ───────────────────────────────────────────────────────────
    // MODEL 3: Post — user-generated content with owner permissions
    //
    // Auto-generates:
    //   GET    /api/v1/posts         → public feed (paginated)
    //   GET    /api/v1/posts/:id     → public single post
    //   POST   /api/v1/posts         → create post (logged-in users)
    //   PUT    /api/v1/posts/:id     → update post (owner or admin)
    //   DELETE /api/v1/posts/:id     → delete post (owner or admin)
    // ───────────────────────────────────────────────────────────
    {
      name: "Post",

      schema: {
        title: {
          type: "String",
          required: true,
          minLength: 3,
          maxLength: 200,
        },
        body: {
          type: "String",
          required: true,
        },
        status: {
          type: "String",
          enum: ["draft", "published", "archived"],
          default: "draft",
        },
        views: {
          type: "Number",
          default: 0,
        },
        tags: {
          type: "String", // Comma-separated or JSON string in SQLite/PG
          maxLength: 500,
        },
      },

      timestamps: true,

      roles: {
        create: ["user", "admin"],
        read: ["*"],
        update: ["owner", "admin"],
        delete: ["owner", "admin"],
      },
    },

    // ───────────────────────────────────────────────────────────
    // MODEL 4: Order — restricted access example
    //
    // Auto-generates:
    //   GET    /api/v1/orders         → list orders (admin only)
    //   GET    /api/v1/orders/:id     → get order (owner or admin)
    //   POST   /api/v1/orders         → place order (logged-in users)
    //   PUT    /api/v1/orders/:id     → update order (admin only)
    //   DELETE /api/v1/orders/:id     → cancel order (admin only)
    // ───────────────────────────────────────────────────────────
    {
      name: "Order",

      schema: {
        productId: {
          type: "String",
          required: true,
        },
        quantity: {
          type: "Number",
          required: true,
          min: 1,
        },
        totalPrice: {
          type: "Number",
          required: true,
          min: 0,
        },
        status: {
          type: "String",
          enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
          default: "pending",
        },
        shippingAddress: {
          type: "String",
          required: true,
          maxLength: 500,
        },
        internalNotes: {
          type: "String",
          private: true, // Admins only — never returned to customers
        },
      },

      timestamps: true,

      roles: {
        create: ["user", "admin"],
        read: ["owner", "admin"],
        update: ["admin"],
        delete: ["admin"],
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // STEP 4 — LIFECYCLE HOOKS
  //
  // Hooks fire at specific points in the CRUD lifecycle.
  // Hook name format: '<modelname_lowercase>.<event>'
  //
  // Available events:
  //   beforeCreate(data, req)              → mutate/validate data before insert
  //   afterCreate(doc, { req, services })  → side-effects after insert
  //   beforeUpdate(data, req)              → mutate data before update
  //   afterUpdate(doc, { req, services })  → side-effects after update
  //   beforeDelete(doc, req)               → guard or log before delete
  //   afterDelete(doc, { req, services })  → cleanup after delete
  // ═══════════════════════════════════════════════════════════════
  hooks: {
    // Fires after a new User is inserted into the database
    "user.afterCreate": async (user, { req, services }) => {
      await services.notify.send(
        user,
        "Welcome! Your account has been created.",
      );
      await services.audit.log("USER_REGISTERED", user.email, "User");
    },

    // Fires after a User document is updated
    "user.afterUpdate": async (user, { req, services }) => {
      await services.audit.log(
        "USER_UPDATED",
        user.email,
        `User#${user.id || user._id}`,
      );
    },

    // Fires before a new Product is inserted
    // Return value merges into the data being saved
    "product.beforeCreate": async (data, req) => {
      // Auto-generate SKU if not provided
      if (!data.sku) {
        data.sku = `SKU-${Date.now()}`;
      }
      return data;
    },

    // Fires after an Order is created — good place to send confirmation
    "order.afterCreate": async (order, { req, services }) => {
      await services.notify.send(
        { email: req.user?.email || "unknown" },
        `Order #${order.id || order._id} placed. Status: ${order.status}`,
      );
      await services.audit.log(
        "ORDER_PLACED",
        req.user?.id || "guest",
        `Order#${order.id || order._id}`,
      );
    },

    // Fires before an Order is deleted — use to guard against deletion
    "order.beforeDelete": async (order, req) => {
      if (order.status === "shipped") {
        throw new Error("Cannot delete an order that has already shipped");
      }
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // STEP 5 — CUSTOM ROUTES
  //
  // For endpoints that don't fit the standard CRUD pattern.
  // These are appended to the Express router after auto-generated routes.
  // req.db, req.models, req.services, req.user are all available.
  // ═══════════════════════════════════════════════════════════════
  routes: [
    // Admin dashboard stats — requires admin JWT
    {
      method: "GET",
      path: "/api/v1/admin/stats",
      roles: ["admin"],
      handler: async (req, res) => {
        const [userCount, productCount, orderCount] = await Promise.all([
          req.db.count("User"),
          req.db.count("Product"),
          req.db.count("Order"),
        ]);
        res.json({
          success: true,
          data: {
            users: userCount,
            products: productCount,
            orders: orderCount,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
          },
        });
      },
    },

    // Public product search by category — no auth required
    {
      method: "GET",
      path: "/api/v1/products/search",
      roles: [], // empty = public
      handler: async (req, res) => {
        const { category, minPrice, maxPrice } = req.query;
        const model = req.models.get("Product");

        // Build filter (works across all 3 database adapters)
        const filter = { active: true };
        if (category) filter.category = category;

        let results = await model.find(filter);

        // Additional in-memory filtering for price range
        if (minPrice)
          results = results.filter((p) => p.price >= parseFloat(minPrice));
        if (maxPrice)
          results = results.filter((p) => p.price <= parseFloat(maxPrice));

        res.json({ success: true, data: results, total: results.length });
      },
    },

    // User changes their own password — requires auth
    {
      method: "POST",
      path: "/api/v1/auth/change-password",
      roles: ["user", "admin"],
      handler: async (req, res, next) => {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
          return res.status(422).json({
            success: false,
            message: "currentPassword and newPassword required",
          });
        }
        if (newPassword.length < 6) {
          return res.status(422).json({
            success: false,
            message: "newPassword must be at least 6 characters",
          });
        }

        try {
          const bcrypt = await import("bcryptjs");
          const model = req.models.get("User");

          let user;
          if (typeof model.findById === "function") {
            user = await model.findById(req.user.id);
          } else {
            user = await model.findOne({ id: req.user.id });
          }

          const userObj =
            typeof user.toObject === "function" ? user.toObject() : user;
          const match = await bcrypt.default.compare(
            currentPassword,
            userObj.password,
          );
          if (!match) {
            return res.status(401).json({
              success: false,
              message: "Current password is incorrect",
            });
          }

          const hashed = await bcrypt.default.hash(newPassword, 10);
          await model.findByIdAndUpdate(
            req.user.id,
            { $set: { password: hashed } },
            { new: true },
          );

          res.json({ success: true, message: "Password updated successfully" });
        } catch (err) {
          next(err);
        }
      },
    },
  ],
});

// ═══════════════════════════════════════════════════════════════
// STEP 6 — START THE SERVER
// ═══════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`\n🚀  Server running → http://localhost:${PORT}`);
  console.log(`\n── AUTO-GENERATED AUTH ENDPOINTS ──────────────────────`);
  console.log(`  POST   http://localhost:${PORT}/api/v1/auth/register`);
  console.log(`  POST   http://localhost:${PORT}/api/v1/auth/login`);
  console.log(
    `  POST   http://localhost:${PORT}/api/v1/auth/logout        [JWT]`,
  );
  console.log(
    `  GET    http://localhost:${PORT}/api/v1/auth/me             [JWT]`,
  );
  console.log(
    `  POST   http://localhost:${PORT}/api/v1/auth/change-password [JWT]`,
  );
  console.log(`\n── AUTO-GENERATED USER ENDPOINTS ──────────────────────`);
  console.log(
    `  GET    http://localhost:${PORT}/api/v1/users               [admin]`,
  );
  console.log(
    `  GET    http://localhost:${PORT}/api/v1/users/:id           [admin]`,
  );
  console.log(
    `  PUT    http://localhost:${PORT}/api/v1/users/:id           [owner|admin]`,
  );
  console.log(
    `  DELETE http://localhost:${PORT}/api/v1/users/:id           [admin]`,
  );
  console.log(`\n── AUTO-GENERATED PRODUCT ENDPOINTS ───────────────────`);
  console.log(
    `  GET    http://localhost:${PORT}/api/v1/products            [public]`,
  );
  console.log(
    `  GET    http://localhost:${PORT}/api/v1/products/:id        [public]`,
  );
  console.log(
    `  GET    http://localhost:${PORT}/api/v1/products/search     [public]`,
  );
  console.log(
    `  POST   http://localhost:${PORT}/api/v1/products            [admin]`,
  );
  console.log(
    `  PUT    http://localhost:${PORT}/api/v1/products/:id        [admin]`,
  );
  console.log(
    `  DELETE http://localhost:${PORT}/api/v1/products/:id        [admin]`,
  );
  console.log(`\n── AUTO-GENERATED POST ENDPOINTS ──────────────────────`);
  console.log(
    `  GET    http://localhost:${PORT}/api/v1/posts               [public]`,
  );
  console.log(
    `  GET    http://localhost:${PORT}/api/v1/posts/:id           [public]`,
  );
  console.log(
    `  POST   http://localhost:${PORT}/api/v1/posts               [user|admin]`,
  );
  console.log(
    `  PUT    http://localhost:${PORT}/api/v1/posts/:id           [owner|admin]`,
  );
  console.log(
    `  DELETE http://localhost:${PORT}/api/v1/posts/:id           [owner|admin]`,
  );
  console.log(`\n── AUTO-GENERATED ORDER ENDPOINTS ─────────────────────`);
  console.log(
    `  GET    http://localhost:${PORT}/api/v1/orders              [admin]`,
  );
  console.log(
    `  GET    http://localhost:${PORT}/api/v1/orders/:id          [owner|admin]`,
  );
  console.log(
    `  POST   http://localhost:${PORT}/api/v1/orders              [user|admin]`,
  );
  console.log(
    `  PUT    http://localhost:${PORT}/api/v1/orders/:id          [admin]`,
  );
  console.log(
    `  DELETE http://localhost:${PORT}/api/v1/orders/:id          [admin]`,
  );
  console.log(`\n── CUSTOM ROUTES ───────────────────────────────────────`);
  console.log(
    `  GET    http://localhost:${PORT}/api/v1/admin/stats         [admin]`,
  );
  console.log(`\n── SYSTEM ──────────────────────────────────────────────`);
  console.log(
    `  GET    http://localhost:${PORT}/health                     [public]`,
  );
  console.log(`\n────────────────────────────────────────────────────────\n`);
});

// Signal to gracefulShutdown utility that the server is live
app.emit("listening", server);
