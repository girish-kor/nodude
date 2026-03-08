import { MongoAdapter } from './adapters/mongoAdapter.js';
import { PostgresAdapter } from './adapters/postgresAdapter.js';
import { SQLiteAdapter } from './adapters/sqliteAdapter.js';
import { logger } from '../utils/logger.js';

export class DatabaseManager {
  constructor(config) {
    this.config = config;
    this.adapter = this._createAdapter(config);
    this.status = 'disconnected';
  }

  _createAdapter(config) {
    switch (config?.type) {
      case 'postgresql':
      case 'postgres':
        return new PostgresAdapter(config);
      case 'sqlite':
        return new SQLiteAdapter(config);
      case 'mongodb':
      default:
        return new MongoAdapter(config);
    }
  }

  async connect() {
    try {
      await this.adapter.connect();
      this.status = 'connected';
      logger.info(`Database connected [${this.config?.type || 'mongodb'}]`);
    } catch (err) {
      logger.error('Database connection failed:', err.message);
      throw err;
    }
  }

  async disconnect() {
    await this.adapter.disconnect();
    this.status = 'disconnected';
  }

  getAdapter() {
    return this.adapter;
  }

  isConnected() {
    return this.status === 'connected';
  }

  async count(modelName, query = {}) {
    return this.adapter.count(modelName, query);
  }
}
