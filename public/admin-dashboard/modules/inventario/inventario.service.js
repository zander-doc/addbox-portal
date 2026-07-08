/* ============================================================
INVENTARIO SERVICE — ADDBOX
Consultas SQL directas a Neon PostgreSQL
Reemplaza las consultas Supabase por SQL nativo
============================================================ */

import { query } from '../../services/neon-client.js';
import { TABLES } from '../../services/db-config.js';

// =============================================
// PRODUCTOS
// =============================================

/**
 * Obtiene todos los productos
 * @returns {Promise<Array>}
 */
export async function getAllProducts() {
  const result = await query(`SELECT * FROM ${TABLES.PRODUCTS} ORDER BY name`);
  return result;
}

/**
 * Obtiene un producto por su ID
 * @param {string} id - UUID del producto
 * @returns {Promise<object|null>}
 */
export async function getProductById(id) {
  const result = await query(
    `SELECT * FROM ${TABLES.PRODUCTS} WHERE id = $1`,
    [id]
  );
  return result[0] || null;
}

/**
 * Crea un nuevo producto
 * @param {object} product - Datos del producto
 * @returns {Promise<object>}
 */
export async function createProduct(product) {
  const result = await query(
    `INSERT INTO ${TABLES.PRODUCTS} (sku, codigo, name, nombre, description, descripcion, category, categoria, price, precio_venta, costo_prom, stock, umbral_critico, umbral_alerta, activo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
     RETURNING *`,
    [
      product.sku || product.codigo,
      product.codigo || product.sku,
      product.name || product.nombre,
      product.nombre || product.name,
      product.description || product.descripcion,
      product.descripcion || product.description,
      product.category || product.categoria,
      product.categoria || product.category,
      product.price || product.precio_venta || 0,
      product.precio_venta || product.price || 0,
      product.costo_prom || 0,
      product.stock || 0,
      product.umbral_critico || 5,
      product.umbral_alerta || 9,
    ]
  );
  return result[0];
}

/**
 * Actualiza un producto existente
 * @param {string} id - UUID del producto
 * @param {object} product - Datos a actualizar
 * @returns {Promise<object>}
 */
