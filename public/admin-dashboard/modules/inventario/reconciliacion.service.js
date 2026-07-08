import { supabase } from "../../services/supabase-client.js";

/**
 * Inicia un conteo físico para una obra.
 * Crea un registro de conteo y carga todos los productos con su stock_sistema actual.
 * @param {string} obraId - UUID de la obra
 * @returns {Promise<{conteo_id: string, productos: Array<{producto_id, codigo, descripcion, stock_sistema}>}>}
 */
export async function iniciarConteoFisico(obraId) {
  const usuario = supabase.auth.user();

  // Verificar que no exista un conteo en progreso para esta obra
  const { data: conteoExistente, error: errorConteo } = await supabase
    .from("conteos_fisicos")
    .select("id")
    .eq("obra_id", obraId)
    .eq("estado", "en_progreso")
    .maybeSingle();

  if (errorConteo) throw errorConteo;

  if (conteoExistente) {
    throw new Error("Ya existe un conteo en progreso para esta obra");
  }

  // Crear el conteo físico
  const { data: conteo, error: errorCrear } = await supabase
    .from("conteos_fisicos")
    .insert({
      obra_id: obraId,
      usuario_id: usuario?.id,
      estado: "en_progreso",
    })
    .select("id")
    .single();

  if (errorCrear) throw errorCrear;

  // Obtener stock actual de todos los productos en la obra
  const { data: stockData, error: errorStock } = await supabase
    .from("stock_obra")
    .select(`
      producto_id,
      cantidad,
      productos (
        codigo,
        descripcion
      )
    `)
    .eq("obra_id", obraId);

  if (errorStock) throw errorStock;

  // Crear líneas de conteo con stock_sistema actual
  const lineas = (stockData || []).map((item) => ({
    conteo_id: conteo.id,
    producto_id: item.producto_id,
    stock_sistema: item.cantidad,
  }));

  if (lineas.length > 0) {
    const { error: errorLineas } = await supabase
      .from("conteo_lineas")
      .insert(lineas);

    if (errorLineas) throw errorLineas;
  }

  // Retornar datos del conteo con productos
  const productos = (stockData || []).map((item) => ({
    producto_id: item.producto_id,
    codigo: item.productos.codigo,
    descripcion: item.productos.descripcion,
    stock_sistema: item.cantidad,
  }));

  return { conteo_id: conteo.id, productos };
}

/**
 * Registra la cantidad física contada para un producto en un conteo.
 * Valida que el valor sea un entero >= 0 y <= 999,999.
 * @param {string} conteoId - UUID del conteo físico
 * @param {string} productoId - UUID del producto
 * @param {number} cantidadFisica - Cantidad física contada
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function registrarCantidadFisica(conteoId, productoId, cantidadFisica) {
  // Validar que la cantidad sea un entero válido
  if (!Number.isInteger(cantidadFisica) || cantidadFisica < 0 || cantidadFisica > 999999) {
    return {
      success: false,
      error: "La cantidad física debe ser un entero entre 0 y 999,999",
    };
  }

  // Verificar que el conteo esté en progreso
  const { data: conteo, error: errorConteo } = await supabase
    .from("conteos_fisicos")
    .select("estado")
    .eq("id", conteoId)
    .single();

  if (errorConteo) {
    return { success: false, error: errorConteo.message };
  }

  if (conteo.estado !== "en_progreso") {
    return {
      success: false,
      error: "El conteo no está en progreso. No se pueden registrar cantidades.",
    };
  }

  // Actualizar la línea de conteo con la cantidad física
  const { error: errorUpdate } = await supabase
    .from("conteo_lineas")
    .update({ stock_fisico: cantidadFisica })
    .eq("conteo_id", conteoId)
    .eq("producto_id", productoId);

  if (errorUpdate) {
    return { success: false, error: errorUpdate.message };
  }

  return { success: true };
}

/**
 * Finaliza un conteo físico: calcula diferencias y cambia estado a "completado".
 * Requiere que al menos un producto tenga cantidad física registrada.
 * @param {string} conteoId - UUID del conteo físico
 * @returns {Promise<{diferencias: Array<{producto_id, stock_sistema, stock_fisico, diferencia}>}>}
 */
