/**
 * reportes-cierre.service.js
 * Servicio de reportes para motivos de cierre de materiales.
 * Consulta datos de extraviados, en reparación y consumibles.
 */

import { supabase } from "../../services/supabase-client.js";

/**
 * Obtener herramientas extraviadas con costo de pérdida.
 * @returns {Promise<Array<{codigo: string, descripcion: string, cantidad_devuelta: number, proyecto: string, obra_nombre: string, creado_en: string, costo_prom: number, costo_perdida: number}>>}
 */
export async function obtenerExtraviadosConCosto() {
  // 1. Obtener detalles con motivo "extraviado"
  const { data: detalles, error: errDet } = await supabase
    .from("documentos_inventario_detalle")
    .select("*")
    .eq("motivo_cierre", "extraviado");

  if (errDet) throw errDet;
  if (!detalles || detalles.length === 0) return [];

  // 2. Obtener documentos padre para join
  const docIds = [...new Set(detalles.map(d => d.documento_id))];
  const { data: docs, error: errDocs } = await supabase
    .from("documentos_inventario")
    .select("id, proyecto, obra_nombre, creado_en")
    .in("id", docIds);

  if (errDocs) throw errDocs;

  // 3. Obtener productos para costo
  const codigos = [...new Set(detalles.map(d => d.codigo).filter(Boolean))];
  let productosMap = {};
  if (codigos.length > 0) {
    const { data: productos } = await supabase
      .from("productos")
      .select("codigo, costo_prom")
      .in("codigo", codigos);

    (productos || []).forEach(p => {
      productosMap[p.codigo] = p.costo_prom || 0;
    });
  }

  // 4. Join en cliente y calcular costo_perdida
  return detalles.map(det => {
    const doc = (docs || []).find(d => d.id === det.documento_id) || {};
    const costoProm = productosMap[det.codigo] || 0;
    const cantidadDevuelta = det.cantidad_devuelta || 0;

    return {
      codigo: det.codigo || "",
      descripcion: det.descripcion || "",
      cantidad_devuelta: cantidadDevuelta,
      proyecto: doc.proyecto || doc.obra_nombre || "",
      obra_nombre: doc.obra_nombre || "",
      creado_en: doc.creado_en || "",
      costo_prom: costoProm,
      costo_perdida: cantidadDevuelta * costoProm
    };
  });
}

/**
 * Obtener herramientas en reparación.
 * @returns {Promise<Array<{codigo: string, descripcion: string, cantidad_devuelta: number, proyecto: string, obra_nombre: string, creado_en: string, estado_especial: string}>>}
 */
export async function obtenerEnReparacion() {
  const { data: detalles, error: errDet } = await supabase
    .from("documentos_inventario_detalle")
    .select("*")
    .eq("motivo_cierre", "danado_reparacion");

  if (errDet) throw errDet;
  if (!detalles || detalles.length === 0) return [];

  const docIds = [...new Set(detalles.map(d => d.documento_id))];
  const { data: docs, error: errDocs } = await supabase
    .from("documentos_inventario")
    .select("id, proyecto, obra_nombre, creado_en")
    .in("id", docIds);

  if (errDocs) throw errDocs;

  return detalles.map(det => {
    const doc = (docs || []).find(d => d.id === det.documento_id) || {};
    return {
      codigo: det.codigo || "",
      descripcion: det.descripcion || "",
      cantidad_devuelta: det.cantidad_devuelta || 0,
      proyecto: doc.proyecto || doc.obra_nombre || "",
      obra_nombre: doc.obra_nombre || "",
      creado_en: doc.creado_en || "",
      estado_especial: det.estado_especial || "en_reparacion"
    };
  });
}

/**
 * Obtener consumibles agrupados por proyecto.
 * @returns {Promise<Array<{proyecto: string, total_items: number, costo_total: number, detalle: Array}>>}
 */
export async function obtenerConsumiblesPorProyecto() {
  const { data: detalles, error: errDet } = await supabase
    .from("documentos_inventario_detalle")
    .select("*")
    .eq("motivo_cierre", "consumido");

  if (errDet) throw errDet;
  if (!detalles || detalles.length === 0) return [];

  const docIds = [...new Set(detalles.map(d => d.documento_id))];
  const { data: docs, error: errDocs } = await supabase
    .from("documentos_inventario")
    .select("id, proyecto, obra_nombre, creado_en")
    .in("id", docIds);

  if (errDocs) throw errDocs;

  const codigos = [...new Set(detalles.map(d => d.codigo).filter(Boolean))];
  let productosMap = {};
  if (codigos.length > 0) {
    const { data: productos } = await supabase
      .from("productos")
      .select("codigo, costo_prom")
      .in("codigo", codigos);

    (productos || []).forEach(p => {
      productosMap[p.codigo] = p.costo_prom || 0;
    });
  }

  // Agrupar por proyecto
  const grupos = {};
  detalles.forEach(det => {
    const doc = (docs || []).find(d => d.id === det.documento_id) || {};
    const proyecto = doc.proyecto || doc.obra_nombre || "Sin proyecto";
    const costoProm = productosMap[det.codigo] || 0;
    const cantidadDevuelta = det.cantidad_devuelta || 0;

    if (!grupos[proyecto]) {
      grupos[proyecto] = { proyecto, total_items: 0, costo_total: 0, detalle: [] };
    }

    grupos[proyecto].total_items += cantidadDevuelta;
    grupos[proyecto].costo_total += cantidadDevuelta * costoProm;
    grupos[proyecto].detalle.push({
      codigo: det.codigo || "",
      descripcion: det.descripcion || "",
      cantidad_devuelta: cantidadDevuelta,
      costo_prom: costoProm
    });
  });

  return Object.values(grupos);
}

/**
 * Calcular KPIs de resumen.
 * @param {Array} extraviados
 * @param {Array} enReparacion
 * @returns {{totalExtraviados: number, totalEnReparacion: number, costoTotalPerdidas: number}}
 */
export function calcularKPIsReporte(extraviados, enReparacion) {
  const totalExtraviados = (extraviados || []).length;
  const totalEnReparacion = (enReparacion || []).length;
  const costoTotalPerdidas = (extraviados || []).reduce((sum, e) => sum + (e.costo_perdida || 0), 0);

  return { totalExtraviados, totalEnReparacion, costoTotalPerdidas };
}
