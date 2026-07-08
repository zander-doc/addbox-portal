/* ============================================================
PRESUPUESTO SERVICE — ADDBOX
Consultas SQL directas a Neon PostgreSQL
============================================================ */

import { query } from '../../services/neon-client.js';
import { TABLES } from '../../services/db-config.js';

// =============================================
// CRUD PRESUPUESTOS
// =============================================

/**
 * Obtiene todos los presupuestos
 * @returns {Promise<Array>}
 */
export async function getAllBudgets() {
  const data = await query(
    `SELECT p.*, o.name as obra_nombre, o.nombre as obra_nombre_es
     FROM ${TABLES.BUDGETS} p
     LEFT JOIN ${TABLES.WORKS} o ON o.id = p.obra_id
     ORDER BY p.created_at DESC`
  );
  return data || [];
}

/**
 * Obtiene un presupuesto por ID con sus partidas
 * @param {string} id - UUID del presupuesto
 * @returns {Promise<object|null>}
 */
export async function getBudgetById(id) {
  const data = await query(
    `SELECT * FROM ${TABLES.BUDGETS} WHERE id = $1`,
    [id]
  );
  const presupuesto = data[0] || null;

  if (presupuesto) {
    presupuesto.partidas = await getBudgetItems(id);
  }

  return presupuesto;
}

/**
 * Crea un nuevo presupuesto
 * @param {object} presupuesto - Datos del presupuesto
 * @returns {Promise<object>}
 */
export async function createBudget(presupuesto) {
  const data = await query(
    `INSERT INTO ${TABLES.BUDGETS} (codigo, obra_id, cliente_nombre, cliente_email, cliente_telefono, total, estado, usuario_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      presupuesto.codigo,
      presupuesto.obra_id || null,
      presupuesto.cliente_nombre || null,
      presupuesto.cliente_email || null,
      presupuesto.cliente_telefono || null,
      presupuesto.total || 0,
      presupuesto.estado || 'borrador',
      presupuesto.usuario_id || null,
    ]
  );
  return data[0];
}

/**
 * Actualiza un presupuesto existente
 * @param {string} id - UUID del presupuesto
 * @param {object} presupuesto - Datos a actualizar
 * @returns {Promise<object>}
 */
export async function updateBudget(id, presupuesto) {
  const data = await query(
    `UPDATE ${TABLES.BUDGETS}
     SET codigo = COALESCE($2, codigo),
         obra_id = COALESCE($3, obra_id),
         cliente_nombre = COALESCE($4, cliente_nombre),
         cliente_email = COALESCE($5, cliente_email),
         cliente_telefono = COALESCE($6, cliente_telefono),
         total = COALESCE($7, total),
         estado = COALESCE($8, estado),
         actualizado_en = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      presupuesto.codigo || null,
      presupuesto.obra_id || null,
      presupuesto.cliente_nombre || null,
      presupuesto.cliente_email || null,
      presupuesto.cliente_telefono || null,
      presupuesto.total || null,
      presupuesto.estado || null,
    ]
  );
  return data[0] || null;
}

/**
 * Elimina un presupuesto
 * @param {string} id - UUID del presupuesto
 * @returns {Promise<boolean>}
 */
export async function deleteBudget(id) {
  await query(`DELETE FROM ${TABLES.BUDGETS} WHERE id = $1`, [id]);
  return true;
}

// =============================================
// PARTIDAS DE PRESUPUESTO
// =============================================

/**
 * Obtiene las partidas de un presupuesto
 * @param {string} presupuestoId - UUID del presupuesto
 * @returns {Promise<Array>}
 */
export async function getBudgetItems(presupuestoId) {
  const data = await query(
    `SELECT pi.*, p.codigo, p.descripcion, p.nombre, p.name
     FROM ${TABLES.BUDGET_ITEMS} pi
     LEFT JOIN ${TABLES.PRODUCTS} p ON p.id = pi.producto_id
     WHERE pi.presupuesto_id = $1
     ORDER BY pi.creado_en ASC`,
    [presupuestoId]
  );
  return data || [];
}

/**
 * Agrega una partida a un presupuesto
 * @param {object} partida - Datos de la partida
 * @returns {Promise<object>}
 */
