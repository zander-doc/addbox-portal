/**
 * reportes-inventario.controller.js
 * Controller para el módulo de reportes de inventario.
 * Orquesta generación de reportes según tipo seleccionado, gestiona filtros,
 * aplica defaults (30 días para movimientos) y gestiona exportación CSV.
 * Restringe exportación: solo admin/jefe pueden exportar.
 *
 * Requirements: 9.2, 9.4, 10.3
 */

import {
  reporteExistencias,
  reporteMovimientos,
  reporteValorizacion,
  reporteRotacion,
  exportarReporte,
} from "./reportes-inventario.service.js";

import { getSession } from "../../services/sessionService.js";
import { showToast } from "../../services/toastService.js";

// ─── Estado interno ────────────────────────────────────────────────────────────

let usuario = null;
let rolUsuario = null;

/** Tipo de reporte activo */
let tipoReporteActual = "existencias";

/** Datos del último reporte generado */
let datosReporte = [];

/** Gran total (para existencias y valorización) */
let granTotal = 0;

/** Indica si se está generando un reporte */
let cargando = false;

/** Filtros actuales para reporte de movimientos */
let filtrosMovimientos = {
  fechaInicio: null,
  fechaFin: null,
  tipo: null,
  productoId: null,
  obraId: null,
};

/** Filtros actuales para reporte de rotación */
let filtrosRotacion = {
  fechaInicio: null,
  fechaFin: null,
};

// ─── Constantes ────────────────────────────────────────────────────────────────

const ROLES_EXPORTAR = ["admin", "jefe"];
const TIPOS_REPORTE = ["existencias", "movimientos", "valorizacion", "rotacion"];

// ─── Inicialización ────────────────────────────────────────────────────────────

/**
 * Inicializa el controller de reportes de inventario.
 * Debe llamarse después de que el DOM de reportes-inventario.html esté disponible.
 */
export async function initReportesController() {
  // Verificar sesión
  const session = getSession();
  if (!session) {
    window.location.href = "/admin-dashboard/inicio-de-sesion.html";
    return;
  }

  usuario = session.user;

  // Obtener rol del usuario
  rolUsuario = await obtenerRolUsuario(usuario.id);
  if (!rolUsuario) {
    showToast("Error al obtener perfil de usuario", "error");
    return;
  }

  configurarEventos();
  aplicarRestriccionesRol();
  aplicarFiltrosDefault();

  // Generar reporte inicial (existencias)
  await generarReporte();
}

// ─── Configuración de eventos ──────────────────────────────────────────────────

function configurarEventos() {
  // Selector de tipo de reporte
  const selectorTipo = document.getElementById("selectorTipoReporte");
  if (selectorTipo) {
    selectorTipo.addEventListener("change", handleCambioTipoReporte);
  }

  // Botón generar reporte
  const btnGenerar = document.getElementById("btnGenerarReporte");
  if (btnGenerar) {
    btnGenerar.addEventListener("click", generarReporte);
  }

  // Botón exportar CSV
  const btnExportar = document.getElementById("btnExportarCSV");
  if (btnExportar) {
    btnExportar.addEventListener("click", handleExportarCSV);
  }

  // Filtros de movimientos
  const inputFechaInicio = document.getElementById("filtroFechaInicio");
  if (inputFechaInicio) {
    inputFechaInicio.addEventListener("change", handleCambioFiltro);
  }

  const inputFechaFin = document.getElementById("filtroFechaFin");
  if (inputFechaFin) {
    inputFechaFin.addEventListener("change", handleCambioFiltro);
  }

  const selectTipoMov = document.getElementById("filtroTipoMovimiento");
  if (selectTipoMov) {
    selectTipoMov.addEventListener("change", handleCambioFiltro);
  }

  const selectProducto = document.getElementById("filtroProducto");
  if (selectProducto) {
    selectProducto.addEventListener("change", handleCambioFiltro);
  }

  const selectObra = document.getElementById("filtroObra");
  if (selectObra) {
    selectObra.addEventListener("change", handleCambioFiltro);
  }
}

// ─── Restricciones de rol (Req 10.3) ───────────────────────────────────────────

/**
 * Aplica restricciones de UI según el rol del usuario.
 * Req 10.3: solo admin/jefe pueden exportar reportes.
 */
