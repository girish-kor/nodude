import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const DEFAULTS = {
  port: 3000,
  apiPrefix: '/api/v1',
  apiVersion: 'v1',
  database: { type: 'mongodb', uri: 'mongodb://localhost:27017/autobackend' },
  auth: {
    secret: 'change-me-in-production',
    expiresIn: '7d',
    refreshEnabled: false,
    refreshExpiresIn: '30d',
    saltRounds: 10
  },
  rateLimit: { windowMs: 15 * 60 * 1000, max: 100 },
  cors: { origin: '*' },
  logging: { level: 'info', format: 'combined' },
  models: [],
  plugins: [],
  routes: [],
  services: [],
  hooks: {}
};

export function loadConfig(userConfig = {}) {
  const envOverrides = extractEnvConfig();
  return deepMerge(DEFAULTS, envOverrides, userConfig);
}

function extractEnvConfig() {
  const cfg = {};
  if (process.env.PORT) cfg.port = parseInt(process.env.PORT, 10);
  if (process.env.API_PREFIX) cfg.apiPrefix = process.env.API_PREFIX;
  if (process.env.JWT_SECRET) cfg.auth = { ...cfg.auth, secret: process.env.JWT_SECRET };
  if (process.env.JWT_EXPIRES_IN) cfg.auth = { ...cfg.auth, expiresIn: process.env.JWT_EXPIRES_IN };
  if (process.env.MONGO_URI) cfg.database = { type: 'mongodb', uri: process.env.MONGO_URI };
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
    cfg.database = { type: 'postgresql', uri: process.env.DATABASE_URL };
  }
  if (process.env.SQLITE_FILE) cfg.database = { type: 'sqlite', filename: process.env.SQLITE_FILE };
  if (process.env.RATE_LIMIT_MAX) cfg.rateLimit = { ...cfg.rateLimit, max: parseInt(process.env.RATE_LIMIT_MAX, 10) };
  if (process.env.LOG_LEVEL) cfg.logging = { level: process.env.LOG_LEVEL };
  return cfg;
}

function deepMerge(...sources) {
  const out = {};
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;
    for (const [k, v] of Object.entries(src)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object') {
        out[k] = deepMerge(out[k], v);
      } else {
        out[k] = v;
      }
    }
  }
  return out;
}
