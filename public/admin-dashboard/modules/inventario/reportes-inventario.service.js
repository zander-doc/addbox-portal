/**
 * reportes-inventario.service.js
 * Servicio de reportes de inventario: existencias, movimientos, valorización, rotación y exportación CSV.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { supabase } from "../../services/supabase-client.js";
import { generarCSV, descargarCSV } from "../../services/csvService.js";

/**
 * Reporte de existencias: stock por obra y total, ordenado alfabéticamente por nombre de producto.
 *
 * Requirement 9.1: Listado con producto, stock por obra, stock total, valor unitario y valor total,
 * ordenado alfabéticamente por nombre de producto.
 *
 * @returns {Promise<{ datos: Array, granTotal: number }>}
 */
export async function reporteExistencias() {
  const { data, error } = await supabase
    .from("stock_obra")
    .select(`
      producto_id,
      obra_id,
      cantidad,
      productos (
        codigo,
        descripcion,
        unidad,
        costo_prom
      ),
      obras (
        nombre
      )
    `);

  if (error) throw error;

  // Agrupar por producto
  const porProducto = {};

  for (const item of data) {
    const id = item.producto_id;
    if (!porProducto[id]) {
      porProducto[id] = {
        producto_id: id,
        codigo: item.productos.codigo,
        descripcion: item.productos.descripcion,
        unidad: item.productos.unidad,
        costo_prom: item.productos.costo_prom || 0,
        stock_total: 0,
        valor_total: 0,
        obras: [],
      };
    }
    porProducto[id].stock_total += item.cantidad;
    porProducto[id].obras.push({
      obra_id: item.obra_id,
      obra_nombre: item.obras.nombre,
      cantidad: item.cantidad,
    });
  }

  // Calcular valor total por producto y ordenar alfabéticamente
  const datos = Object.values(porProducto)
    .map((prod) => ({
      ...prod,
      valor_total: prod.stock_total * prod.costo_prom,
    }))
    .sort((a, b) => a.descripcion.localeCompare(b.descripcion));

  const granTotal = datos.reduce((sum, prod) => sum + prod.valor_total, 0);

  return { datos, granTotal };
}


/**
 * Reporte de movimientos: filtrable por fechas, tipo, producto, obra.
 * Default: últimos 30 días naturales.
 *
 * Requirement 9.2: Listado filtrable por rango de fechas, tipo de movimiento, producto y obra,
 * aplicando por defecto el rango de los últimos 30 días naturales.
 *
 * @param {{ fechaInicio?: string, fechaFin?: string, tipo?: string, productoId?: string, obraId?: string }} [filtros={}]
 * @returns {Promise<{ datos: Array, total: number }>}
 */