export async function updateProduct(id, product) {
  const result = await query(
    `UPDATE ${TABLES.PRODUCTS}
     SET name = COALESCE($2, name),
         nombre = COALESCE($3, nombre),
         description = COALESCE($4, description),
         descripcion = COALESCE($5, descripcion),
         category = COALESCE($6, category),
         categoria = COALESCE($7, categoria),
         price = COALESCE($8, price),
         precio_venta = COALESCE($9, precio_venta),
         costo_prom = COALESCE($10, costo_prom),
         stock = COALESCE($11, stock),
         umbral_critico = COALESCE($12, umbral_critico),
         umbral_alerta = COALESCE($13, umbral_alerta),
         actualizado_en = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      product.name || null,
      product.nombre || null,
      product.description || null,
      product.descripcion || null,
      product.category || null,
      product.categoria || null,
      product.price || null,
      product.precio_venta || null,
      product.costo_prom || null,
      product.stock || null,
      product.umbral_critico || null,
      product.umbral_alerta || null,
    ]
  );
  return result[0];
}

/**
 * Elimina un producto
 * @param {string} id - UUID del producto
 */
export async function deleteProduct(id) {
  await query(`DELETE FROM ${TABLES.PRODUCTS} WHERE id = $1`, [id]);
}

// =============================================
// STOCK POR OBRA
// =============================================

/**
 * Obtiene el stock de todos los productos en una obra específica
 * @param {string} obraId - UUID de la obra
 * @returns {Promise<Array>}
 */
export async function obtenerStockPorObra(obraId) {
  const result = await query(
    `SELECT so.producto_id, so.cantidad, so.obra_id,
            p.codigo, p.name, p.nombre, p.descripcion, p.unidad,
            p.costo_prom, p.umbral_critico, p.umbral_alerta
     FROM ${TABLES.STOCK_WORKS} so
     JOIN ${TABLES.PRODUCTS} p ON p.id = so.producto_id
     WHERE so.obra_id = $1
     ORDER BY p.name`,
    [obraId]
  );

  return (result || []).map((item) => {
    const umbralCritico = item.umbral_critico ?? 5;
    const umbralAlerta = item.umbral_alerta ?? 9;
    let estado_alerta = 'normal';
    if (item.cantidad < umbralCritico) estado_alerta = 'critico';
    else if (item.cantidad <= umbralAlerta) estado_alerta = 'alerta';

    return {
      producto_id: item.producto_id,
      codigo: item.codigo,
      descripcion: item.descripcion || item.nombre || item.name,
      unidad: item.unidad,
      cantidad: item.cantidad,
      costo_prom: item.costo_prom,
      estado_alerta,
    };
  });
}

/**
 * Obtiene el stock consolidado de todos los productos
 * @returns {Promise<Array>}
 */
export async function obtenerStockConsolidado() {
  const result = await query(
    `SELECT so.producto_id,
            p.codigo, p.name, p.nombre, p.descripcion, p.costo_prom,
            SUM(so.cantidad) as stock_total,
            COUNT(DISTINCT so.obra_id) as num_obras
     FROM ${TABLES.STOCK_WORKS} so
     JOIN ${TABLES.PRODUCTS} p ON p.id = so.producto_id
     GROUP BY so.producto_id, p.codigo, p.name, p.nombre, p.descripcion, p.costo_prom
     ORDER BY p.name`
  );

  return (result || []).map((prod) => ({
    producto_id: prod.producto_id,
    codigo: prod.codigo,
    descripcion: prod.descripcion || prod.nombre || prod.name,
    costo_prom: prod.costo_prom,
    stock_total: parseInt(prod.stock_total) || 0,
    num_obras: parseInt(prod.num_obras) || 0,
    valor_total: (parseInt(prod.stock_total) || 0) * (prod.costo_prom || 0),
  }));
}

/**
 * Obtiene la cantidad de stock de un producto en una obra
 * @param {string} productoId - UUID del producto
 * @param {string} obraId - UUID de la obra
 * @returns {Promise<{cantidad: number}>}
 */
export async function obtenerStockProductoObra(productoId, obraId) {
  const result = await query(
    `SELECT cantidad FROM ${TABLES.STOCK_WORKS}
     WHERE producto_id = $1 AND obra_id = $2`,
    [productoId, obraId]
  );
  return { cantidad: result[0]?.cantidad || 0 };
}

// =============================================
// MOVIMIENTOS (RPC)
// =============================================

/**
 * Registra una entrada de producto
 */
export async function registrarEntrada({ productoId, obraId, cantidad, observacion, usuarioId }) {
  const result = await query(
    `SELECT * FROM registrar_movimiento(
      $1, $2, $3, $4, $5, $6
    )`,
    ['entrada', productoId, obraId, cantidad, usuarioId || null, observacion || null]
  );
  const data = result[0]?.registrar_movimiento;
  if (data && data.success === false) {
    return { success: false, error: data.error };
  }
  return { success: true, movimiento: data };
}

/**
 * Registra una salida de producto
 */
export async function registrarSalida({ productoId, obraId, cantidad, observacion, usuarioId }) {
  const result = await query(
    `SELECT * FROM registrar_movimiento(
      $1, $2, $3, $4, $5, $6
    )`,
    ['salida', productoId, obraId, cantidad, usuarioId || null, observacion || null]
  );
  const data = result[0]?.registrar_movimiento;
  if (data && data.success === false) {
    return { success: false, error: data.error };
  }
  return { success: true, movimiento: data };
}

/**
 * Registra una transferencia entre obras
 */
export async function registrarTransferencia({ productoId, obraOrigenId, obraDestinoId, cantidad, observacion, usuarioId }) {
  const result = await query(
    `SELECT * FROM registrar_movimiento(
      $1, $2, $3, $4, $5, $6, $7
    )`,
    ['transferencia', productoId, obraOrigenId, cantidad, usuarioId || null, observacion || null, obraDestinoId]
  );
  const data = result[0]?.registrar_movimiento;
  if (data && data.success === false) {
    return { success: false, error: data.error };
  }
  return { success: true, movimientos: data };
}

/**
 * Registra un ajuste de inventario
 */
export async function registrarAjuste({ productoId, obraId, cantidad, motivo, usuarioId }) {
  const result = await query(
    `SELECT * FROM registrar_movimiento(
      $1, $2, $3, $4, $5, NULL, NULL, $6
    )`,
    ['ajuste', productoId, obraId, cantidad, usuarioId || null, motivo || null]
  );
  const data = result[0]?.registrar_movimiento;
  if (data && data.success === false) {
    return { success: false, error: data.error };
  }
  return { success: true, movimiento: data };
}

/**
 * Obtiene movimientos de una obra con paginación
 */
export async function obtenerMovimientosPorObra(obraId, { limit = 50, offset = 0 } = {}) {
  const data = await query(
    `SELECT m.*, p.codigo as producto_codigo, p.name as producto_nombre, p.nombre as producto_nombre_es
     FROM ${TABLES.MOVEMENTS} m
     LEFT JOIN ${TABLES.PRODUCTS} p ON p.id = m.producto_id
     WHERE m.obra_id = $1
     ORDER BY m.creado_en DESC
     LIMIT $2 OFFSET $3`,
    [obraId, limit, offset]
  );

  const [{ count }] = await query(
    `SELECT COUNT(*) as count FROM ${TABLES.MOVEMENTS} WHERE obra_id = $1`,
    [obraId]
  );

  const enriched = (data || []).map((m) => ({
    ...m,
    productos: {
      codigo: m.producto_codigo,
      nombre: m.producto_nombre_es || m.producto_nombre || '?',
    },
  }));

  return { data: enriched, total: parseInt(count) || 0 };
}

// =============================================
// MOVIMIENTOS GENERALES
// =============================================

/**
 * Obtiene movimientos recientes (para dashboard)
 */
export async function obtenerMovimientosRecientes(limit = 10) {
  const data = await query(
    `SELECT m.*, p.codigo as producto_codigo, p.name as producto_nombre,
            o.nombre as obra_nombre
     FROM ${TABLES.MOVEMENTS} m
     LEFT JOIN ${TABLES.PRODUCTS} p ON p.id = m.producto_id
     LEFT JOIN ${TABLES.WORKS} o ON o.id = m.obra_id
     ORDER BY m.creado_en DESC
     LIMIT $1`,
    [limit]
  );

  return (data || []).map((m) => ({
    id: m.id,
    tipo: m.tipo,
    cantidad: m.cantidad,
    producto: m.producto_nombre || '?',
    producto_codigo: m.producto_codigo,
    obra: m.obra_nombre || m.sitio || '—',
    creado_en: m.creado_en,
    observacion: m.observacion,
  }));
}

/**
 * Obtiene el total de movimientos de hoy
 */
export async function obtenerMovimientosHoy() {
  const result = await query(
    `SELECT COUNT(*) as count FROM ${TABLES.MOVEMENTS}
     WHERE creado_en >= CURRENT_DATE
     AND creado_en < CURRENT_DATE + INTERVAL '1 day'`
  );
  return parseInt(result[0]?.count) || 0;
}