export async function addBudgetItem(partida) {
  const data = await query(
    `INSERT INTO ${TABLES.BUDGET_ITEMS} (presupuesto_id, producto_id, descripcion, cantidad, precio_unitario, total)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      partida.presupuesto_id,
      partida.producto_id || null,
      partida.descripcion,
      partida.cantidad || 1,
      partida.precio_unitario || 0,
      partida.total || 0,
    ]
  );
  return data[0];
}

/**
 * Actualiza una partida de presupuesto
 * @param {string} id - UUID de la partida
 * @param {object} partida - Datos a actualizar
 * @returns {Promise<object>}
 */
export async function updateBudgetItem(id, partida) {
  const data = await query(
    `UPDATE ${TABLES.BUDGET_ITEMS}
     SET producto_id = COALESCE($2, producto_id),
         descripcion = COALESCE($3, descripcion),
         cantidad = COALESCE($4, cantidad),
         precio_unitario = COALESCE($5, precio_unitario),
         total = COALESCE($6, total)
     WHERE id = $1
     RETURNING *`,
    [
      id,
      partida.producto_id || null,
      partida.descripcion || null,
      partida.cantidad || null,
      partida.precio_unitario || null,
      partida.total || null,
    ]
  );
  return data[0] || null;
}

/**
 * Elimina una partida de presupuesto
 * @param {string} id - UUID de la partida
 * @returns {Promise<boolean>}
 */
export async function deleteBudgetItem(id) {
  await query(`DELETE FROM ${TABLES.BUDGET_ITEMS} WHERE id = $1`, [id]);
  return true;
}

/**
 * Calcula el total de un presupuesto sumando sus partidas
 * @param {string} presupuestoId - UUID del presupuesto
 * @returns {Promise<number>}
 */
export async function calculateBudgetTotal(presupuestoId) {
  const result = await query(
    `SELECT SUM(total) as total FROM ${TABLES.BUDGET_ITEMS} WHERE presupuesto_id = $1`,
    [presupuestoId]
  );
  return parseFloat(result[0]?.total) || 0;
}

// =============================================
// CONSULTAS ESPECIALES
// =============================================

/**
 * Obtiene presupuestos por estado
 * @param {string} estado - Estado del presupuesto
 * @returns {Promise<Array>}
 */
export async function getBudgetsByStatus(estado) {
  const data = await query(
    `SELECT p.*, o.name as obra_nombre
     FROM ${TABLES.BUDGETS} p
     LEFT JOIN ${TABLES.WORKS} o ON o.id = p.obra_id
     WHERE p.estado = $1
     ORDER BY p.created_at DESC`,
    [estado]
  );
  return data || [];
}

/**
 * Obtiene presupuestos por obra
 * @param {string} obraId - UUID de la obra
 * @returns {Promise<Array>}
 */
export async function getBudgetsByWork(obraId) {
  const data = await query(
    `SELECT * FROM ${TABLES.BUDGETS} WHERE obra_id = $1 ORDER BY created_at DESC`,
    [obraId]
  );
  return data || [];
}

/**
 * Obtiene presupuestos por usuario
 * @param {string} usuarioId - ID del usuario
 * @returns {Promise<Array>}
 */
export async function getBudgetsByUser(usuarioId) {
  const data = await query(
    `SELECT p.*, o.name as obra_nombre
     FROM ${TABLES.BUDGETS} p
     LEFT JOIN ${TABLES.WORKS} o ON o.id = p.obra_id
     WHERE p.usuario_id = $1
     ORDER BY p.created_at DESC`,
    [usuarioId]
  );
  return data || [];
}

/**
 * Cambia el estado de un presupuesto
 * @param {string} id - UUID del presupuesto
 * @param {string} nuevoEstado - Nuevo estado
 * @returns {Promise<object>}
 */
export async function changeBudgetStatus(id, nuevoEstado) {
  const data = await query(
    `UPDATE ${TABLES.BUDGETS} SET estado = $2, actualizado_en = NOW() WHERE id = $1 RETURNING *`,
    [id, nuevoEstado]
  );
  return data[0] || null;
}

/**
 * Obtiene estadísticas de presupuestos
 * @returns {Promise<object>}
 */
export async function getBudgetStats() {
  const [total, borradores, enviados, aprobados, rechazados] = await Promise.all([
    query(`SELECT COUNT(*) as count FROM ${TABLES.BUDGETS}`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.BUDGETS} WHERE estado = 'borrador'`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.BUDGETS} WHERE estado = 'enviado'`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.BUDGETS} WHERE estado = 'aprobado'`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.BUDGETS} WHERE estado = 'rechazado'`),
  ]);

  const totalMonto = await query(`SELECT SUM(total) as total FROM ${TABLES.BUDGETS}`);

  return {
    total: parseInt(total[0]?.count) || 0,
    borradores: parseInt(borradores[0]?.count) || 0,
    enviados: parseInt(enviados[0]?.count) || 0,
    aprobados: parseInt(aprobados[0]?.count) || 0,
    rechazados: parseInt(rechazados[0]?.count) || 0,
    monto_total: parseFloat(totalMonto[0]?.total) || 0,
  };
}

// =============================================
// EXPORTAR
// =============================================

export {
  getAllBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetItems,
  addBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  calculateBudgetTotal,
  getBudgetsByStatus,
  getBudgetsByWork,
  getBudgetsByUser,
  changeBudgetStatus,
  getBudgetStats,
};