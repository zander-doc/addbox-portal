import { supabase } from "./supabase-client.js";
import { getSession } from "./sessionService.js";
import { generarCSV, descargarCSV } from "./csvService.js";

/**
 * auditService.js
 * Servicio de pista de auditoría para el sistema de inventario.
 * Registra operaciones, permite consulta paginada con filtros y exportación CSV.
 *
 * Requirements: 7.1, 7.2, 7.4, 7.5, 7.6
 */

// --- Constantes ---
const REGISTROS_POR_PAGINA = 50;
const MAX_REGISTROS_EXPORTACION = 10000;

// --- Función existente: registrar auditoría ---

export async function audit(modulo, accion, descripcion = "") {
  try {
    const session = getSession();
    const user = session?.user;
    const usuario_id = user?.id ?? null;
    const ip = await obtenerIP();

    const payload = {
      usuario_id,
      accion,
      modulo,
      descripcion,
      ip,
      fecha: new Date().toISOString()
    };

    const { error } = await supabase.from("auditoria").insert(payload);

    if (error) {
      console.error("Error registrando auditoría:", error);
    }
  } catch (err) {
    console.error("Error inesperado en auditoría:", err);
  }
}

// --- Nuevas funciones ---

/**
 * Consultar pista de auditoría con paginación y filtros.
 * Retorna 50 registros por página, ordenados por fecha descendente.
 *
 * @param {object} opciones
 * @param {number} [opciones.pagina=1] - Número de página (1-indexed)
 * @param {string} [opciones.tipo] - Filtro por tipo/acción de movimiento
 * @param {string} [opciones.productoId] - Filtro por ID de producto
 * @param {string} [opciones.obraId] - Filtro por ID de obra
 * @param {string} [opciones.usuarioId] - Filtro por ID de usuario
 * @param {string} [opciones.fechaDesde] - Fecha inicio (ISO string)
 * @param {string} [opciones.fechaHasta] - Fecha fin (ISO string)
 * @returns {Promise<{ data: object[], total: number, pagina: number, totalPaginas: number, sinResultados: boolean }>}
 */
export async function consultarAuditoria({
  pagina = 1,
  tipo,
  productoId,
  obraId,
  usuarioId,
  fechaDesde,
  fechaHasta
} = {}) {
  try {
    const offset = (pagina - 1) * REGISTROS_POR_PAGINA;

    let query = supabase
      .from("auditoria")
      .select("*", { count: "exact" })
      .order("fecha", { ascending: false })
      .range(offset, offset + REGISTROS_POR_PAGINA - 1);

    query = aplicarFiltros(query, { tipo, productoId, obraId, usuarioId, fechaDesde, fechaHasta });

    const { data, error, count } = await query;

    if (error) {
      console.error("Error consultando auditoría:", error);
      return { data: [], total: 0, pagina, totalPaginas: 0, sinResultados: true };
    }

    const total = count ?? 0;
    const totalPaginas = Math.ceil(total / REGISTROS_POR_PAGINA);
    const sinResultados = total === 0;

    return {
      data: data || [],
      total,
      pagina,
      totalPaginas,
      sinResultados
    };
  } catch (err) {
    console.error("Error inesperado consultando auditoría:", err);
    return { data: [], total: 0, pagina, totalPaginas: 0, sinResultados: true };
  }
}

/**
 * Exportar pista de auditoría a CSV con los filtros aplicados.
 * Máximo 10,000 registros por exportación.
 *
 * @param {object} filtros - Mismos filtros que consultarAuditoria (sin pagina)
 * @param {string} [filtros.tipo]
 * @param {string} [filtros.productoId]
 * @param {string} [filtros.obraId]
 * @param {string} [filtros.usuarioId]
 * @param {string} [filtros.fechaDesde]
 * @param {string} [filtros.fechaHasta]
 * @returns {Promise<{ success: boolean, registrosExportados: number, error?: string }>}
 */
export async function exportarAuditoriaCSV({
  tipo,
  productoId,
  obraId,
  usuarioId,
  fechaDesde,
  fechaHasta
} = {}) {
  try {
    let query = supabase
      .from("auditoria")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(MAX_REGISTROS_EXPORTACION);

    query = aplicarFiltros(query, { tipo, productoId, obraId, usuarioId, fechaDesde, fechaHasta });

    const { data, error } = await query;

    if (error) {
      console.error("Error exportando auditoría:", error);
      return { success: false, registrosExportados: 0, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, registrosExportados: 0, error: "No se encontraron registros para los criterios seleccionados" };
    }

    const columnas = [
      { key: "id", label: "Identificador" },
      { key: "accion", label: "Tipo de Movimiento" },
      { key: "modulo", label: "Módulo" },
      { key: "descripcion", label: "Detalle" },
      { key: "producto_id", label: "Producto" },
      { key: "cantidad", label: "Cantidad" },
      { key: "obra_id", label: "Obra" },
      { key: "usuario_id", label: "Usuario" },
      { key: "fecha", label: "Fecha" }
    ];

    const metadata = {
      titulo: "Pista de Auditoría - ADDBOX Inventario",
      fecha: new Date().toISOString()
    };

    const contenidoCSV = generarCSV(data, columnas, metadata);
    const nombreArchivo = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    descargarCSV(contenidoCSV, nombreArchivo);

    return { success: true, registrosExportados: data.length };
  } catch (err) {
    console.error("Error inesperado exportando auditoría:", err);
    return { success: false, registrosExportados: 0, error: err.message };
  }
}