export async function reporteMovimientos(filtros = {}) {
  // Default: últimos 30 días
  const ahora = new Date();
  const hace30Dias = new Date(ahora);
  hace30Dias.setDate(hace30Dias.getDate() - 30);

  const fechaInicio = filtros.fechaInicio || hace30Dias.toISOString();
  const fechaFin = filtros.fechaFin || ahora.toISOString();

  let query = supabase
    .from("movimientos")
    .select(`
      id,
      tipo,
      cantidad,
      creado_en,
      motivo,
      observacion,
      producto_id,
      obra_id,
      obra_destino_id,
      usuario_id,
      lote_id,
      productos (
        codigo,
        descripcion
      ),
      obras:obra_id (
        nombre
      )
    `)
    .gte("creado_en", fechaInicio)
    .lte("creado_en", fechaFin)
    .order("creado_en", { ascending: false });

  // Aplicar filtros opcionales
  if (filtros.tipo) {
    query = query.eq("tipo", filtros.tipo);
  }
  if (filtros.productoId) {
    query = query.eq("producto_id", filtros.productoId);
  }
  if (filtros.obraId) {
    query = query.eq("obra_id", filtros.obraId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const datos = (data || []).map((mov) => ({
    id: mov.id,
    tipo: mov.tipo,
    cantidad: mov.cantidad,
    fecha: mov.creado_en,
    motivo: mov.motivo,
    observacion: mov.observacion,
    producto_codigo: mov.productos?.codigo || "",
    producto_descripcion: mov.productos?.descripcion || "",
    obra_nombre: mov.obras?.nombre || "",
    producto_id: mov.producto_id,
    obra_id: mov.obra_id,
    obra_destino_id: mov.obra_destino_id,
    usuario_id: mov.usuario_id,
    lote_id: mov.lote_id,
  }));

  return { datos, total: datos.length };
}

/**
 * Reporte de valorización: stock × costo_prom por producto-obra con gran total.
 *
 * Requirement 9.3: Calcular el valor total del inventario multiplicando Stock_Sistema por costo promedio
 * para cada producto en cada obra, y mostrar un gran total consolidado.
 *
 * @returns {Promise<{ datos: Array, granTotal: number }>}
 */
export async function reporteValorizacion() {
  const { data, error } = await supabase
    .from("stock_obra")
    .select(`
      producto_id,
      obra_id,
      cantidad,
      productos (
        codigo,
        descripcion,
        unidad,
        costo_prom
      ),
      obras (
        nombre
      )
    `);

  if (error) throw error;

  const datos = (data || []).map((item) => {
    const costoProm = item.productos?.costo_prom || 0;
    const valorTotal = item.cantidad * costoProm;

    return {
      producto_id: item.producto_id,
      obra_id: item.obra_id,
      codigo: item.productos?.codigo || "",
      descripcion: item.productos?.descripcion || "",
      unidad: item.productos?.unidad || "",
      obra_nombre: item.obras?.nombre || "",
      cantidad: item.cantidad,
      costo_prom: costoProm,
      valor_total: valorTotal,
    };
  });

  // Ordenar alfabéticamente por descripción de producto
  datos.sort((a, b) => a.descripcion.localeCompare(b.descripcion));

  const granTotal = datos.reduce((sum, item) => sum + item.valor_total, 0);

  return { datos, granTotal };
}

/**
 * Reporte de rotación: conteo de movimientos por producto en un período, ordenado descendente.
 *
 * Requirement 9.5: Calcular el número total de Movimientos registrados por producto dentro del período
 * seleccionado y ordenar los resultados de mayor a menor cantidad de movimientos.
 *
 * @param {string} fechaInicio - Fecha inicio del período (ISO string)
 * @param {string} fechaFin - Fecha fin del período (ISO string)
 * @returns {Promise<{ datos: Array }>}
 */
export async function reporteRotacion(fechaInicio, fechaFin) {
  const { data, error } = await supabase
    .from("movimientos")
    .select(`
      producto_id,
      productos (
        codigo,
        descripcion
      )
    `)
    .gte("creado_en", fechaInicio)
    .lte("creado_en", fechaFin);

  if (error) throw error;

  // Contar movimientos por producto
  const conteo = {};

  for (const mov of data || []) {
    const id = mov.producto_id;
    if (!conteo[id]) {
      conteo[id] = {
        producto_id: id,
        codigo: mov.productos?.codigo || "",
        descripcion: mov.productos?.descripcion || "",
        total_movimientos: 0,
      };
    }
    conteo[id].total_movimientos += 1;
  }

  // Ordenar de mayor a menor cantidad de movimientos
  const datos = Object.values(conteo).sort(
    (a, b) => b.total_movimientos - a.total_movimientos
  );

  return { datos };
}

/**
 * Exportar reporte a CSV con encabezado y fecha de generación.
 *
 * Requirement 9.4: Permitir exportar cada reporte en formato CSV incluyendo una fila de encabezado
 * con los nombres de columna y la fecha de generación del reporte.
 *
 * @param {Array} datos - Array de objetos con los datos del reporte
 * @param {'existencias' | 'movimientos' | 'valorizacion' | 'rotacion'} tipo - Tipo de reporte
 */
export function exportarReporte(datos, tipo) {
  const fechaGeneracion = new Date().toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const columnasPorTipo = {
    existencias: [
      { key: "codigo", label: "Código" },
      { key: "descripcion", label: "Producto" },
      { key: "unidad", label: "Unidad" },
      { key: "stock_total", label: "Stock Total" },
      { key: "costo_prom", label: "Valor Unitario" },
      { key: "valor_total", label: "Valor Total" },
    ],
    movimientos: [
      { key: "fecha", label: "Fecha" },
      { key: "tipo", label: "Tipo" },
      { key: "producto_codigo", label: "Código Producto" },
      { key: "producto_descripcion", label: "Producto" },
      { key: "cantidad", label: "Cantidad" },
      { key: "obra_nombre", label: "Obra" },
      { key: "observacion", label: "Observación" },
    ],
    valorizacion: [
      { key: "codigo", label: "Código" },
      { key: "descripcion", label: "Producto" },
      { key: "unidad", label: "Unidad" },
      { key: "obra_nombre", label: "Obra" },
      { key: "cantidad", label: "Stock" },
      { key: "costo_prom", label: "Costo Promedio" },
      { key: "valor_total", label: "Valor Total" },
    ],
    rotacion: [
      { key: "codigo", label: "Código" },
      { key: "descripcion", label: "Producto" },
      { key: "total_movimientos", label: "Total Movimientos" },
    ],
  };

  const titulosPorTipo = {
    existencias: "Reporte de Existencias",
    movimientos: "Reporte de Movimientos",
    valorizacion: "Reporte de Valorización",
    rotacion: "Reporte de Rotación",
  };

  const columnas = columnasPorTipo[tipo];
  if (!columnas) {
    throw new Error(`Tipo de reporte no válido: ${tipo}`);
  }

  const titulo = titulosPorTipo[tipo];
  const metadata = {
    titulo,
    fecha: fechaGeneracion,
  };

  const contenidoCSV = generarCSV(datos, columnas, metadata);
  const nombreArchivo = `${tipo}-inventario-${new Date().toISOString().slice(0, 10)}.csv`;

  descargarCSV(contenidoCSV, nombreArchivo);
}
