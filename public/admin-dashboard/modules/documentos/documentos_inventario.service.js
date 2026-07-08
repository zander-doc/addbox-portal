/**
 * documentos_inventario.service.js
 * Servicio para Documentos de Inventario (Traslado, Requisición Materiales, Requisición Herramienta).
 */

import { supabase } from "../../services/supabase-client.js";
import { getSession } from "../../services/sessionService.js";

/**
 * Obtener documentos con filtros opcionales.
 */
export async function obtenerDocumentos({ tipo, desde, hasta } = {}) {
  let query = supabase
    .from("documentos_inventario")
    .select("*")
    .order("creado_en", { ascending: false });

  if (tipo) query = query.eq("tipo", tipo);
  if (desde) query = query.gte("creado_en", desde + "T00:00:00");
  if (hasta) query = query.lte("creado_en", hasta + "T23:59:59");

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Obtener un documento con su detalle de materiales.
 */
export async function obtenerDocumentoConDetalle(id) {
  const { data: doc, error: errDoc } = await supabase
    .from("documentos_inventario")
    .select("*")
    .eq("id", id)
    .single();
  if (errDoc) throw errDoc;

  const { data: detalle, error: errDet } = await supabase
    .from("documentos_inventario_detalle")
    .select("*")
    .eq("documento_id", id);
  if (errDet) throw errDet;

  return { ...doc, materiales: detalle || [] };
}

/**
 * Crear un documento de inventario con sus líneas de detalle.
 */
export async function crearDocumentoInventario(payload) {
  const session = getSession();
  const userId = session?.user?.id || null;

  // Generar número único
  const ahora = new Date();
  const prefijo = payload.tipo === "TRASLADO" ? "TM" : payload.tipo === "REQ_MATERIALES" ? "RM" : "RH";
  const numero = `${prefijo}-${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, "0")}${String(ahora.getDate()).padStart(2, "0")}-${String(ahora.getHours()).padStart(2, "0")}${String(ahora.getMinutes()).padStart(2, "0")}${String(ahora.getSeconds()).padStart(2, "0")}`;

  const { data: doc, error: errDoc } = await supabase
    .from("documentos_inventario")
    .insert({
      numero,
      tipo: payload.tipo,
      proyecto: payload.proyecto,
      obra_nombre: payload.proyecto,
      origen: payload.origen || null,
      destino: payload.destino || null,
      solicitado_por: payload.solicitado_por,
      autorizado_por: payload.autorizado_por || null,
      transportista: payload.transportista || null,
      observaciones: payload.observaciones || null,
      creado_por: userId,
    })
    .select()
    .single();

  if (errDoc) throw errDoc;

  const detalles = payload.materiales.map((m) => ({
    documento_id: doc.id,
    producto_id: null,
    codigo: m.codigo || null,
    descripcion: m.descripcion || null,
    unidad: m.unidad || null,
    cantidad: m.cantidad,
    observaciones: m.observaciones || null,
  }));

  const { error: errDet } = await supabase
    .from("documentos_inventario_detalle")
    .insert(detalles);

  if (errDet) throw errDet;

  return { ...doc, materiales: detalles };
}

/**
 * Eliminar un documento de inventario y sus líneas de detalle.
 */
export async function eliminarDocumento(id) {
  // Primero eliminar detalle
  const resDet = await supabase
    .from("documentos_inventario_detalle")
    .delete()
    .eq("documento_id", id);
  if (resDet.error) throw resDet.error;

  // Luego eliminar documento
  const resDoc = await supabase
    .from("documentos_inventario")
    .delete()
    .eq("id", id);
  if (resDoc.error) throw resDoc.error;

  console.log("eliminarDocumento resultado:", resDoc);
}
