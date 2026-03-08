import pg from 'pg';
const { Pool } = pg;

export class PostgresAdapter {
  constructor(config) {
    this.config = config;
    this.pool = null;
    this.models = {};
    this.tableDefs = {};
  }

  async connect() {
    const connConfig = this.config.uri
      ? { connectionString: this.config.uri }
      : {
          host: this.config.host || 'localhost',
          port: this.config.port || 5432,
          user: this.config.user,
          password: this.config.password,
          database: this.config.database
        };
    this.pool = new Pool(connConfig);
    await this.pool.query('SELECT 1');
  }

  async disconnect() {
    if (this.pool) await this.pool.end();
  }

  buildModel(name, schemaDef, options = {}) {
    const tableName = name.toLowerCase() + 's';
    this.tableDefs[name] = { tableName, schemaDef, options };

    const proxy = {
      _name: name,
      _adapter: this,
      find: (q) => this._find(tableName, q),
      findOne: (q) => this._findOne(tableName, q),
      findById: (id) => this._findOne(tableName, { id }),
      create: (data) => this._insert(tableName, schemaDef, data),
      findByIdAndUpdate: (id, data, opts) => this._update(tableName, id, data, opts),
      findByIdAndDelete: (id) => this._delete(tableName, id),
      countDocuments: (q) => this._count(tableName, q)
    };

    this.models[name] = proxy;
    this._ensureTable(tableName, schemaDef).catch(() => {});
    return proxy;
  }

  async _ensureTable(tableName, schemaDef) {
    const cols = ['id SERIAL PRIMARY KEY', 'created_at TIMESTAMPTZ DEFAULT NOW()', 'updated_at TIMESTAMPTZ DEFAULT NOW()'];
    for (const [field, def] of Object.entries(schemaDef)) {
      if (field === '_id' || field === 'id') continue;
      cols.push(`${field} ${this._pgType(def)}`);
    }
    await this.pool.query(`CREATE TABLE IF NOT EXISTS ${tableName} (${cols.join(', ')})`);
  }

  _pgType(def) {
    const t = typeof def === 'string' ? def : def.type;
    switch (t) {
      case 'Number': return 'NUMERIC';
      case 'Boolean': return 'BOOLEAN';
      case 'Date': return 'TIMESTAMPTZ';
      default: return 'TEXT';
    }
  }

  async _find(tableName, query = {}) {
    const { where, values } = this._buildWhere(query);
    const res = await this.pool.query(`SELECT * FROM ${tableName} ${where}`, values);
    return res.rows;
  }

  async _findOne(tableName, query = {}) {
    const { where, values } = this._buildWhere(query);
    const res = await this.pool.query(`SELECT * FROM ${tableName} ${where} LIMIT 1`, values);
    return res.rows[0] || null;
  }

  async _insert(tableName, schemaDef, data) {
    const keys = Object.keys(data);
    const vals = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`);
    const res = await this.pool.query(
      `INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      vals
    );
    return res.rows[0];
  }

  async _update(tableName, id, data, opts = {}) {
    const updates = [];
    const vals = [];
    let i = 1;
    const updateData = data.$set || data;
    for (const [k, v] of Object.entries(updateData)) {
      updates.push(`${k} = $${i++}`);
      vals.push(v);
    }
    updates.push(`updated_at = NOW()`);
    vals.push(id);
    const res = await this.pool.query(
      `UPDATE ${tableName} SET ${updates.join(',')} WHERE id = $${i} RETURNING *`,
      vals
    );
    return opts?.new !== false ? res.rows[0] : res.rows[0];
  }

  async _delete(tableName, id) {
    const res = await this.pool.query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING *`, [id]);
    return res.rows[0];
  }

  async _count(tableName, query = {}) {
    const { where, values } = this._buildWhere(query);
    const res = await this.pool.query(`SELECT COUNT(*) FROM ${tableName} ${where}`, values);
    return parseInt(res.rows[0].count, 10);
  }

  _buildWhere(query) {
    if (!query || !Object.keys(query).length) return { where: '', values: [] };
    const conditions = [];
    const values = [];
    let i = 1;
    for (const [k, v] of Object.entries(query)) {
      conditions.push(`${k} = $${i++}`);
      values.push(v);
    }
    return { where: `WHERE ${conditions.join(' AND ')}`, values };
  }

  getModel(name) {
    return this.models[name];
  }

  async count(modelName, query = {}) {
    const def = this.tableDefs[modelName];
    if (!def) return 0;
    return this._count(def.tableName, query);
  }
}
