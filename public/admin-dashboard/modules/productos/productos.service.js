/**
 * productos.service.js
 * Servicio de datos para el módulo de productos.
 * Expone funciones públicas para CRUD, stock, movimientos y realtime.
 * Se integra con inventario via funciones RPC de Supabase.
 *
 * Requirements: 1.1-1.8, 2.1-2.6, 8.1-8.7
 */

import { supabase } from "../../services/supabase-client.js";

// --- CRUD Productos ---

/**
 * Obtener todos los productos ordenados por código.
 * @returns {Promise<Array>}
 */
export async function obtenerProductos() {
  const { data, error } = await supabase
    .from("productos")
    .select("id, codigo, descripcion, unidad, costo_prom, costo_prom_bs, existencia, categoria, estado, umbral_critico, umbral_alerta")
    .order("codigo", { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Obtener un producto por su ID.
 * @param {string} id - UUID del producto
 * @returns {Promise<object|null>}
 */
export async function obtenerProductoPorId(id) {
  const { data, error } = await supabase
    .from("productos")
    .select("id, codigo, descripcion, unidad, costo_prom, costo_prom_bs, existencia, categoria, estado, umbral_critico, umbral_alerta")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Crear un nuevo producto con validación.
 * @param {object} payload - { codigo, descripcion, costo_prom, estado, unidad, existencia }
 * @returns {Promise<object>} Producto creado
 */
export async function crearProducto(payload) {
  const limpio = sanitizarPayload(payload);
  const { data, error } = await supabase
    .from("productos")
    .insert(limpio)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Actualizar un producto existente.
 * @param {string} id - UUID del producto
 * @param {object} payload - Campos a actualizar
 * @returns {Promise<object>} Producto actualizado
 */
export async function actualizarProducto(id, payload) {
  const limpio = sanitizarPayload(payload);
  const { data, error } = await supabase
    .from("productos")
    .update(limpio)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Eliminar un producto por ID.
 * @param {string} id - UUID del producto
 * @returns {Promise<boolean>}
 */
export async function eliminarProducto(id) {
  const { error } = await supabase
    .from("productos")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return true;
}

// --- Stock ---

/**
 * Actualizar stock (existencia) de un producto.
 * Garantiza que el stock nunca quede negativo.
 * @param {string} productoId - UUID del producto
 * @param {number} cantidad - Cantidad a sumar (positiva) o restar (negativa)
 * @returns {Promise<{ success: boolean, nuevoStock?: number, error?: string }>}
 */
export async function actualizarStock(productoId, cantidad) {
  // Obtener stock actual
  const { data: producto, error: errGet } = await supabase
    .from("productos")
    .select("existencia")
    .eq("id", productoId)
    .single();

  if (errGet) return { success: false, error: errGet.message };

  const stockActual = producto.existencia || 0;
  const nuevoStock = stockActual + cantidad;

  if (nuevoStock < 0) {
    return {
      success: false,
      error: `Stock insuficiente. Disponible: ${stockActual}`,
    };
  }

  const { error: errUpdate } = await supabase
    .from("productos")
    .update({ existencia: nuevoStock })
    .eq("id", productoId);

  if (errUpdate) return { success: false, error: errUpdate.message };

  return { success: true, nuevoStock };
}

// --- Movimientos ---

/**
 * Registrar un movimiento de producto y actualizar stock.
 * Genera registro en tabla movimientos y ajusta existencia.
 * @param {object} datos
 * @param {string} datos.productoId - UUID del producto
 * @param {string} datos.tipo - 'entrada' | 'salida' | 'transferencia' | 'ajuste'
 * @param {number} datos.cantidad - Cantidad (siempre positiva, el tipo determina la dirección)
 * @param {string} [datos.obraId] - UUID de la obra
 * @param {string} [datos.observacion] - Nota del movimiento
 * @returns {Promise<{ success: boolean, movimiento?: object, error?: string }>}
 */
export async function registrarMovimientoProducto({ productoId, tipo, cantidad, obraId, observacion }) {
  // Validar cantidad
  if (!cantidad || cantidad <= 0) {
    return { success: false, error: "La cantidad debe ser mayor a cero" };
  }

  // Para salidas, verificar stock suficiente
  const delta = tipo === "salida" ? -cantidad : cantidad;

  if (tipo === "salida") {
    const { data: prod } = await supabase
      .from("productos")
      .select("existencia")
      .eq("id", productoId)
      .single();

    if ((prod?.existencia || 0) < cantidad) {
      return {
        success: false,
        error: `Stock insuficiente. Disponible: ${prod?.existencia || 0}`,
      };
    }
  }

  // Insertar movimiento
  const movPayload = {
    producto_id: productoId,
    tipo,
    cantidad,
    obra_id: obraId || null,
    observacion: observacion || null,
    creado_en: new Date().toISOString(),
  };

  const { data: movimiento, error: errMov } = await supabase
    .from("movimientos")
    .insert(movPayload)
    .select()
    .single();

  if (errMov) return { success: false, error: errMov.message };

  // Actualizar stock del producto
  const stockResult = await actualizarStock(productoId, delta);
  if (!stockResult.success) {
    return { success: false, error: stockResult.error };
  }

  return { success: true, movimiento };
}

// --- Realtime ---

let realtimeChannel = null;

/**
 * Suscribirse a cambios en la tabla productos en tiempo real.
 * @param {function} onCambio - Callback invocado con { eventType, new, old }
 * @returns {void}
 */
export function suscribirRealtime(onCambio) {
  desuscribirRealtime();

  realtimeChannel = supabase
    .from("productos")
    .on("INSERT", (payload) => onCambio({ eventType: "INSERT", new: payload.new }))
    .on("UPDATE", (payload) => onCambio({ eventType: "UPDATE", new: payload.new, old: payload.old }))
    .on("DELETE", (payload) => onCambio({ eventType: "DELETE", old: payload.old }))
    .subscribe();
}

/**
 * Cancelar suscripción realtime activa.
 */
export function desuscribirRealtime() {
  if (realtimeChannel) {
    supabase.removeSubscription(realtimeChannel);
    realtimeChannel = null;
  }
}

// --- Gráfica: Productos por Categoría ---

/**
 * Obtiene productos agrupados por categoría desde la RPC.
 * Transforma cada registro {category_name, total_productos} en {label, value}.
 * @returns {Promise<Array<{label: string, value: number}>>}
 * @throws {Error} Si la RPC retorna un error
 */
export async function getProductosPorCategoria() {
  const { data, error } = await supabase.rpc("productos_por_categoria");

  if (error) throw new Error(error.message);

  if (!data || data.length === 0) return [];

  return data.map((item) => ({
    label: item.category_name != null ? String(item.category_name) : "Sin categoría",
    value: item.total_productos != null ? Math.max(0, Math.trunc(Number(item.total_productos))) : 0,
  }));
}

// --- Utilidades internas ---

function sanitizarPayload(payload) {
  const limpio = {};
  if (payload.codigo !== undefined) limpio.codigo = String(payload.codigo).trim();
  if (payload.descripcion !== undefined) limpio.descripcion = String(payload.descripcion).trim();
  if (payload.unidad !== undefined) limpio.unidad = payload.unidad ? String(payload.unidad).trim() : null;
  if (payload.categoria !== undefined) limpio.categoria = payload.categoria ? String(payload.categoria).trim() : null;
  if (payload.estado !== undefined) limpio.estado = payload.estado || "activo";
  if (payload.costo_prom !== undefined) {
    const costo = Number(String(payload.costo_prom).replace(",", "."));
    limpio.costo_prom = isNaN(costo) || costo < 0 ? 0 : costo;
  }
  if (payload.costo_prom_bs !== undefined) {
    const costoBs = Number(String(payload.costo_prom_bs).replace(",", "."));
    limpio.costo_prom_bs = isNaN(costoBs) || costoBs < 0 ? 0 : costoBs;
  }
  if (payload.existencia !== undefined) {
    const ex = Number(payload.existencia);
    limpio.existencia = isNaN(ex) || ex < 0 ? 0 : Math.floor(ex);
  }
  return limpio;
}

// --- Carga masiva ---

/**
 * Verificar si un código de producto ya existe.
 * @param {string} codigo
 * @returns {Promise<boolean>}
 */
export async function existeCodigo(codigo) {
  const { data, error } = await supabase
    .from("productos")
    .select("id")
    .eq("codigo", codigo.trim())
    .limit(1);
  if (error) throw error;
  return data && data.length > 0;
}

/**
 * Crear múltiples productos en lote.
 * @param {Array<object>} lista - Array de payloads de producto
 * @returns {Promise<{ insertados: number, errores: Array<{fila: number, error: string}> }>}
 */
export async function crearProductosEnLote(lista) {
  const resultados = { insertados: 0, errores: [] };

  // Sanitizar todos
  const limpios = lista.map((item, i) => {
    try {
      return sanitizarPayload(item);
    } catch (err) {
      resultados.errores.push({ fila: i + 1, error: err.message });
      return null;
    }
  }).filter(Boolean);

  if (limpios.length === 0) return resultados;

  // Insertar en lote
  const { data, error } = await supabase
    .from("productos")
    .insert(limpios)
    .select();

  if (error) {
    resultados.errores.push({ fila: 0, error: error.message });
  } else {
    resultados.insertados = data ? data.length : 0;
  }

  return resultados;
}

// --- Eliminación total ---

/**
 * Eliminar TODO el inventario (productos + movimientos).
 * Llama a la RPC eliminar_todo_inventario().
 * @returns {Promise<{ productos_eliminados: number, movimientos_eliminados: number }>}
 */
export async function eliminarTodoInventario() {
  const { data, error } = await supabase.rpc("eliminar_todo_inventario");
  if (error) throw new Error(error.message);
  return data || { productos_eliminados: 0, movimientos_eliminados: 0 };
}

/**
 * Obtener conteo actual de productos y movimientos.
 * @returns {Promise<{ productos: number, movimientos: number }>}
 */
export async function obtenerConteoInventario() {
  const [prodRes, movRes] = await Promise.all([
    supabase.from("productos").select("id", { count: "exact", head: true }),
    supabase.from("movimientos").select("id", { count: "exact", head: true }),
  ]);
  return {
    productos: prodRes.count || 0,
    movimientos: movRes.count || 0,
  };
}


// --- Exportación de inventario ---

/**
 * Obtener inventario completo para exportación.
 * @returns {Promise<Array>}
 */
export async function getInventarioCompleto() {
  const { data, error } = await supabase
    .from("productos")
    .select("codigo, descripcion, unidad, costo_prom, costo_prom_bs, existencia, categoria, estado")
    .order("codigo", { ascending: true });
  if (error) throw error;
  return data || [];
}


// --- Búsqueda de productos (autocompletado + catálogo) ---

/**
 * Búsqueda rápida de productos por código o descripción (autocompletado).
 * @param {string} term - Término de búsqueda (mínimo 2 caracteres)
 * @returns {Promise<Array<{id, codigo, descripcion, unidad, existencia}>>}
 */
export async function buscarProductos(term) {
  const { data, error } = await supabase
    .from("productos")
    .select("id, codigo, descripcion, unidad, existencia, costo_prom, costo_prom_bs")
    .or(`codigo.ilike.%${term}%,descripcion.ilike.%${term}%`)
    .limit(20);
  if (error) throw error;
  return data || [];
}

/**
 * Búsqueda avanzada de productos con filtros (para modal catálogo).
 * @param {object} filtros
 * @param {string} [filtros.term] - Término de búsqueda
 * @param {string} [filtros.categoria] - Filtrar por categoría
 * @returns {Promise<Array>}
 */
export async function buscarProductosAvanzado({ term, categoria } = {}) {
  let query = supabase
    .from("productos")
    .select("id, codigo, descripcion, unidad, existencia, categoria, costo_prom, costo_prom_bs")
    .order("descripcion", { ascending: true });

  if (term) {
    query = query.or(`codigo.ilike.%${term}%,descripcion.ilike.%${term}%`);
  }
  if (categoria) {
    query = query.eq("categoria", categoria);
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data || [];
}

/**
 * Obtener lista de categorías únicas.
 * @returns {Promise<Array<string>>}
 */
export async function obtenerCategorias() {
  const { data, error } = await supabase
    .from("productos")
    .select("categoria")
    .not("categoria", "is", null)
    .order("categoria");
  if (error) throw error;
  const unicas = [...new Set((data || []).map(d => d.categoria).filter(Boolean))];
  return unicas;
}