function aplicarRestriccionesRol() {
  const btnExportar = document.getElementById("btnExportarCSV");
  if (btnExportar) {
    if (!ROLES_EXPORTAR.includes(rolUsuario)) {
      // Ocultar botón de exportar para roles sin permiso
      btnExportar.style.display = "none";
    }
  }
}

// ─── Filtros y defaults (Req 9.2) ──────────────────────────────────────────────

/**
 * Aplica filtros por defecto: últimos 30 días para movimientos y rotación.
 * Req 9.2: aplicar por defecto el rango de los últimos 30 días naturales.
 */
function aplicarFiltrosDefault() {
  const ahora = new Date();
  const hace30Dias = new Date(ahora);
  hace30Dias.setDate(hace30Dias.getDate() - 30);

  const fechaFinStr = formatearFechaInput(ahora);
  const fechaInicioStr = formatearFechaInput(hace30Dias);

  // Setear valores en inputs de fecha
  const inputFechaInicio = document.getElementById("filtroFechaInicio");
  const inputFechaFin = document.getElementById("filtroFechaFin");

  if (inputFechaInicio) inputFechaInicio.value = fechaInicioStr;
  if (inputFechaFin) inputFechaFin.value = fechaFinStr;

  // Actualizar estado de filtros
  filtrosMovimientos.fechaInicio = hace30Dias.toISOString();
  filtrosMovimientos.fechaFin = ahora.toISOString();
  filtrosRotacion.fechaInicio = hace30Dias.toISOString();
  filtrosRotacion.fechaFin = ahora.toISOString();
}

// ─── Handlers de eventos ───────────────────────────────────────────────────────

/**
 * Maneja el cambio de tipo de reporte seleccionado.
 * Muestra/oculta filtros según el tipo.
 */
function handleCambioTipoReporte(event) {
  const nuevoTipo = event.target.value;
  if (!TIPOS_REPORTE.includes(nuevoTipo)) return;

  tipoReporteActual = nuevoTipo;
  mostrarFiltrosSegunTipo(nuevoTipo);

  // Limpiar datos previos
  datosReporte = [];
  granTotal = 0;
  renderTablaReporte();
}

/**
 * Maneja cambios en los filtros.
 * Actualiza el estado interno de filtros.
 */
function handleCambioFiltro() {
  const inputFechaInicio = document.getElementById("filtroFechaInicio");
  const inputFechaFin = document.getElementById("filtroFechaFin");
  const selectTipoMov = document.getElementById("filtroTipoMovimiento");
  const selectProducto = document.getElementById("filtroProducto");
  const selectObra = document.getElementById("filtroObra");

  if (inputFechaInicio && inputFechaInicio.value) {
    const fecha = new Date(inputFechaInicio.value);
    filtrosMovimientos.fechaInicio = fecha.toISOString();
    filtrosRotacion.fechaInicio = fecha.toISOString();
  }

  if (inputFechaFin && inputFechaFin.value) {
    const fecha = new Date(inputFechaFin.value + "T23:59:59");
    filtrosMovimientos.fechaFin = fecha.toISOString();
    filtrosRotacion.fechaFin = fecha.toISOString();
  }

  if (selectTipoMov) {
    filtrosMovimientos.tipo = selectTipoMov.value || null;
  }

  if (selectProducto) {
    filtrosMovimientos.productoId = selectProducto.value || null;
  }

  if (selectObra) {
    filtrosMovimientos.obraId = selectObra.value || null;
  }
}

/**
 * Maneja la exportación CSV.
 * Req 9.4: exportar reporte en formato CSV con encabezado y fecha.
 * Req 10.3: solo admin/jefe pueden exportar.
 */
function handleExportarCSV() {
  // Verificar permisos de exportación
  if (!ROLES_EXPORTAR.includes(rolUsuario)) {
    showToast("No tiene permisos para exportar reportes", "error");
    return;
  }

  if (datosReporte.length === 0) {
    showToast("No hay datos para exportar. Genere un reporte primero.", "warning");
    return;
  }

  try {
    exportarReporte(datosReporte, tipoReporteActual);
    showToast("Reporte exportado exitosamente", "success");
  } catch (err) {
    console.error("Error exportando reporte:", err);
    showToast("Error al exportar el reporte", "error");
  }
}

