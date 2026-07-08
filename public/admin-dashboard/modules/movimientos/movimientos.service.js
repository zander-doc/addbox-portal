/* ============================================================
MOVIMIENTOS SERVICE — ADDBOX
Consultas SQL directas a Neon PostgreSQL
Reemplaza las consultas Supabase por SQL nativo
============================================================ */

import { query } from '../../services/neon-client.js';
import { TABLES } from '../../services/db-config.js';

// --- CRUD Movimientos ---

/**
 * Obtener todos los movimientos ordenados por fecha (más recientes primero).
 * @returns {Promise<Array>}
 */
export async function obtenerMovimientos() {
  const data = await query(
    `SELECT m.id, m.producto_id, m.tipo, m.cantidad, m.cantidad as costo_unitario,
            m.creado_en as created_at, m.created_at, m.motivo, m.observacion,
            p.codigo, p.descripcion, p.unidad
     FROM ${TABLES.MOVEMENTS} m
     LEFT JOIN ${TABLES.PRODUCTS} p ON p.id = m.producto_id
     ORDER BY m.creado_en DESC`
  );
  return (data || []).map(formatMovement);
}

/**
 * Obtener movimientos por tipo (entrada o salida).
 * @param {string} tipo - 'entrada' o 'salida'
 * @returns {Promise<Array>}
 */
export async function filtrarMovimientosPorTipo(tipo) {
  const data = await query(
    `SELECT m.id, m.producto_id, m.tipo, m.cantidad, m.motivo, m.observacion,
            m.creado_en as created_at,
            p.codigo, p.descripcion, p.unidad
     FROM ${TABLES.MOVEMENTS} m
     LEFT JOIN ${TABLES.PRODUCTS} p ON p.id = m.producto_id
     WHERE m.tipo = $1
     ORDER BY m.creado_en DESC`,
    [tipo]
  );
  return (data || []).map(formatMovement);
}

/**
 * Obtener movimientos por rango de fechas.
 * @param {string} fechaInicio - Fecha inicio en formato ISO
 * @param {string} fechaFin - Fecha fin en formato ISO
 * @returns {Promise<Array>}
 */
export async function filtrarMovimientosPorRangoFechas(fechaInicio, fechaFin) {
  const data = await query(
    `SELECT m.id, m.producto_id, m.tipo, m.cantidad, m.motivo, m.observacion,
            m.creado_en as created_at,
            p.codigo, p.descripcion, p.unidad
     FROM ${TABLES.MOVEMENTS} m
     LEFT JOIN ${TABLES.PRODUCTS} p ON p.id = m.producto_id
     WHERE m.creado_en >= $1 AND m.creado_en <= $2
     ORDER BY m.creado_en DESC`,
    [fechaInicio, fechaFin]
  );
  return (data || []).map(formatMovement);
}

/**
 * Insertar un nuevo movimiento y actualizar stock.
 * @param {object} datos - { producto_id, tipo, cantidad, costo_unitario, fecha, motivo, observacion }
 * @returns {Promise<object>} Movimiento creado
 */
export async function insertarMovimiento(datos) {
  const limpio = sanitizarMovimiento(datos);

  // Usar la función RPC registrar_movimiento para manejo atómico
  const result = await query(
    `SELECT * FROM registrar_movimiento($1, $2, $3, $4, $5, $6)`,
    [
      limpio.tipo,
      limpio.producto_id,
      null, // obra_id (opcional)
      limpio.cantidad,
      null, // usuario_id (opcional)
      limpio.observacion || limpio.motivo || null,
    ]
  );

  const rpcResult = result[0]?.registrar_movimiento;

  if (rpcResult && rpcResult.success === false) {
    throw new Error(rpcResult.error || 'Error al registrar movimiento');
  }

  // Obtener el movimiento creado con datos del producto
  const movimiento = await obtenerMovimientoPorId(rpcResult?.movimiento_id);
  return movimiento;
}

/**
 * Obtener un movimiento por su ID con datos del producto
 * @param {string} id - UUID del movimiento
 * @returns {Promise<object|null>}
 */
async function obtenerMovimientoPorId(id) {
  if (!id) return null;
  const data = await query(
    `SELECT m.id, m.producto_id, m.tipo, m.cantidad, m.motivo, m.observacion,
            m.creado_en as created_at,
            p.codigo, p.descripcion, p.unidad
     FROM ${TABLES.MOVEMENTS} m
     LEFT JOIN ${TABLES.PRODUCTS} p ON p.id = m.producto_id
     WHERE m.id = $1`,
    [id]
  );
  const row = data[0];
  return row ? formatMovement(row) : null;
}

/**
 * Actualizar un movimiento existente.
 * @param {string} id - UUID del movimiento
 * @param {object} datos - Campos a actualizar
 * @returns {Promise<object>} Movimiento actualizado
 */
