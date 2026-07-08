/**
 * reportes-cierre.controller.js
 * Controlador de la página de reportes de motivo de cierre.
 * Renderiza KPIs, tablas, filtros y exportación CSV.
 */

import {
  obtenerExtraviadosConCosto,
  obtenerEnReparacion,
  obtenerConsumiblesPorProyecto,
  calcularKPIsReporte
} from "../devoluciones/reportes-cierre.service.js";

/** Datos cargados (sin filtrar) */
let datosExtraviados = [];
let datosReparacion = [];
let datosConsumibles = [];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const [extraviados, reparacion, consumibles] = await Promise.all([
      obtenerExtraviadosConCosto(),
      obtenerEnReparacion(),
      obtenerConsumiblesPorProyecto()
    ]);

    datosExtraviados = extraviados;
    datosReparacion = reparacion;
    datosConsumibles = consumibles;

    // KPIs
    const kpis = calcularKPIsReporte(extraviados, reparacion);
    renderizarKPIs(kpis);

    // Tablas
    renderizarTablaExtraviados(extraviados);
    renderizarTablaReparacion(reparacion);
    renderizarTablaConsumibles(consumibles);

    // Filtros
    poblarFiltroProyectos(extraviados);
    configurarFiltros();
    configurarExportCSV();

  } catch (err) {
    console.error("[Reportes Cierre] Error al cargar:", err);
    renderizarKPIs({ totalExtraviados: 0, totalEnReparacion: 0, costoTotalPerdidas: 0 });
  }
}

// --- KPIs ---

function renderizarKPIs(kpis) {
  const elExtraviados = document.getElementById("kpi-total-extraviados");
  const elReparacion = document.getElementById("kpi-total-reparacion");
  const elCosto = document.getElementById("kpi-costo-perdidas");

  if (elExtraviados) elExtraviados.textContent = kpis.totalExtraviados;
  if (elReparacion) elReparacion.textContent = kpis.totalEnReparacion;
  if (elCosto) elCosto.textContent = formatearMoneda(kpis.costoTotalPerdidas);
}

// --- Tablas ---

function renderizarTablaExtraviados(datos) {
  const tbody = document.getElementById("tabla-extraviados-body");
  if (!tbody) return;

  if (!datos || datos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:20px;">No hay herramientas extraviadas registradas</td></tr>`;
    return;
  }

  tbody.innerHTML = datos.map(d => `<tr>
    <td>${esc(d.codigo)}</td>
    <td>${esc(d.descripcion)}</td>
    <td style="text-align:center;">${d.cantidad_devuelta}</td>
    <td>${esc(d.proyecto)}</td>
    <td>${d.creado_en ? new Date(d.creado_en).toLocaleDateString("es-MX") : "-"}</td>
    <td style="text-align:right;">${formatearMoneda(d.costo_prom)}</td>
    <td style="text-align:right;font-weight:bold;color:#ef4444;">${formatearMoneda(d.costo_perdida)}</td>
  </tr>`).join("");
}

function renderizarTablaReparacion(datos) {
  const tbody = document.getElementById("tabla-reparacion-body");
  if (!tbody) return;

  if (!datos || datos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px;">No hay herramientas en reparación</td></tr>`;
    return;
  }

  tbody.innerHTML = datos.map(d => `<tr>
    <td>${esc(d.codigo)}</td>
    <td>${esc(d.descripcion)}</td>
    <td style="text-align:center;">${d.cantidad_devuelta}</td>
    <td>${esc(d.proyecto)}</td>
    <td>${d.creado_en ? new Date(d.creado_en).toLocaleDateString("es-MX") : "-"}</td>
    <td><span style="background:rgba(234,179,8,0.2);color:#eab308;padding:2px 8px;border-radius:4px;font-size:11px;">🔧 En reparación</span></td>
  </tr>`).join("");
}

