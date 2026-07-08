/**
 * devoluciones.service.js
 * Servicio para el módulo de Devoluciones.
 * Basado en Documentos de Inventario — controla materiales pendientes por regresar.
 */

import { supabase } from "../../services/supabase-client.js";

/**
 * Obtener todos los materiales que están fuera (cantidad > cantidad_devuelta).
 * @param {Object} [opciones] - Opciones de consulta
 * @param {boolean} [opciones.incluirCerrados=false] - Si true, incluye items con pendiente === 0
 * @returns {Promise<Array>}
 */
export async function obtenerMaterialesFuera(opciones = {}) {
  // Obtener documentos con sus detalles
  const { data: docs, error: errDocs } = await supabase
    .from("documentos_inventario")
    .select("id, numero, tipo, proyecto, obra_nombre, origen, destino, solicitado_por, creado_en, estado")
    .order("creado_en", { ascending: false });

  if (errDocs) throw errDocs;
  if (!docs || docs.length === 0) return [];

  // Obtener todos los detalles
  const docIds = docs.map(d => d.id);
  const { data: detalles, error: errDet } = await supabase
    .from("documentos_inventario_detalle")
    .select("*")
    .in("documento_id", docIds);

  if (errDet) throw errDet;

  // Filtrar solo los que tienen pendientes
  const materiales = [];
  (detalles || []).forEach(det => {
    const cantidad = det.cantidad || 0;
    const devuelta = det.cantidad_devuelta || 0;
    const pendiente = cantidad - devuelta;

    if (pendiente > 0 || opciones.incluirCerrados) {
      const doc = docs.find(d => d.id === det.documento_id);
      if (!doc) return;

      const fechaSalida = new Date(doc.creado_en);
      const hoy = new Date();
      const diasFuera = Math.floor((hoy - fechaSalida) / (1000 * 60 * 60 * 24));

      materiales.push({
        detalle_id: det.id,
        documento_id: det.documento_id,
        numero: doc.numero,
        tipo: doc.tipo,
        proyecto: doc.proyecto || doc.obra_nombre || "",
        destino: doc.destino || "",
        solicitado_por: doc.solicitado_por || "",
        codigo: det.codigo || "",
        descripcion: det.descripcion || "",
        unidad: det.unidad || "",
        cantidad: cantidad,
        devuelta: devuelta,
        pendiente: pendiente,
        dias_fuera: diasFuera,
        fecha_salida: doc.creado_en,
        estado_doc: doc.estado || "abierto",
        motivo_cierre: det.motivo_cierre || null,
        estado_especial: det.estado_especial || null
      });
    }
  });

  // Ordenar por días fuera (más antiguos primero)
  materiales.sort((a, b) => b.dias_fuera - a.dias_fuera);
  return materiales;
}

/**
 * Motivos de cierre permitidos.
 */
const MOTIVOS_VALIDOS = ["devuelto", "consumido", "extraviado", "danado_baja", "danado_reparacion"];

/**
 * Registrar una devolución parcial o total con motivo de cierre.
 * @param {string} detalleId - ID del detalle del documento
 * @param {number} cantidadDevolver - Cantidad a devolver (Q)
 * @param {string} documentoId - ID del documento padre
 * @param {string} [motivo="devuelto"] - Motivo de cierre
 * @returns {Promise<{success: boolean, mensaje?: string}>}
 * @throws {Error} Si Q <= 0 o Q > pendiente, o si falla el UPDATE de detalle
 */
export async function registrarDevolucion(detalleId, cantidadDevolver, documentoId, motivo = "devuelto") {
  // Validar motivo
  if (!motivo) motivo = "devuelto";
  if (!MOTIVOS_VALIDOS.includes(motivo)) {
    throw new Error(`Motivo de cierre no válido: "${motivo}". Valores permitidos: ${MOTIVOS_VALIDOS.join(", ")}`);
  }

  // Validar que Q > 0
  if (!cantidadDevolver || cantidadDevolver <= 0) {
    throw new Error("La cantidad a devolver debe ser mayor a cero");
  }

  // Obtener detalle actual
  const { data: det, error: errGet } = await supabase
    .from("documentos_inventario_detalle")
    .select("*")
    .eq("id", detalleId)
    .single();

  if (errGet) throw errGet;

  const cantidadTotal = det.cantidad || 0;
  const devueltaActual = det.cantidad_devuelta || 0;
  const pendiente = cantidadTotal - devueltaActual;

  // Validar que Q <= pendiente
  if (cantidadDevolver > pendiente) {
    throw new Error(`No puedes devolver más de lo pendiente. Máximo permitido: ${pendiente}`);
  }

  const nuevaDevuelta = devueltaActual + cantidadDevolver;

  // PASO 1: UPDATE campos base (siempre existen)
  console.log("[Devoluciones] Intentando UPDATE:", { detalleId, nuevaDevuelta, fecha: new Date().toISOString().split("T")[0] });
  const { data: updateData, error: errUpdate } = await supabase
    .from("documentos_inventario_detalle")
    .update({
      cantidad_devuelta: nuevaDevuelta,
      fecha_devolucion: new Date().toISOString().split("T")[0]
    })
    .eq("id", detalleId)
    .select();

  console.log("[Devoluciones] Resultado UPDATE:", JSON.stringify({ data: updateData, error: errUpdate }));
  
  if (errUpdate) {
    console.error("[Devoluciones] ERROR en UPDATE:", errUpdate);
    throw errUpdate;
  }
  
  // Verificar que el UPDATE realmente afectó filas
  if (!updateData || updateData.length === 0) {
    console.error("[Devoluciones] UPDATE no afectó ninguna fila. Posible problema de RLS o ID incorrecto.");
    console.error("[Devoluciones] detalleId usado:", detalleId);
    throw new Error("No se pudo actualizar el registro. Verifica permisos de la base de datos.");
  }

  // PASO 2: Intentar guardar motivo_cierre (puede fallar si columna no existe)
  if (motivo) {
    try {
      const motivoPayload = { motivo_cierre: motivo };
      if (motivo === "danado_reparacion") {
        motivoPayload.estado_especial = "en_reparacion";
      }
      await supabase
        .from("documentos_inventario_detalle")
        .update(motivoPayload)
        .eq("id", detalleId);
    } catch (e) {
      console.warn("[Devoluciones] No se pudo guardar motivo_cierre (columna puede no existir):", e);
    }
  }

  // Solo incrementar existencia si motivo es "devuelto"
  if (motivo === "devuelto" && det.codigo) {
    try {
      const { data: producto } = await supabase
        .from("productos")
        .select("id, existencia")
        .eq("codigo", det.codigo)
        .single();

      if (producto) {
        const { error: errProd } = await supabase
          .from("productos")
          .update({ existencia: (producto.existencia || 0) + cantidadDevolver })
          .eq("id", producto.id);

        // Si error en UPDATE de producto, log del error pero no interrumpir
        if (errProd) {
          console.error("[Devoluciones] Error al actualizar existencia del producto:", errProd);
        }
      }
    } catch (errProducto) {
      // Error al buscar/actualizar producto: log pero no interrumpir la devolución
      console.error("[Devoluciones] Error en operación de producto:", errProducto);
    }
  }

  // Verificar si el documento está completamente devuelto
  await verificarCierreDocumento(documentoId);

  return { success: true, mensaje: `Devuelto: ${cantidadDevolver} unidades` };
}

