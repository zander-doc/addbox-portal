/* ============================================================
REPORTES SERVICE — ADDBOX
Consultas SQL directas a Neon PostgreSQL
Agregaciones y estadísticas
============================================================ */

import { query } from '../../services/neon-client.js';
import { TABLES } from '../../services/db-config.js';

// =============================================
// ESTADÍSTICAS GENERALES
// =============================================

/**
 * Obtiene estadísticas generales del sistema
 * @returns {Promise<object>}
 */
export async function getGeneralStats() {
  const [
    totalProductos,
    totalObras,
    totalMovimientos,
    totalClientes,
    totalPresupuestos,
    movimientosHoy,
    productosBajoStock,
  ] = await Promise.all([
    query(`SELECT COUNT(*) as count FROM ${TABLES.PRODUCTS} WHERE activo = true`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.WORKS} WHERE estado = 'activa'`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.MOVEMENTS}`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.CLIENTS} WHERE activo = true`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.BUDGETS}`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.MOVEMENTS} WHERE creado_en >= CURRENT_DATE`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.PRODUCTS} WHERE activo = true AND stock <= umbral_critico`),
  ]);

  return {
    total_productos: parseInt(totalProductos[0]?.count) || 0,
    total_obras: parseInt(totalObras[0]?.count) || 0,
    total_movimientos: parseInt(totalMovimientos[0]?.count) || 0,
    total_clientes: parseInt(totalClientes[0]?.count) || 0,
    total_presupuestos: parseInt(totalPresupuestos[0]?.count) || 0,
    movimientos_hoy: parseInt(movimientosHoy[0]?.count) || 0,
    productos_bajo_stock: parseInt(productosBajoStock[0]?.count) || 0,
  };
}

/**
 * Obtiene estadísticas de inventario
 * @returns {Promise<object>}
 */