/**
 * Registrar operación de reconciliación en la pista de auditoría.
 * Incluye diferencias encontradas y ajustes generados.
 *
 * @param {object} datos
 * @param {string} datos.conteoId - ID del conteo físico
 * @param {string} datos.obraId - ID de la obra reconciliada
 * @param {string} datos.accion - Tipo de acción: 'reconciliacion_aprobada' | 'reconciliacion_rechazada' | 'conteo_iniciado' | 'conteo_finalizado'
 * @param {Array<{ producto_id: string, stock_sistema: number, stock_fisico: number, diferencia: number }>} [datos.diferencias] - Diferencias encontradas
 * @param {number} [datos.ajustesGenerados] - Número de ajustes generados
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function registrarReconciliacionAuditoria({
  conteoId,
  obraId,
  accion,
  diferencias,
  ajustesGenerados
}) {
  try {
    const session = getSession();
    const user = session?.user;
    const usuario_id = user?.id ?? null;
    const ip = await obtenerIP();

    // Construir descripción detallada
    let descripcion = `Conteo ID: ${conteoId}`;

    if (diferencias && diferencias.length > 0) {
      descripcion += ` | Diferencias: ${diferencias.length} producto(s)`;
      const resumen = diferencias.slice(0, 5).map(
        (d) => `${d.producto_id}: sistema=${d.stock_sistema}, físico=${d.stock_fisico}, dif=${d.diferencia}`
      ).join("; ");
      descripcion += ` | ${resumen}`;
      if (diferencias.length > 5) {
        descripcion += ` | ... y ${diferencias.length - 5} más`;
      }
    }

    if (ajustesGenerados != null) {
      descripcion += ` | Ajustes generados: ${ajustesGenerados}`;
    }

    const payload = {
      usuario_id,
      accion,
      modulo: "reconciliacion",
      descripcion,
      ip,
      fecha: new Date().toISOString(),
      obra_id: obraId,
      conteo_id: conteoId
    };

    const { error } = await supabase.from("auditoria").insert(payload);

    if (error) {
      console.error("Error registrando reconciliación en auditoría:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Error inesperado registrando reconciliación:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Registrar movimiento de inventario en la pista de auditoría.
 * Incluye todos los campos requeridos: tipo, producto, cantidad, obra, usuario, timestamp.
 *
 * @param {object} datos
 * @param {string} datos.movimientoId - ID del movimiento creado
 * @param {string} datos.tipo - Tipo de movimiento (entrada, salida, ajuste, transferencia_salida, transferencia_entrada)
 * @param {string} datos.productoId - ID del producto
 * @param {number} datos.cantidad - Cantidad del movimiento
 * @param {string} datos.obraId - ID de la obra
 * @param {string} [datos.obraDestinoId] - ID de la obra destino (para transferencias)
 * @param {string} [datos.observacion] - Observación adicional
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function registrarMovimientoAuditoria({
  movimientoId,
  tipo,
  productoId,
  cantidad,
  obraId,
  obraDestinoId,
  observacion
}) {
  try {
    const session = getSession();
    const user = session?.user;
    const usuario_id = user?.id ?? null;
    const ip = await obtenerIP();

    let descripcion = `Movimiento ${tipo}: cantidad=${cantidad}`;
    if (obraDestinoId) {
      descripcion += ` | Destino: ${obraDestinoId}`;
    }
    if (observacion) {
      descripcion += ` | ${observacion}`;
    }

    const payload = {
      usuario_id,
      accion: tipo,
      modulo: "inventario",
      descripcion,
      ip,
      fecha: new Date().toISOString(),
      producto_id: productoId,
      cantidad,
      obra_id: obraId,
      movimiento_id: movimientoId
    };

    const { error } = await supabase.from("auditoria").insert(payload);

    if (error) {
      console.error("Error registrando movimiento en auditoría:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Error inesperado registrando movimiento en auditoría:", err);
    return { success: false, error: err.message };
  }
}

// --- Funciones internas ---

/**
 * Aplicar filtros a una query de Supabase.
 * @param {object} query - Query de Supabase
 * @param {object} filtros - Filtros a aplicar
 * @returns {object} Query con filtros aplicados
 */
function aplicarFiltros(query, { tipo, productoId, obraId, usuarioId, fechaDesde, fechaHasta }) {
  if (tipo) {
    query = query.eq("accion", tipo);
  }
  if (productoId) {
    query = query.eq("producto_id", productoId);
  }
  if (obraId) {
    query = query.eq("obra_id", obraId);
  }
  if (usuarioId) {
    query = query.eq("usuario_id", usuarioId);
  }
  if (fechaDesde) {
    query = query.gte("fecha", fechaDesde);
  }
  if (fechaHasta) {
    query = query.lte("fecha", fechaHasta);
  }
  return query;
}

async function obtenerIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip;
  } catch {
    return "0.0.0.0";
  }
}

// Alias para compatibilidad con código existente
export { audit as logAudit };
