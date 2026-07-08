/* ============================================================
OBRAS SERVICE — ADDBOX
Consultas SQL directas a Neon PostgreSQL
============================================================ */

import { query } from '../../services/neon-client.js';
import { TABLES } from '../../services/db-config.js';

// =============================================
// CRUD OBRAS
// =============================================

/**
 * Obtiene todas las obras
 * @returns {Promise<Array>}
 */
export async function getAllWorks() {
  const data = await query(
    `SELECT * FROM ${TABLES.WORKS} ORDER BY created_at DESC`
  );
  return data || [];
}

/**
 * Obtiene una obra por ID
 * @param {string} id - UUID de la obra
 * @returns {Promise<object|null>}
 */
export async function getWorkById(id) {
  const data = await query(
    `SELECT * FROM ${TABLES.WORKS} WHERE id = $1`,
    [id]
  );
  return data[0] || null;
}

/**
 * Crea una nueva obra
 * @param {object} obra - Datos de la obra
 * @returns {Promise<object>}
 */
export async function createWork(obra) {
  const data = await query(
    `INSERT INTO ${TABLES.WORKS} (name, nombre, direccion, descripcion, estado, fecha_inicio, fecha_fin, presupuesto, responsable)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      obra.name || obra.nombre,
      obra.nombre || obra.name,
      obra.direccion || null,
      obra.descripcion || null,
      obra.estado || 'activa',
      obra.fecha_inicio || null,
      obra.fecha_fin || null,
      obra.presupuesto || 0,
      obra.responsable || null,
    ]
  );
  return data[0];
}

/**
 * Actualiza una obra existente
 * @param {string} id - UUID de la obra
 * @param {object} obra - Datos a actualizar
 * @returns {Promise<object>}
 */
export async function updateWork(id, obra) {
  const data = await query(
    `UPDATE ${TABLES.WORKS}
     SET name = COALESCE($2, name),
         nombre = COALESCE($3, nombre),
         direccion = COALESCE($4, direccion),
         descripcion = COALESCE($5, descripcion),
         estado = COALESCE($6, estado),
         fecha_inicio = COALESCE($7, fecha_inicio),
         fecha_fin = COALESCE($8, fecha_fin),
         presupuesto = COALESCE($9, presupuesto),
         responsable = COALESCE($10, responsable),
         actualizado_en = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      obra.name || null,
      obra.nombre || null,
      obra.direccion || null,
      obra.descripcion || null,
      obra.estado || null,
      obra.fecha_inicio || null,
      obra.fecha_fin || null,
      obra.presupuesto || null,
      obra.responsable || null,
    ]
  );
  return data[0] || null;
}

/**
 * Elimina una obra
 * @param {string} id - UUID de la obra
 * @returns {Promise<boolean>}
 */
export async function deleteWork(id) {
  await query(`DELETE FROM ${TABLES.WORKS} WHERE id = $1`, [id]);
  return true;
}

// =============================================
// CONSULTAS ESPECIALES
// =============================================

/**
 * Obtiene obras activas
 * @returns {Promise<Array>}
 */
export async function getActiveWorks() {
  const data = await query(
    `SELECT * FROM ${TABLES.WORKS} WHERE estado = 'activa' ORDER BY name`
  );
  return data || [];
}

/**
 * Obtiene obras con información de stock
 * @returns {Promise<Array>}
 */
export async function getWorksWithStock() {
  const data = await query(
    `SELECT o.*,
            COUNT(DISTINCT so.producto_id) as total_productos,
            SUM(so.cantidad) as stock_total
     FROM ${TABLES.WORKS} o
     LEFT JOIN ${TABLES.STOCK_WORKS} so ON so.obra_id = o.id
     GROUP BY o.id
     ORDER BY o.name`
  );
  return data || [];
}

/**
 * Obtiene el stock de una obra
 * @param {string} obraId - UUID de la obra
 * @returns {Promise<Array>}
 */
export async function getStockByWork(obraId) {
  const data = await query(
    `SELECT so.*, p.codigo, p.name, p.nombre, p.descripcion, p.unidad
     FROM ${TABLES.STOCK_WORKS} so
     JOIN ${TABLES.PRODUCTS} p ON p.id = so.producto_id
     WHERE so.obra_id = $1
     ORDER BY p.name`,
    [obraId]
  );
  return data || [];
}

/**
 * Obtiene los movimientos de una obra
 * @param {string} obraId - UUID de la obra
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Array>}
 */
export async function getMovimientosByWork(obraId, limit = 50) {
  const data = await query(
    `SELECT m.*, p.codigo, p.name, p.nombre, p.descripcion
     FROM ${TABLES.MOVEMENTS} m
     LEFT JOIN ${TABLES.PRODUCTS} p ON p.id = m.producto_id
     WHERE m.obra_id = $1
     ORDER BY m.creado_en DESC
     LIMIT $2`,
    [obraId, limit]
  );
  return data || [];
}

/**
 * Asigna un usuario a una obra
 * @param {string} userId - ID del usuario (Clerk ID)
 * @param {string} obraId - UUID de la obra
 * @returns {Promise<object>}
 */
export async function assignUserToWork(userId, obraId) {
  const data = await query(
    `INSERT INTO ${TABLES.USER_WORKS} (usuario_id, obra_id)
     VALUES ($1, $2)
     ON CONFLICT (usuario_id, obra_id) DO NOTHING
     RETURNING *`,
    [userId, obraId]
  );
  return data[0] || null;
}

/**
 * Remueve un usuario de una obra
 * @param {string} userId - ID del usuario
 * @param {string} obraId - UUID de la obra
 * @returns {Promise<boolean>}
 */
export async function removeUserFromWork(userId, obraId) {
  await query(
    `DELETE FROM ${TABLES.USER_WORKS} WHERE usuario_id = $1 AND obra_id = $2`,
    [userId, obraId]
  );
  return true;
}

/**
 * Obtiene los usuarios asignados a una obra
 * @param {string} obraId - UUID de la obra
 * @returns {Promise<Array>}
 */
export async function getUsersByWork(obraId) {
  const data = await query(
    `SELECT uo.*, u.nombre, u.email, u.rol
     FROM ${TABLES.USER_WORKS} uo
     JOIN ${TABLES.USERS} u ON u.id = uo.usuario_id
     WHERE uo.obra_id = $1`,
    [obraId]
  );
  return data || [];
}

/**
 * Obtiene las obras asignadas a un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>}
 */
export async function getWorksByUser(userId) {
  const data = await query(
    `SELECT uo.*, o.name, o.nombre, o.direccion, o.estado
     FROM ${TABLES.USER_WORKS} uo
     JOIN ${TABLES.WORKS} o ON o.id = uo.obra_id
     WHERE uo.usuario_id = $1`,
    [userId]
  );
  return data || [];
}

// =============================================
// EXPORTAR
// =============================================

export {
  getAllWorks,
  getWorkById,
  createWork,
  updateWork,
  deleteWork,
  getActiveWorks,
  getWorksWithStock,
  getStockByWork,
  getMovimientosByWork,
  assignUserToWork,
  removeUserFromWork,
  getUsersByWork,
  getWorksByUser,
};