// ─── Generación de reportes ────────────────────────────────────────────────────

/**
 * Genera el reporte según el tipo seleccionado y los filtros aplicados.
 * Orquesta la llamada al servicio correspondiente y renderiza los resultados.
 */
async function generarReporte() {
  if (cargando) return;

  cargando = true;
  mostrarEstadoCargando(true);

  try {
    let resultado;

    switch (tipoReporteActual) {
      case "existencias":
        resultado = await reporteExistencias();
        datosReporte = resultado.datos;
        granTotal = resultado.granTotal;
        break;

      case "movimientos":
        resultado = await reporteMovimientos({
          fechaInicio: filtrosMovimientos.fechaInicio,
          fechaFin: filtrosMovimientos.fechaFin,
          tipo: filtrosMovimientos.tipo,
          productoId: filtrosMovimientos.productoId,
          obraId: filtrosMovimientos.obraId,
        });
        datosReporte = resultado.datos;
        granTotal = 0;
        break;

      case "valorizacion":
        resultado = await reporteValorizacion();
        datosReporte = resultado.datos;
        granTotal = resultado.granTotal;
        break;

      case "rotacion":
        resultado = await reporteRotacion(
          filtrosRotacion.fechaInicio,
          filtrosRotacion.fechaFin
        );
        datosReporte = resultado.datos;
        granTotal = 0;
        break;

      default:
        showToast("Tipo de reporte no válido", "error");
        return;
    }

    renderTablaReporte();

    // Req 9.6: mostrar mensaje si no hay datos
    if (datosReporte.length === 0) {
      mostrarMensajeSinDatos();
    }
  } catch (err) {
    console.error("Error generando reporte:", err);
    showToast("Error al generar el reporte", "error");
    datosReporte = [];
    granTotal = 0;
    renderTablaReporte();
  } finally {
    cargando = false;
    mostrarEstadoCargando(false);
  }
}

// ─── Renderizado de UI ─────────────────────────────────────────────────────────

/**
 * Muestra/oculta secciones de filtros según el tipo de reporte.
 * Movimientos y rotación muestran filtros de fecha; movimientos muestra filtros adicionales.
 */
function mostrarFiltrosSegunTipo(tipo) {
  const filtrosFechas = document.getElementById("filtrosFechas");
  const filtrosAdicionales = document.getElementById("filtrosAdicionales");

  if (filtrosFechas) {
    const mostrarFechas = tipo === "movimientos" || tipo === "rotacion";
    filtrosFechas.style.display = mostrarFechas ? "" : "none";
  }

  if (filtrosAdicionales) {
    const mostrarAdicionales = tipo === "movimientos";
    filtrosAdicionales.style.display = mostrarAdicionales ? "" : "none";
  }
}

/**
 * Renderiza la tabla de resultados del reporte.
 */
