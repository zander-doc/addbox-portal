// ===============================================
//   NEON POSTGRESQL CLIENT — ADDBOX
//   Conexión directa a Neon via HTTP (REST)
//   Reemplaza completamente a Supabase
// ===============================================

import { config } from '../config/env.js';

const NEON_CONFIG = {
  databaseUrl: config.neonUrl,
  apiKey: ''
};

/**
 * Ejecuta una consulta SQL directamente contra Neon
 * @param {string} text - Consulta SQL con placeholders $1, $2, etc.
 * @param {any[]} params - Parámetros para la consulta
 * @returns {Promise<Array>} - Array de resultados
 */
export async function query(text, params = []) {
  if (!NEON_CONFIG.databaseUrl) {
    throw new Error('NEON_DATABASE_URL no configurada. Configúrala en Neon Dashboard.');
  }

  try {
    const response = await fetch(NEON_CONFIG.databaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(NEON_CONFIG.apiKey ? { 'Authorization': `Bearer ${NEON_CONFIG.apiKey}` } : {})
      },
      body: JSON.stringify({
        query: text,
        params: params
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Neon error (${response.status}): ${errorBody}`);
    }

    const result = await response.json();
    return result.rows || result;
  } catch (error) {
    console.error('❌ Neon query error:', error);
    throw error;
  }
}

/**
 * Ejecuta múltiples consultas en una transacción
 * @param {Array<{text: string, params?: any[]}>} queries
 * @returns {Promise<Array>}
 */
export async function transaction(queries) {
  if (!NEON_CONFIG.databaseUrl) {
    throw new Error('NEON_DATABASE_URL no configurada');
  }

  try {
    const response = await fetch(NEON_CONFIG.databaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(NEON_CONFIG.apiKey ? { 'Authorization': `Bearer ${NEON_CONFIG.apiKey}` } : {})
      },
      body: JSON.stringify({
        transaction: queries.map(q => ({
          query: q.text,
          params: q.params || []
        }))
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Neon transaction error (${response.status}): ${errorBody}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Neon transaction error:', error);
    throw error;
  }
}

/**
 * Obtiene el usuario actual de la sesión (Clerk)
 * @returns {object|null}
 */
export function getCurrentUser() {
  if (window.Clerk && window.Clerk.user) {
    return {
      id: window.Clerk.user.id,
      email: window.Clerk.user.primaryEmailAddress?.emailAddress,
      nombre: window.Clerk.user.fullName || window.Clerk.user.username,
      rol: window.Clerk.user.publicMetadata?.rol || 'usuario'
    };
  }
  return null;
}

/**
 * Verifica si hay una sesión activa
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!(window.Clerk && window.Clerk.user);
}

// ===============================================
//   COMPATIBILITY LAYER — Reemplaza a Supabase
//   Permite usar db.from('tabla').select() como antes
// ===============================================

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this._select = '*';
    this._filters = [];
    this._orderBy = null;
    this._orderAsc = true;
    this._limit = null;
    this._offset = null;
    this._count = null;
    this._single = false;
    this._head = false;
  }

  select(columns, opts = {}) {
    this._select = columns;
    this._count = opts.count || null;
    this._head = opts.head || false;
    return this;
  }

  eq(column, value) {
    this._filters.push({ op: 'eq', column, value });
    return this;
  }

  neq(column, value) {
    this._filters.push({ op: 'neq', column, value });
    return this;
  }

  gt(column, value) {
    this._filters.push({ op: 'gt', column, value });
    return this;
  }

  gte(column, value) {
    this._filters.push({ op: 'gte', column, value });
    return this;
  }

  lt(column, value) {
    this._filters.push({ op: 'lt', column, value });
    return this;
  }

  lte(column, value) {
    this._filters.push({ op: 'lte', column, value });
    return this;
  }

  like(column, value) {
    this._filters.push({ op: 'like', column, value });
    return this;
  }

  ilike(column, value) {
    this._filters.push({ op: 'ilike', column, value });
    return this;
  }

  is(column, value) {
    this._filters.push({ op: 'is', column, value });
    return this;
  }

  in(column, values) {
    this._filters.push({ op: 'in', column, values });
    return this;
  }

  order(column, opts = {}) {
    this._orderBy = column;
    this._orderAsc = opts.ascending !== false;
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  range(start, end) {
    this._offset = start;
    this._limit = end - start + 1;
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  /**
   * Construye y ejecuta la consulta SQL
   */
  async _execute() {
    let sql = `SELECT ${this._select === '*' ? '*' : this._select}`;
    const params = [];
    let paramIndex = 1;

    if (this._count === 'exact') {
      sql = `SELECT COUNT(*) as count FROM ${this.table}`;
    }

    sql += ` FROM ${this.table}`;

    // WHERE clause
    if (this._filters.length > 0) {
      const conditions = this._filters.map(f => {
        const p = `$${paramIndex++}`;
        switch (f.op) {
          case 'eq': params.push(f.value); return `${f.column} = ${p}`;
          case 'neq': params.push(f.value); return `${f.column} != ${p}`;
          case 'gt': params.push(f.value); return `${f.column} > ${p}`;
          case 'gte': params.push(f.value); return `${f.column} >= ${p}`;
          case 'lt': params.push(f.value); return `${f.column} < ${p}`;
          case 'lte': params.push(f.value); return `${f.column} <= ${p}`;
          case 'like': params.push(f.value); return `${f.column} LIKE ${p}`;
          case 'ilike': params.push(f.value); return `${f.column} ILIKE ${p}`;
          case 'is': params.push(f.value); return `${f.column} IS ${f.value === null ? 'NULL' : p}`;
          case 'in': return `${f.column} = ANY($${paramIndex - 1})`;
          default: return '';
        }
      }).filter(Boolean).join(' AND ');
      sql += ` WHERE ${conditions}`;
    }

    // ORDER BY
    if (this._orderBy) {
      sql += ` ORDER BY ${this._orderBy} ${this._orderAsc ? 'ASC' : 'DESC'}`;
    }

    // LIMIT
    if (this._limit) {
      sql += ` LIMIT ${this._limit}`;
    }

    // OFFSET
    if (this._offset) {
      sql += ` OFFSET ${this._offset}`;
    }

    try {
      const rows = await query(sql, params);

      if (this._count === 'exact') {
        return { data: null, count: parseInt(rows[0]?.count || 0), error: null };
      }

      if (this._head) {
        return { data: null, count: rows.length, error: null };
      }

      if (this._single) {
        return { data: rows[0] || null, error: null };
      }

      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }

  catch(reject) {
    return this._execute().catch(reject);
  }
}

class InsertBuilder {
  constructor(table, values) {
    this.table = table;
    this.values = Array.isArray(values) ? values : [values];
  }

  async _execute() {
    if (this.values.length === 0) return { data: null, error: new Error('No values to insert') };

    const columns = Object.keys(this.values[0]);
    const placeholders = this.values.map((_, i) => 
      `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
    ).join(', ');

    const params = this.values.flatMap(v => columns.map(c => v[c]));

    const sql = `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES ${placeholders} RETURNING *`;

    try {
      const rows = await query(sql, params);
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }
}

class UpdateBuilder {
  constructor(table) {
    this.table = table;
    this._values = {};
    this._filters = [];
  }

  set(values) {
    this._values = { ...this._values, ...values };
    return this;
  }

  eq(column, value) {
    this._filters.push({ column, value });
    return this;
  }

  async _execute() {
    const columns = Object.keys(this._values);
    if (columns.length === 0) return { data: null, error: new Error('No values to update') };

    const setClauses = columns.map((c, i) => `${c} = $${i + 1}`);
    const params = columns.map(c => this._values[c]);
    let paramIndex = columns.length + 1;

    let sql = `UPDATE ${this.table} SET ${setClauses.join(', ')}`;

    if (this._filters.length > 0) {
      const conditions = this._filters.map(f => {
        const p = `$${paramIndex++}`;
        params.push(f.value);
        return `${f.column} = ${p}`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' RETURNING *';

    try {
      const rows = await query(sql, params);
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }
}

class DeleteBuilder {
  constructor(table) {
    this.table = table;
    this._filters = [];
  }

  eq(column, value) {
    this._filters.push({ column, value });
    return this;
  }

  async _execute() {
    let sql = `DELETE FROM ${this.table}`;
    const params = [];

    if (this._filters.length > 0) {
      const conditions = this._filters.map((f, i) => {
        params.push(f.value);
        return `${f.column} = $${i + 1}`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' RETURNING *';

    try {
      const rows = await query(sql, params);
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }
}

class RpcBuilder {
  constructor(name, params) {
    this.name = name;
    this.params = params || {};
  }

  async _execute() {
    // RPC functions are stored as PostgreSQL functions
    const paramNames = Object.keys(this.params);
    const paramValues = paramNames.map(k => this.params[k]);
    const paramPlaceholders = paramNames.map((k, i) => `$${i + 1}`).join(', ');

    const sql = `SELECT * FROM ${this.name}(${paramPlaceholders})`;

    try {
      const rows = await query(sql, paramValues);
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }
}

// ===============================================
//   DB INTERFACE — Reemplaza a window.supabase
//   Uso: db.from('tabla').select('*').eq('id', 1)
// ===============================================

export const db = {
  from(table) {
    return {
      select: (columns, opts) => new QueryBuilder(table).select(columns, opts),
      insert: (values) => new InsertBuilder(table, values),
      update: (values) => new UpdateBuilder(table).set(values),
      delete: () => new DeleteBuilder(table),
      upsert: (values) => {
        // Upsert implementation
        const builder = new InsertBuilder(table, values);
        builder._upsert = true;
        return builder;
      }
    };
  },

  rpc(name, params) {
    return new RpcBuilder(name, params);
  },

  auth: {
    user: () => getCurrentUser(),
    session: () => window.Clerk?.session ? { user: window.Clerk.user } : null,
    signIn: async ({ email, password }) => {
      try {
        if (window.Clerk) {
          const result = await window.Clerk.client.signIn.create({
            identifier: email,
            password
          });
          return { data: { user: result.createdUserId ? { id: result.createdUserId } : null }, error: null };
        }
        return { data: null, error: new Error('Clerk no está disponible') };
      } catch (error) {
        return { data: null, error };
      }
    },
    signUp: async ({ email, password, options }) => {
      try {
        if (window.Clerk) {
          const result = await window.Clerk.client.signUp.create({
            emailAddress: email,
            password,
            ...(options?.data ? { publicMetadata: options.data } : {})
          });
          return { data: { user: { id: result.createdUserId } }, error: null };
        }
        return { data: null, error: new Error('Clerk no está disponible') };
      } catch (error) {
        return { data: null, error };
      }
    },
    getSession: async () => {
      if (window.Clerk?.session) {
        return { data: { session: { user: window.Clerk.user } }, error: null };
      }
      return { data: { session: null }, error: null };
    },
    onAuthStateChange: (callback) => {
      if (window.Clerk) {
        window.Clerk.addListener((payload) => {
          callback('SIGNED_IN', payload.session ? { user: window.Clerk.user } : null);
        });
      }
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signOut: async () => {
      if (window.Clerk) {
        await window.Clerk.signOut();
      }
    },
    resetPasswordForEmail: async (email) => {
      if (window.Clerk) {
        await window.Clerk.client.signIn.create({
          strategy: 'reset_password_email',
          identifier: email
        });
      }
    }
  },

  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: new Error('Storage not implemented in Neon migration') }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      list: async () => ({ data: [], error: null }),
      remove: async () => ({ data: null, error: null })
    })
  }
};

// ===============================================
//   INICIALIZACIÓN
// ===============================================

/**
 * Configura la conexión a Neon
 * @param {string} databaseUrl - URL de conexión de Neon
 * @param {string} apiKey - API Key de Neon (opcional)
 */
export function configureNeon(databaseUrl, apiKey = '') {
  NEON_CONFIG.databaseUrl = databaseUrl;
  NEON_CONFIG.apiKey = apiKey;
  localStorage.setItem('NEON_DATABASE_URL', databaseUrl);
  if (apiKey) localStorage.setItem('NEON_API_KEY', apiKey);
  console.log('✅ Neon configurado correctamente');
}

/**
 * Verifica la conexión a Neon
 * @returns {Promise<{ok: boolean, message: string}>}
 */
export async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time, version() as version');
    return {
      ok: true,
      message: `Conectado a Neon PostgreSQL. Servidor: ${result[0]?.version?.split(',')[0] || 'desconocido'}`
    };
  } catch (error) {
    return {
      ok: false,
      message: `Error de conexión: ${error.message}`
    };
  }
}

// Compatibilidad global
window.db = db;
window.neonQuery = query;
window.configureNeon = configureNeon;

console.log('✅ neon-client.js cargado. Usa db.from("tabla").select() como antes.');