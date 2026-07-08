/* ============================================================
CLIENTES SERVICE — ADDBOX
Consultas SQL directas a Neon PostgreSQL
============================================================ */

import { query } from '../../services/neon-client.js';
import { TABLES } from '../../services/db-config.js';

// =============================================
// CRUD CLIENTES
// =============================================

/**
 * Obtiene todos los clientes
 * @returns {Promise<Array>}
 */
export async function getAllClients() {
  const data = await query(
    `SELECT * FROM ${TABLES.CLIENTS} ORDER BY created_at DESC`
  );
  return data || [];
}

/**
 * Obtiene un cliente por ID
 * @param {string} id - UUID del cliente
 * @returns {Promise<object|null>}
 */
export async function getClientById(id) {
  const data = await query(
    `SELECT * FROM ${TABLES.CLIENTS} WHERE id = $1`,
    [id]
  );
  return data[0] || null;
}

/**
 * Crea un nuevo cliente
 * @param {object} cliente - Datos del cliente
 * @returns {Promise<object>}
 */
export async function createClient(cliente) {
  const data = await query(
    `INSERT INTO ${TABLES.CLIENTS} (nombre, email, telefono, direccion, empresa, notas, activo)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      cliente.nombre,
      cliente.email || null,
      cliente.telefono || null,
      cliente.direccion || null,
      cliente.empresa || null,
      cliente.notas || null,
      cliente.activo !== false,
    ]
  );
  return data[0];
}

/**
 * Actualiza un cliente existente
 * @param {string} id - UUID del cliente
 * @param {object} cliente - Datos a actualizar
 * @returns {Promise<object>}
 */
export async function updateClient(id, cliente) {
  const data = await query(
    `UPDATE ${TABLES.CLIENTS}
     SET nombre = COALESCE($2, nombre),
         email = COALESCE($3, email),
         telefono = COALESCE($4, telefono),
         direccion = COALESCE($5, direccion),
         empresa = COALESCE($6, empresa),
         notas = COALESCE($7, notas),
         activo = COALESCE($8, activo),
         actualizado_en = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      cliente.nombre || null,
      cliente.email || null,
      cliente.telefono || null,
      cliente.direccion || null,
      cliente.empresa || null,
      cliente.notas || null,
      cliente.activo !== undefined ? cliente.activo : null,
    ]
  );
  return data[0] || null;
}

/**
 * Elimina un cliente
 * @param {string} id - UUID del cliente
 * @returns {Promise<boolean>}
 */
export async function deleteClient(id) {
  await query(`DELETE FROM ${TABLES.CLIENTS} WHERE id = $1`, [id]);
  return true;
}

// =============================================
// CONSULTAS ESPECIALES
// =============================================

/**
 * Obtiene clientes activos
 * @returns {Promise<Array>}
 */
export async function getActiveClients() {
  const data = await query(
    `SELECT * FROM ${TABLES.CLIENTS} WHERE activo = true ORDER BY nombre`
  );
  return data || [];
}

/**
 * Busca clientes por nombre o email
 * @param {string} termino - Término de búsqueda
 * @returns {Promise<Array>}
 */
export async function searchClients(termino) {
  const data = await query(
    `SELECT * FROM ${TABLES.CLIENTS}
     WHERE nombre ILIKE $1 OR email ILIKE $1 OR empresa ILIKE $1
     ORDER BY nombre`,
    [`%${termino}%`]
  );
  return data || [];
}

/**
 * Obtiene clientes con presupuestos
 * @returns {Promise<Array>}
 */
export async function getClientsWithBudgets() {
  const data = await query(
    `SELECT DISTINCT c.*, COUNT(p.id) as total_presupuestos, SUM(p.total) as monto_total
     FROM ${TABLES.CLIENTS} c
     LEFT JOIN ${TABLES.BUDGETS} p ON p.cliente_email = c.email
     GROUP BY c.id
     ORDER BY c.nombre`
  );
  return data || [];
}

/**
 * Obtiene los presupuestos de un cliente
 * @param {string} clienteId - UUID del cliente
 * @returns {Promise<Array>}
 */
export async function getBudgetsByClient(clienteId) {
  const data = await query(
    `SELECT p.*, o.name as obra_nombre
     FROM ${TABLES.BUDGETS} p
     LEFT JOIN ${TABLES.WORKS} o ON o.id = p.obra_id
     WHERE p.cliente_email = (SELECT email FROM ${TABLES.CLIENTS} WHERE id = $1)
     ORDER BY p.created_at DESC`,
    [clienteId]
  );
  return data || [];
}

/**
 * Obtiene estadísticas de clientes
 * @returns {Promise<object>}
 */
export async function getClientStats() {
  const [total, activos, inactivos, conPresupuestos] = await Promise.all([
    query(`SELECT COUNT(*) as count FROM ${TABLES.CLIENTS}`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.CLIENTS} WHERE activo = true`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.CLIENTS} WHERE activo = false`),
    query(`SELECT COUNT(DISTINCT cliente_email) as count FROM ${TABLES.BUDGETS} WHERE cliente_email IS NOT NULL`),
  ]);

  return {
    total: parseInt(total[0]?.count) || 0,
    activos: parseInt(activos[0]?.count) || 0,
    inactivos: parseInt(inactivos[0]?.count) || 0,
    con_presupuestos: parseInt(conPresupuestos[0]?.count) || 0,
  };
}

// =============================================
// EXPORTAR
// =============================================

export {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getActiveClients,
  searchClients,
  getClientsWithBudgets,
  getBudgetsByClient,
  getClientStats,
};