import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export class SQLiteAdapter {
  constructor(config) {
    this.config = config;
    this.db = null;
    this.models = {};
    this.tableDefs = {};
  }

  async connect() {
    const Database = require('better-sqlite3');
    this.db = new Database(this.config.filename || ':memory:');
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  async disconnect() {
    if (this.db) this.db.close();
  }

  buildModel(name, schemaDef, options = {}) {
    const tableName = name.toLowerCase() + 's';
    this.tableDefs[name] = { tableName, schemaDef, options };
    this._ensureTable(tableName, schemaDef);

    const self = this;
    const proxy = {
      _name: name,
      find: (q) => self._find(tableName, q),
      findOne: (q) => self._findOne(tableName, q),
      findById: (id) => self._findOne(tableName, { id }),
      create: (data) => self._insert(tableName, data),
      findByIdAndUpdate: (id, data, opts) => self._update(tableName, id, data, opts),
      findByIdAndDelete: (id) => self._delete(tableName, id),
      countDocuments: (q) => self._count(tableName, q)
    };

    this.models[name] = proxy;
    return proxy;
  }

  _ensureTable(tableName, schemaDef) {
    const cols = ['id INTEGER PRIMARY KEY AUTOINCREMENT', 'created_at TEXT DEFAULT (datetime(\'now\'))', 'updated_at TEXT DEFAULT (datetime(\'now\'))'];
    for (const [field, def] of Object.entries(schemaDef)) {
      if (field === '_id' || field === 'id') continue;
      cols.push(`${field} ${this._sqliteType(def)}`);
    }
    this.db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (${cols.join(', ')})`);
  }

  _sqliteType(def) {
    const t = typeof def === 'string' ? def : def.type;
    switch (t) {
      case 'Number': return 'REAL';
      case 'Boolean': return 'INTEGER';
      default: return 'TEXT';
    }
  }

  _find(tableName, query = {}) {
    const { where, values } = this._buildWhere(query);
    const stmt = this.db.prepare(`SELECT * FROM ${tableName} ${where}`);
    return stmt.all(...values);
  }

  _findOne(tableName, query = {}) {
    const { where, values } = this._buildWhere(query);
    const stmt = this.db.prepare(`SELECT * FROM ${tableName} ${where} LIMIT 1`);
    return stmt.get(...values) || null;
  }

  _insert(tableName, data) {
    const keys = Object.keys(data);
    const vals = Object.values(data);
    const placeholders = keys.map(() => '?');
    const stmt = this.db.prepare(`INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`);
    return stmt.get(...vals);
  }

  _update(tableName, id, data, opts = {}) {
    const updateData = data.$set || data;
    const sets = Object.keys(updateData).map(k => `${k} = ?`);
    sets.push(`updated_at = datetime('now')`);
    const vals = [...Object.values(updateData), id];
    const stmt = this.db.prepare(`UPDATE ${tableName} SET ${sets.join(',')} WHERE id = ? RETURNING *`);
    return stmt.get(...vals);
  }

  _delete(tableName, id) {
    const stmt = this.db.prepare(`DELETE FROM ${tableName} WHERE id = ? RETURNING *`);
    return stmt.get(id);
  }

  _count(tableName, query = {}) {
    const { where, values } = this._buildWhere(query);
    const stmt = this.db.prepare(`SELECT COUNT(*) as cnt FROM ${tableName} ${where}`);
    const row = stmt.get(...values);
    return row?.cnt || 0;
  }

  _buildWhere(query) {
    if (!query || !Object.keys(query).length) return { where: '', values: [] };
    const conditions = [];
    const values = [];
    for (const [k, v] of Object.entries(query)) {
      conditions.push(`${k} = ?`);
      values.push(v);
    }
    return { where: `WHERE ${conditions.join(' AND ')}`, values };
  }

  getModel(name) {
    return this.models[name];
  }

  count(modelName, query = {}) {
    const def = this.tableDefs[modelName];
    if (!def) return 0;
    return this._count(def.tableName, query);
  }
}