function renderTablaReporte() {
  const contenedor = document.getElementById("tablaReporteBody");
  if (!contenedor) return;

  if (datosReporte.length === 0) {
    contenedor.innerHTML = "";
    return;
  }

  let html = "";

  switch (tipoReporteActual) {
    case "existencias":
      html = renderFilasExistencias(datosReporte);
      break;
    case "movimientos":
      html = renderFilasMovimientos(datosReporte);
      break;
    case "valorizacion":
      html = renderFilasValorizacion(datosReporte);
      break;
    case "rotacion":
      html = renderFilasRotacion(datosReporte);
      break;
  }

  contenedor.innerHTML = html;

  // Mostrar gran total si aplica
  const totalElement = document.getElementById("reporteGranTotal");
  if (totalElement) {
    if (granTotal > 0 && (tipoReporteActual === "existencias" || tipoReporteActual === "valorizacion")) {
      totalElement.textContent = `Gran Total: $${granTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
      totalElement.style.display = "";
    } else {
      totalElement.style.display = "none";
    }
  }

  // Actualizar contador de registros
  const contadorRegistros = document.getElementById("contadorRegistros");
  if (contadorRegistros) {
    contadorRegistros.textContent = `${datosReporte.length} registro(s)`;
  }
}

/**
 * Renderiza filas para reporte de existencias.
 */
function renderFilasExistencias(datos) {
  return datos
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.codigo)}</td>
        <td>${escapeHtml(item.descripcion)}</td>
        <td>${escapeHtml(item.unidad)}</td>
        <td>${item.stock_total}</td>
        <td>$${(item.costo_prom || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
        <td>$${(item.valor_total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
      </tr>`
    )
    .join("");
}

/**
 * Renderiza filas para reporte de movimientos.
 */
function renderFilasMovimientos(datos) {
  return datos
    .map(
      (item) => `
      <tr>
        <td>${formatearFechaDisplay(item.fecha)}</td>
        <td>${escapeHtml(item.tipo)}</td>
        <td>${escapeHtml(item.producto_codigo)}</td>
        <td>${escapeHtml(item.producto_descripcion)}</td>
        <td>${item.cantidad}</td>
        <td>${escapeHtml(item.obra_nombre)}</td>
        <td>${escapeHtml(item.observacion || "")}</td>
      </tr>`
    )
    .join("");
}

/**
 * Renderiza filas para reporte de valorización.
 */
function renderFilasValorizacion(datos) {
  return datos
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.codigo)}</td>
        <td>${escapeHtml(item.descripcion)}</td>
        <td>${escapeHtml(item.unidad)}</td>
        <td>${escapeHtml(item.obra_nombre)}</td>
        <td>${item.cantidad}</td>
        <td>$${(item.costo_prom || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
        <td>$${(item.valor_total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
      </tr>`
    )
    .join("");
}

/**
 * Renderiza filas para reporte de rotación.
 */
function renderFilasRotacion(datos) {
  return datos
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.codigo)}</td>
        <td>${escapeHtml(item.descripcion)}</td>
        <td>${item.total_movimientos}</td>
      </tr>`
    )
    .join("");
}

/**
 * Muestra mensaje cuando no hay datos para los filtros seleccionados.
 * Req 9.6: mostrar mensaje indicando que no se encontraron datos.
 */
function mostrarMensajeSinDatos() {
  const contenedor = document.getElementById("tablaReporteBody");
  if (!contenedor) return;

  contenedor.innerHTML = `
    <tr>
      <td colspan="7" style="text-align:center;color:#9ca3af;padding:2rem;">
        No se encontraron datos para los criterios seleccionados.
      </td>
    </tr>
  `;
}

/**
 * Muestra/oculta indicador de carga.
 */
function mostrarEstadoCargando(mostrar) {
  const spinner = document.getElementById("reporteSpinner");
  if (spinner) {
    spinner.style.display = mostrar ? "" : "none";
  }

  const btnGenerar = document.getElementById("btnGenerarReporte");
  if (btnGenerar) {
    btnGenerar.disabled = mostrar;
    if (mostrar) {
      btnGenerar.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generando...';
    } else {
      btnGenerar.innerHTML = '<i class="fa fa-chart-bar"></i> Generar Reporte';
    }
  }
}

// ─── Utilidades ────────────────────────────────────────────────────────────────

/**
 * Obtiene el rol del usuario desde la base de datos.
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
async function obtenerRolUsuario(userId) {
  try {
    // Modo desarrollador: retornar admin por defecto
    if (localStorage.getItem("devMode") === "on") {
      return localStorage.getItem("devRole") || "admin";
    }

    const { supabase } = await import("../../services/supabase-client.js");
    const { data, error } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error obteniendo rol:", error);
      return null;
    }

    return data?.rol || null;
  } catch (err) {
    console.error("Error inesperado obteniendo rol:", err);
    return null;
  }
}

/**
 * Formatea una fecha para input type="date" (YYYY-MM-DD).
 * @param {Date} fecha
 * @returns {string}
 */
function formatearFechaInput(fecha) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha ISO para mostrar en la tabla.
 * @param {string} fechaISO
 * @returns {string}
 */
function formatearFechaDisplay(fechaISO) {
  if (!fechaISO) return "";
  try {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return fechaISO;
  }
}

/**
 * Escapa caracteres HTML para prevenir XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ─── Exports ───────────────────────────────────────────────────────────────────

export {
  generarReporte,
  handleExportarCSV as exportarCSV,
  tipoReporteActual as _tipoReporteActual,
  datosReporte as _datosReporte,
};