export async function finalizarConteo(conteoId) {
  // Verificar que el conteo esté en progreso
  const { data: conteo, error: errorConteo } = await supabase
    .from("conteos_fisicos")
    .select("estado")
    .eq("id", conteoId)
    .single();

  if (errorConteo) throw errorConteo;

  if (conteo.estado !== "en_progreso") {
    throw new Error("El conteo no está en progreso. No se puede finalizar.");
  }

  // Obtener líneas con cantidad física registrada
  const { data: lineas, error: errorLineas } = await supabase
    .from("conteo_lineas")
    .select("producto_id, stock_sistema, stock_fisico, diferencia")
    .eq("conteo_id", conteoId)
    .not("stock_fisico", "is", null);

  if (errorLineas) throw errorLineas;

  if (!lineas || lineas.length === 0) {
    throw new Error(
      "Debe registrar la cantidad física de al menos un producto antes de finalizar el conteo"
    );
  }

  // Cambiar estado a completado
  const { error: errorUpdate } = await supabase
    .from("conteos_fisicos")
    .update({
      estado: "completado",
      completado_en: new Date().toISOString(),
    })
    .eq("id", conteoId);

  if (errorUpdate) throw errorUpdate;

  // Retornar diferencias (solo productos con diferencia != 0)
  const diferencias = lineas
    .filter((linea) => linea.diferencia !== 0)
    .map((linea) => ({
      producto_id: linea.producto_id,
      stock_sistema: linea.stock_sistema,
      stock_fisico: linea.stock_fisico,
      diferencia: linea.diferencia,
    }));

  return { diferencias };
}

/**
 * Aprueba una reconciliación: genera ajustes automáticos para igualar stock_sistema al stock_fisico.
 * Usa RPC para atomicidad. Cambia estado del conteo a "reconciliado".
 * @param {string} conteoId - UUID del conteo físico
 * @returns {Promise<{success: boolean, ajustes_generados: number, error?: string}>}
 */
export async function aprobarReconciliacion(conteoId) {
  const usuario = supabase.auth.user();

  // Verificar que el conteo esté completado
  const { data: conteo, error: errorConteo } = await supabase
    .from("conteos_fisicos")
    .select("estado, obra_id")
    .eq("id", conteoId)
    .single();

  if (errorConteo) {
    return { success: false, error: errorConteo.message };
  }

  if (conteo.estado !== "completado") {
    return {
      success: false,
      error: "El conteo debe estar completado para aprobar la reconciliación",
    };
  }

  // Obtener líneas con diferencias
  const { data: lineas, error: errorLineas } = await supabase
    .from("conteo_lineas")
    .select("producto_id, stock_sistema, stock_fisico, diferencia")
    .eq("conteo_id", conteoId)
    .not("stock_fisico", "is", null)
    .neq("diferencia", 0);

  if (errorLineas) {
    return { success: false, error: errorLineas.message };
  }

  if (!lineas || lineas.length === 0) {
    // No hay diferencias, solo marcar como reconciliado
    const { error: errorUpdate } = await supabase
      .from("conteos_fisicos")
      .update({
        estado: "reconciliado",
        reconciliado_en: new Date().toISOString(),
      })
      .eq("id", conteoId);

    if (errorUpdate) {
      return { success: false, error: errorUpdate.message };
    }

    return { success: true, ajustes_generados: 0 };
  }

  // Generar ajustes via RPC para cada diferencia
  let ajustesGenerados = 0;

  for (const linea of lineas) {
    const { data, error } = await supabase.rpc("registrar_movimiento", {
      p_tipo: "ajuste",
      p_producto_id: linea.producto_id,
      p_obra_id: conteo.obra_id,
      p_cantidad: linea.diferencia,
      p_usuario_id: usuario?.id,
      p_motivo: `Ajuste por reconciliación de inventario (conteo: ${conteoId})`,
    });

    if (error) {
      return {
        success: false,
        error: `Error al generar ajuste para producto ${linea.producto_id}: ${error.message}`,
      };
    }

    if (data && data.success === false) {
      return {
        success: false,
        error: `Error al generar ajuste para producto ${linea.producto_id}: ${data.error}`,
      };
    }

    ajustesGenerados++;
  }

  // Cambiar estado a reconciliado
  const { error: errorUpdate } = await supabase
    .from("conteos_fisicos")
    .update({
      estado: "reconciliado",
      reconciliado_en: new Date().toISOString(),
    })
    .eq("id", conteoId);

  if (errorUpdate) {
    return { success: false, error: errorUpdate.message };
  }

  return { success: true, ajustes_generados: ajustesGenerados };
}

/**
 * Rechaza una reconciliación: descarta ajustes propuestos y mantiene stock sin cambios.
 * Retorna el conteo al estado "completado" para permitir una nueva reconciliación.
 * @param {string} conteoId - UUID del conteo físico
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function rechazarReconciliacion(conteoId) {
  // Verificar que el conteo esté completado
  const { data: conteo, error: errorConteo } = await supabase
    .from("conteos_fisicos")
    .select("estado")
    .eq("id", conteoId)
    .single();

  if (errorConteo) {
    return { success: false, error: errorConteo.message };
  }

  if (conteo.estado !== "completado") {
    return {
      success: false,
      error: "Solo se puede rechazar una reconciliación en estado completado",
    };
  }

  // Mantener estado como completado (no se generan ajustes)
  // El stock permanece sin cambios
  return { success: true };
}