/**
 * Verificar si todos los materiales de un documento fueron devueltos.
 * Si todos tienen pendiente == 0, cerrar el documento.
 * Si al menos uno tiene pendiente > 0, asegurar que el estado sea 'abierto'.
 */
async function verificarCierreDocumento(documentoId) {
  const { data: detalles, error } = await supabase
    .from("documentos_inventario_detalle")
    .select("cantidad, cantidad_devuelta")
    .eq("documento_id", documentoId);

  if (error || !detalles) return;

  const todosDevueltos = detalles.every(d => {
    const cantidad = d.cantidad || 0;
    const devuelta = d.cantidad_devuelta || 0;
    return devuelta >= cantidad;
  });

  if (todosDevueltos) {
    await supabase
      .from("documentos_inventario")
      .update({ estado: "cerrado" })
      .eq("id", documentoId);
  } else {
    // Si al menos un detalle tiene pendiente > 0, asegurar estado 'abierto'
    await supabase
      .from("documentos_inventario")
      .update({ estado: "abierto" })
      .eq("id", documentoId);
  }
}

/**
 * Obtener resumen para el dashboard y KPI cards.
 * @param {number} diasLimite - Umbral de vencimiento en días (default: 7)
 * @returns {Promise<{totalFuera: number, vencidos: number, diasPromedio: number, devolucionesHoy: number}>}
 */
export async function obtenerResumenDevoluciones(diasLimite = 7) {
  const materiales = await obtenerMaterialesFuera();

  // totalFuera: count de registros con pendiente > 0 (ya filtrados por obtenerMaterialesFuera)
  const totalFuera = materiales.length;

  // vencidos: count de registros con pendiente > 0 AND dias_fuera > diasLimite
  const vencidos = materiales.filter(m => m.dias_fuera > diasLimite).length;

  // diasPromedio: media aritmética de dias_fuera de todos los materiales fuera
  const diasPromedio = totalFuera > 0
    ? Math.round(materiales.reduce((sum, m) => sum + m.dias_fuera, 0) / totalFuera)
    : 0;

  // devolucionesHoy: count de registros con fecha_devolucion = hoy
  const hoy = new Date().toISOString().split("T")[0];
  const { data: devHoy, error: errDevHoy } = await supabase
    .from("documentos_inventario_detalle")
    .select("id")
    .eq("fecha_devolucion", hoy);

  if (errDevHoy) throw errDevHoy;

  const devolucionesHoy = (devHoy || []).length;

  return { totalFuera, vencidos, diasPromedio, devolucionesHoy };
}

/**
 * Obtener detalles de un documento específico para el modal de devolución.
 * @param {string} documentoId - ID del documento
 * @returns {Promise<Array<{detalle_id: string, codigo: string, descripcion: string, unidad: string, cantidad: number, devuelta: number, pendiente: number}>>}
 */
export async function obtenerDetallesDocumento(documentoId) {
  const { data: detalles, error } = await supabase
    .from("documentos_inventario_detalle")
    .select("*")
    .eq("documento_id", documentoId);

  if (error) throw error;
  if (!detalles || detalles.length === 0) return [];

  return detalles.map(det => {
    const cantidad = det.cantidad || 0;
    const devuelta = det.cantidad_devuelta || 0;
    const pendiente = cantidad - devuelta;

    return {
      detalle_id: det.id,
      codigo: det.codigo || "",
      descripcion: det.descripcion || "",
      unidad: det.unidad || "",
      cantidad,
      devuelta,
      pendiente
    };
  });
}