export async function getInventoryStats() {
  const [totalStock, valorTotal, productosActivos, productosInactivos, porCategoria] = await Promise.all([
    query(`SELECT SUM(stock) as total FROM ${TABLES.PRODUCTS} WHERE activo = true`),
    query(`SELECT SUM(stock * costo_prom) as total FROM ${TABLES.PRODUCTS} WHERE activo = true`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.PRODUCTS} WHERE activo = true`),
    query(`SELECT COUNT(*) as count FROM ${TABLES.PRODUCTS} WHERE activo = false`),
    query(`SELECT categoria, COUNT(*) as total, SUM(stock) as stock_total
           FROM ${TABLES.PRODUCTS}
           WHERE activo = true AND categoria IS NOT NULL
           GROUP BY categoria
           ORDER BY total DESC`),
  ]);

  return {
    total_stock: parseInt(totalStock[0]?.total) || 0,
    valor_total: parseFloat(valorTotal[0]?.total) || 0,
    productos_activos: parseInt(productosActivos[0]?.count) || 0,
    productos_inactivos: parseInt(productosInactivos[0]?.count) || 0,
    por_categoria: (porCategoria || []).map(c => ({
      categoria: c.categoria,
      total: parseInt(c.total) || 0,
      stock_total: parseInt(c.stock_total) || 0,
    })),
  };
}

/**
 * Obtiene estadísticas de movimientos
 * @returns {Promise<object>}
 */
export async function getMovementsStats() {
  const [porTipo, porDia, porObra] = await Promise.all([
    query(`SELECT tipo, COUNT(*) as total, SUM(cantidad) as cantidad_total
           FROM ${TABLES.MOVEMENTS}
           GROUP BY tipo
           ORDER BY total DESC`),
    query(`SELECT DATE(creado_en) as fecha, COUNT(*) as total
           FROM ${TABLES.MOVEMENTS}
           WHERE creado_en >= NOW() - INTERVAL '30 days'
           GROUP BY DATE(creado_en)
           ORDER BY fecha DESC`),
    query(`SELECT o.name, o.nombre, COUNT(m.id) as total_movimientos
           FROM ${TABLES.MOVEMENTS} m
           JOIN ${TABLES.WORKS} o ON o.id = m.obra_id
           GROUP BY o.id, o.name, o.nombre
           ORDER BY total_movimientos DESC
           LIMIT 10`),
  ]);

  return {
    por_tipo: (porTipo || []).map(t => ({
      tipo: t.tipo,
      total: parseInt(t.total) || 0,
      cantidad_total: parseInt(t.cantidad_total) || 0,
    })),
    por_dia: (porDia || []).map(d => ({
      fecha: d.fecha,
      total: parseInt(d.total) || 0,
    })),
    por_obra: (porObra || []).map(o => ({
      nombre: o.nombre || o.name,
      total_movimientos: parseInt(o.total_movimientos) || 0,
    })),
  };
}

// =============================================
// REPORTES DE PRODUCTOS
// =============================================

/**
 * Obtiene productos con stock bajo
 * @param {number} umbral - Umbral de stock (opcional)
 * @returns {Promise<Array>}
 */
export async function getLowStockProducts(umbral = null) {
  const data = await query(
    `SELECT p.*, s.cantidad as stock_obra
     FROM ${TABLES.PRODUCTS} p
     LEFT JOIN ${TABLES.STOCK_WORKS} s ON s.producto_id = p.id
     WHERE p.activo = true
       AND (p.stock <= COALESCE($1, p.umbral_critico) OR s.cantidad <= COALESCE($1, p.umbral_critico))
     ORDER BY p.stock ASC`,
    [umbral]
  );
  return data || [];
}

/**
 * Obtiene productos más movidos (entradas/salidas)
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Array>}
 */
export async function getTopProducts(limit = 10) {
  const data = await query(
    `SELECT p.id, p.codigo, p.name, p.nombre, p.descripcion,
            COUNT(m.id) as total_movimientos,
            SUM(CASE WHEN m.tipo = 'entrada' THEN m.cantidad ELSE 0 END) as entradas,
            SUM(CASE WHEN m.tipo = 'salida' THEN m.cantidad ELSE 0 END) as salidas
     FROM ${TABLES.PRODUCTS} p
     JOIN ${TABLES.MOVEMENTS} m ON m.producto_id = p.id
     GROUP BY p.id, p.codigo, p.name, p.nombre, p.descripcion
     ORDER BY total_movimientos DESC
     LIMIT $1`,
    [limit]
  );
  return data || [];
}

/**
 * Obtiene productos por categoría
 * @returns {Promise<Array>}
 */
export async function getProductsByCategory() {
  const data = await query(
    `SELECT categoria, COUNT(*) as total, SUM(stock) as stock_total, AVG(precio_venta) as precio_promedio
     FROM ${TABLES.PRODUCTS}
     WHERE activo = true AND categoria IS NOT NULL
     GROUP BY categoria
     ORDER BY total DESC`
  );
  return data || [];
}

// =============================================
// REPORTES DE MOVIMIENTOS
// =============================================

/**
 * Obtiene movimientos por período
 * @param {string} fechaInicio - Fecha inicio ISO
 * @param {string} fechaFin - Fecha fin ISO
 * @returns {Promise<Array>}
 */
export async function getMovementsByPeriod(fechaInicio, fechaFin) {
  const data = await query(
    `SELECT m.*, p.codigo, p.name, p.nombre, p.descripcion
     FROM ${TABLES.MOVEMENTS} m
     LEFT JOIN ${TABLES.PRODUCTS} p ON p.id = m.producto_id
     WHERE m.creado_en >= $1 AND m.creado_en <= $2
     ORDER BY m.creado_en DESC`,
    [fechaInicio, fechaFin]
  );
  return data || [];
}

/**
 * Obtiene resumen de movimientos por día
 * @param {number} dias - Número de días a consultar
 * @returns {Promise<Array>}
 */
export async function getMovementsSummaryByDay(dias = 30) {
  const data = await query(
    `SELECT DATE(creado_en) as fecha,
            COUNT(*) as total,
            SUM(CASE WHEN tipo = 'entrada' THEN cantidad ELSE 0 END) as entradas,
            SUM(CASE WHEN tipo = 'salida' THEN cantidad ELSE 0 END) as salidas,
            SUM(CASE WHEN tipo = 'transferencia' THEN cantidad ELSE 0 END) as transferencias,
            SUM(CASE WHEN tipo = 'ajuste' THEN cantidad ELSE 0 END) as ajustes
     FROM ${TABLES.MOVEMENTS}
     WHERE creado_en >= NOW() - INTERVAL '${dias} days'
     GROUP BY DATE(creado_en)
     ORDER BY fecha DESC`
  );
  return data || [];
}

/**
 * Obtiene productos más entrados/salidos
 * @param {string} tipo - 'entrada' o 'salida'
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Array>}
 */
export async function getTopProductsByMovementType(tipo, limit = 10) {
  const data = await query(
    `SELECT p.id, p.codigo, p.name, p.nombre, p.descripcion,
            SUM(m.cantidad) as total_cantidad,
            COUNT(m.id) as total_movimientos
     FROM ${TABLES.PRODUCTS} p
     JOIN ${TABLES.MOVEMENTS} m ON m.producto_id = p.id
     WHERE m.tipo = $1
     GROUP BY p.id, p.codigo, p.name, p.nombre, p.descripcion
     ORDER BY total_cantidad DESC
     LIMIT $2`,
    [tipo, limit]
  );
  return data || [];
}

// =============================================
// REPORTES DE OBRAS
// =============================================

/**
 * Obtiene estadísticas por obra
 * @returns {Promise<Array>}
 */
export async function getStatsByWork() {
  const data = await query(
    `SELECT o.id, o.name, o.nombre, o.estado,
            COUNT(DISTINCT m.id) as total_movimientos,
            COUNT(DISTINCT so.producto_id) as total_productos,
            SUM(so.cantidad) as stock_total,
            SUM(so.cantidad * p.costo_prom) as valor_inventario
     FROM ${TABLES.WORKS} o
     LEFT JOIN ${TABLES.STOCK_WORKS} so ON so.obra_id = o.id
     LEFT JOIN ${TABLES.PRODUCTS} p ON p.id = so.producto_id
     LEFT JOIN ${TABLES.MOVEMENTS} m ON m.obra_id = o.id
     GROUP BY o.id, o.name, o.nombre, o.estado
     ORDER BY stock_total DESC`
  );
  return data || [];
}

/**
 * Obtiene el resumen de una obra específica
 * @param {string} obraId - UUID de la obra
 * @returns {Promise<object|null>}
 */
export async function getWorkSummary(obraId) {
  const [info, movimientos, stock] = await Promise.all([
    query(`SELECT * FROM ${TABLES.WORKS} WHERE id = $1`, [obraId]),
    query(`SELECT COUNT(*) as total, 
                  SUM(CASE WHEN tipo = 'entrada' THEN 1 ELSE 0 END) as entradas,
                  SUM(CASE WHEN tipo = 'salida' THEN 1 ELSE 0 END) as salidas
           FROM ${TABLES.MOVEMENTS} WHERE obra_id = $1`, [obraId]),
    query(`SELECT COUNT(*) as productos, SUM(cantidad) as stock_total
           FROM ${TABLES.STOCK_WORKS} WHERE obra_id = $1`, [obraId]),
  ]);

  const obra = info[0];
  if (!obra) return null;

  return {
    ...obra,
    total_movimientos: parseInt(movimientos[0]?.total) || 0,
    entradas: parseInt(movimientos[0]?.entradas) || 0,
    salidas: parseInt(movimientos[0]?.salidas) || 0,
    total_productos: parseInt(stock[0]?.productos) || 0,
    stock_total: parseInt(stock[0]?.stock_total) || 0,
  };
}

// =============================================
// EXPORTAR DATOS (CSV/JSON)
// =============================================

/**
 * Exporta movimientos a formato CSV
 * @param {string} fechaInicio - Fecha inicio ISO
 * @param {string} fechaFin - Fecha fin ISO
 * @returns {Promise<string>} CSV string
 */
export async function exportMovementsToCSV(fechaInicio, fechaFin) {
  const data = await getMovementsByPeriod(fechaInicio, fechaFin);

  const headers = ['ID', 'Fecha', 'Tipo', 'Producto', 'Código', 'Cantidad', 'Motivo', 'Observación'];
  const rows = data.map(m => [
    m.id,
    m.creado_en ? m.creado_en.split('T')[0] : '',
    m.tipo,
    m.descripcion || m.nombre || m.name || '',
    m.codigo || '',
    m.cantidad,
    m.motivo || '',
    m.observacion || '',
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  return csv;
}

/**
 * Exporta productos a formato CSV
 * @returns {Promise<string>} CSV string
 */
export async function exportProductsToCSV() {
  const data = await query(
    `SELECT codigo, name, nombre, descripcion, categoria, stock, precio_venta, costo_prom, activo
     FROM ${TABLES.PRODUCTS}
     ORDER BY codigo`
  );

  const headers = ['Código', 'Nombre', 'Descripción', 'Categoría', 'Stock', 'Precio Venta', 'Costo Prom.', 'Activo'];
  const rows = (data || []).map(p => [
    p.codigo || '',
    p.name || p.nombre || '',
    p.descripcion || '',
    p.categoria || '',
    p.stock || 0,
    p.precio_venta || 0,
    p.costo_prom || 0,
    p.activo ? 'Sí' : 'No',
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  return csv;
}

// =============================================
// EXPORTAR
// =============================================

export {
  getGeneralStats,
  getInventoryStats,
  getMovementsStats,
  getLowStockProducts,
  getTopProducts,
  getProductsByCategory,
  getMovementsByPeriod,
  getMovementsSummaryByDay,
  getTopProductsByMovementType,
  getStatsByWork,
  getWorkSummary,
  exportMovementsToCSV,
  exportProductsToCSV,
};