function renderizarTablaConsumibles(datos) {
  const tbody = document.getElementById("tabla-consumibles-body");
  if (!tbody) return;

  if (!datos || datos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:20px;">No hay consumibles registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = datos.map(d => `<tr>
    <td>${esc(d.proyecto)}</td>
    <td style="text-align:center;">${d.total_items}</td>
    <td style="text-align:right;font-weight:bold;">${formatearMoneda(d.costo_total)}</td>
  </tr>`).join("");
}

// --- Filtros ---

function poblarFiltroProyectos(datos) {
  const select = document.getElementById("filtro-proyecto-extraviados");
  if (!select) return;

  const proyectos = [...new Set(datos.map(d => d.proyecto).filter(Boolean))];
  proyectos.sort();

  select.innerHTML = `<option value="">Todos los proyectos</option>` +
    proyectos.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join("");
}

function configurarFiltros() {
  const ids = ["filtro-proyecto-extraviados", "filtro-fecha-desde-ext", "filtro-fecha-hasta-ext"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const evento = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evento, () => {
      const filtros = {
        proyecto: document.getElementById("filtro-proyecto-extraviados")?.value || "",
        fechaDesde: document.getElementById("filtro-fecha-desde-ext")?.value || "",
        fechaHasta: document.getElementById("filtro-fecha-hasta-ext")?.value || ""
      };
      const filtrados = aplicarFiltrosExtraviados(datosExtraviados, filtros);
      renderizarTablaExtraviados(filtrados);
    });
  });
}

/**
 * Aplica filtros con semántica AND sobre la tabla de extraviados.
 * @param {Array} datos
 * @param {Object} filtros - { proyecto, fechaDesde, fechaHasta }
 * @returns {Array}
 */
export function aplicarFiltrosExtraviados(datos, filtros) {
  if (!datos || !Array.isArray(datos)) return [];
  if (!filtros) return datos;

  return datos.filter(d => {
    if (filtros.proyecto && d.proyecto !== filtros.proyecto) return false;
    if (filtros.fechaDesde) {
      if (new Date(d.creado_en) < new Date(filtros.fechaDesde)) return false;
    }
    if (filtros.fechaHasta) {
      if (new Date(d.creado_en) > new Date(filtros.fechaHasta)) return false;
    }
    return true;
  });
}

// --- Exportación CSV ---

function configurarExportCSV() {
  const btnExt = document.getElementById("btn-csv-extraviados");
  const btnRep = document.getElementById("btn-csv-reparacion");
  const btnCon = document.getElementById("btn-csv-consumibles");

  if (btnExt) btnExt.addEventListener("click", () => {
    const filtros = {
      proyecto: document.getElementById("filtro-proyecto-extraviados")?.value || "",
      fechaDesde: document.getElementById("filtro-fecha-desde-ext")?.value || "",
      fechaHasta: document.getElementById("filtro-fecha-hasta-ext")?.value || ""
    };
    const datos = aplicarFiltrosExtraviados(datosExtraviados, filtros);
    const columnas = [
      { key: "codigo", label: "Código" },
      { key: "descripcion", label: "Descripción" },
      { key: "cantidad_devuelta", label: "Cantidad" },
      { key: "proyecto", label: "Proyecto" },
      { key: "creado_en", label: "Fecha" },
      { key: "costo_prom", label: "Costo Unitario" },
      { key: "costo_perdida", label: "Costo Total" }
    ];
    descargarCSV(generarCSV(datos, columnas), `extraviados_${hoy()}.csv`);
  });

  if (btnRep) btnRep.addEventListener("click", () => {
    const columnas = [
      { key: "codigo", label: "Código" },
      { key: "descripcion", label: "Descripción" },
      { key: "cantidad_devuelta", label: "Cantidad" },
      { key: "proyecto", label: "Proyecto" },
      { key: "creado_en", label: "Fecha Registro" },
      { key: "estado_especial", label: "Estado" }
    ];
    descargarCSV(generarCSV(datosReparacion, columnas), `reparacion_${hoy()}.csv`);
  });

  if (btnCon) btnCon.addEventListener("click", () => {
    const columnas = [
      { key: "proyecto", label: "Proyecto" },
      { key: "total_items", label: "Total Items" },
      { key: "costo_total", label: "Costo Total" }
    ];
    descargarCSV(generarCSV(datosConsumibles, columnas), `consumibles_${hoy()}.csv`);
  });
}

/**
 * Genera un string CSV a partir de filas y definición de columnas.
 * @param {Array<Object>} filas
 * @param {Array<{key: string, label: string}>} columnas
 * @returns {string}
 */
export function generarCSV(filas, columnas) {
  if (!filas || !columnas) return "";
  const header = columnas.map(c => c.label).join(",");
  const rows = filas.map(fila =>
    columnas.map(c => {
      let val = fila[c.key] ?? "";
      if (typeof val === "string" && (val.includes(",") || val.includes('"'))) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(",")
  );
  return [header, ...rows].join("\n");
}

function descargarCSV(contenido, nombre) {
  try {
    const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("[Reportes] Error al generar CSV:", err);
  }
}

// --- Utilidades ---

/**
 * Formatea un número como moneda.
 * @param {number} valor
 * @returns {string}
 */
export function formatearMoneda(valor) {
  if (typeof valor !== "number" || isNaN(valor)) return "$0.00";
  return "$" + valor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function hoy() {
  return new Date().toISOString().split("T")[0];
}

function esc(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