export async function actualizarMovimiento(id, datos) {
  const limpio = sanitizarMovimiento(datos);
  const setFields = [];
  const params = [id];
  let idx = 2;

  if (limpio.tipo) { setFields.push(`tipo = $${idx++}`); params.push(limpio.tipo); }
  if (limpio.cantidad !== undefined) { setFields.push(`cantidad = $${idx++}`); params.push(limpio.cantidad); }
  if (limpio.producto_id) { setFields.push(`producto_id = $${idx++}`); params.push(limpio.producto_id); }
  if (limpio.motivo !== undefined) { setFields.push(`motivo = $${idx++}`); params.push(limpio.motivo); }
  if (limpio.observacion !== undefined) { setFields.push(`observacion = $${idx++}`); params.push(limpio.observacion); }

  if (setFields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  const data = await query(
    `UPDATE ${TABLES.MOVEMENTS} SET ${setFields.join(', ')}, actualizado_en = NOW()
     WHERE id = $1
     RETURNING *`,
    params
  );
  return data[0] || null;
}

/**
 * Eliminar un movimiento por ID.
 * @param {string} id - UUID del movimiento
 * @returns {Promise<boolean>}
 */
export async function eliminarMovimiento(id) {
  await query(`DELETE FROM ${TABLES.MOVEMENTS} WHERE id = $1`, [id]);
  return true;
}

// Alias para compatibilidad
export const eliminarMovimientoService = eliminarMovimiento;

/**
 * Registrar un movimiento y actualizar stock atómicamente
 * @param {object} movement - { productId, type, quantity, userId, notes }
 * @returns {Promise<object>}
 */
export async function registerMovement(movement) {
  const result = await query(
    `INSERT INTO ${TABLES.MOVEMENTS} (producto_id, tipo, cantidad, usuario_id, observacion, creado_en)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [movement.productId, movement.type, movement.quantity, movement.userId, movement.notes]
  );

  // Actualizar stock
  if (movement.type === 'entrada') {
    await query(
      `UPDATE ${TABLES.PRODUCTS} SET stock = stock + $1 WHERE id = $2`,
      [movement.quantity, movement.productId]
    );
  } else if (movement.type === 'salida') {
    await query(
      `UPDATE ${TABLES.PRODUCTS} SET stock = stock - $1 WHERE id = $2`,
      [movement.quantity, movement.productId]
    );
  }

  return result[0];
}

// --- Consultas con filtros ---

/**
 * Obtener movimientos con filtros opcionales.
 * @param {object} filtros
 * @param {string} [filtros.tipo] - 'entrada' o 'salida'
 * @param {string} [filtros.productoId] - UUID del producto
 * @param {string} [filtros.fechaDesde] - Fecha inicio ISO
 * @param {string} [filtros.fechaHasta] - Fecha fin ISO
 * @param {number} [filtros.limit=200] - Límite de resultados
 * @returns {Promise<Array>}
 */
export async function getMovimientosFiltrados({ tipo, productoId, fechaDesde, fechaHasta, limit = 200 } = {}) {
  let sql = `SELECT m.*, p.codigo, p.descripcion, p.unidad
             FROM ${TABLES.MOVEMENTS} m
             LEFT JOIN ${TABLES.PRODUCTS} p ON p.id = m.producto_id
             WHERE 1=1`;
  const params = [];
  let idx = 1;

  if (tipo && tipo !== "todos") {
    sql += ` AND m.tipo = $${idx++}`;
    params.push(tipo);
  }
  if (productoId) {
    sql += ` AND m.producto_id = $${idx++}`;
    params.push(productoId);
  }
  if (fechaDesde) {
    sql += ` AND m.creado_en >= $${idx++}`;
    params.push(fechaDesde + "T00:00:00");
  }
  if (fechaHasta) {
    sql += ` AND m.creado_en <= $${idx++}`;
    params.push(fechaHasta + "T23:59:59");
  }

  sql += ` ORDER BY m.creado_en DESC LIMIT $${idx++}`;
  params.push(limit);

  const data = await query(sql, params);
  return (data || []).map(formatMovement);
}

/**
 * Obtener lista de productos con movimientos recientes.
 * @param {number} [limit=10] - Límite de resultados
 * @returns {Promise<Array<{id: string, nombre: string, codigo: string}>}
 */
export async function getProductosConMovimientos(limit = 10) {
  const data = await query(
    `SELECT DISTINCT m.producto_id, p.codigo, p.descripcion, p.nombre, p.name
     FROM ${TABLES.MOVEMENTS} m
     LEFT JOIN ${TABLES.PRODUCTS} p ON p.id = m.producto_id
     ORDER BY m.creado_en DESC
     LIMIT $1`,
    [limit]
  );

  // Extraer productos únicos
  const productos = [];
  const vistos = new Set();

  (data || []).forEach(m => {
    if (m.producto_id && !vistos.has(m.producto_id)) {
      vistos.add(m.producto_id);
      productos.push({
        id: m.producto_id,
        nombre: m.descripcion || m.nombre || m.name || m.codigo || "Sin nombre",
        codigo: m.codigo || ""
      });
    }
  });

  return productos;
}

/**
 * Obtener resumen de movimientos por tipo.
 * @returns {Promise<{total: number, entradas: number, salidas: number}>}
 */
export async function getResumenPorTipo() {
  const [total, entradas, salidas] = await Promise.all([
    query(`SELECT COUNT(*) as count FROM ${TABLES.MOVEMENTS}`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.MOVEMENTS} WHERE tipo = 'entrada'`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.MOVEMENTS} WHERE tipo = 'salida'`),
  ]);

  return {
    total: parseInt(total[0]?.count) || 0,
    entradas: parseInt(entradas[0]?.count) || 0,
    salidas: parseInt(salidas[0]?.count) || 0,
  };
}

/**
 * Obtener resumen de movimientos por día (últimos 30 días).
 * @returns {Promise<Array<{fecha: string, entradas: number, salidas: number, total: number}>}
 */
export async function getResumenDiario() {
  const data = await query(
    `SELECT DATE(creado_en) as fecha,
            COUNT(*) FILTER (WHERE tipo = 'entrada') as entradas,
            COUNT(*) FILTER (WHERE tipo = 'salida') as salidas,
            COUNT(*) as total
     FROM ${TABLES.MOVEMENTS}
     WHERE creado_en >= NOW() - INTERVAL '30 days'
     GROUP BY DATE(creado_en)
     ORDER BY fecha DESC`
  );

  return (data || []).map(row => ({
    fecha: row.fecha,
    entradas: parseInt(row.entradas) || 0,
    salidas: parseInt(row.salidas) || 0,
    total: parseInt(row.total) || 0,
  }));
}

// --- Utilidades ---

/**
 * Formatea un movimiento para mantener compatibilidad con el formato anterior
 * @param {object} m - Fila de movimiento
 * @returns {object}
 */
function formatMovement(m) {
  return {
    id: m.id,
    producto_id: m.producto_id,
    tipo: m.tipo,
    cantidad: m.cantidad,
    costo_unitario: m.costo_unitario || m.cantidad || 0,
    fecha: m.fecha || (m.creado_en ? m.creado_en.split('T')[0] : null),
    motivo: m.motivo,
    observacion: m.observacion,
    created_at: m.created_at || m.creado_en,
    productos: {
      codigo: m.codigo || '',
      descripcion: m.descripcion || m.nombre || m.name || '',
      unidad: m.unidad || '',
    },
  };
}

/**
 * Sanitizar datos de movimiento antes de insertar.
 * @param {object} datos - Datos del movimiento
 * @returns {object} Datos sanitizados
 */
export function sanitizarMovimiento(datos) {
  const limpio = {};

  if (datos.producto_id) limpio.producto_id = datos.producto_id;
  if (datos.tipo && datos.tipo.toLowerCase() === "entrada") limpio.tipo = "entrada";
  else if (datos.tipo && datos.tipo.toLowerCase() === "salida") limpio.tipo = "salida";
  else if (datos.tipo) limpio.tipo = datos.tipo.toLowerCase();

  if (datos.cantidad !== undefined && datos.cantidad !== null) {
    const cant = Number(datos.cantidad);
    limpio.cantidad = isNaN(cant) || cant <= 0 ? 1 : cant;
  }

  if (datos.costo_unitario !== undefined && datos.costo_unitario !== null) {
    const costo = Number(String(datos.costo_unitario).replace(",", "."));
    limpio.costo_unitario = isNaN(costo) || costo < 0 ? 0 : costo;
  }

  if (datos.fecha) limpio.fecha = datos.fecha;
  if (datos.motivo !== undefined && datos.motivo !== null) limpio.motivo = String(datos.motivo).trim();
  if (datos.observacion !== undefined && datos.observacion !== null) limpio.observacion = String(datos.observacion).trim();

  return limpio;
}

/**
 * Obtener lista de productos activos para el selector.
 * @returns {Promise<Array<{id: string, nombre: string, codigo: string}>}
 */
export async function obtenerProductos() {
  const data = await query(
    `SELECT id, codigo, descripcion, nombre, name
     FROM ${TABLES.PRODUCTS}
     WHERE activo = true
     ORDER BY codigo`
  );

  return (data || []).map(p => ({
    id: p.id,
    nombre: p.descripcion || p.nombre || p.name || p.codigo || "Sin nombre",
    codigo: p.codigo || "",
  }));
}

// --- Exportar funciones ---
export {
  obtenerMovimientos,
  filtrarMovimientosPorTipo,
  filtrarMovimientosPorRangoFechas,
  insertarMovimiento,
  actualizarMovimiento,
  eliminarMovimiento,
  getMovimientosFiltrados,
  getProductosConMovimientos,
  getResumenPorTipo,
  getResumenDiario,
  sanitizarMovimiento,
  obtenerProductos,
};