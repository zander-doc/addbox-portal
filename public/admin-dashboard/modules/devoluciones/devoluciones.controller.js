/**
 * devoluciones.controller.js
 * Controlador del módulo de Devoluciones.
 * Muestra materiales fuera y permite registrar devoluciones parciales/totales.
 */

import { obtenerMaterialesFuera, registrarDevolucion, obtenerResumenDevoluciones, obtenerDetallesDocumento } from "./devoluciones.service.js";
import { showToast } from "../../services/toastService.js";

/** Umbral de vencimiento en días */
const UMBRAL_VENCIMIENTO = 7;

document.addEventListener("DOMContentLoaded", init);

/** Almacena todos los materiales cargados (sin filtrar) */
let materialesCompletos = [];

async function init() {
  await cargarMaterialesFuera();
  configurarEventos();
  configurarFiltros();
  iniciarRealtime();
}

// --- KPIs ---

/**
 * Calcula los 4 indicadores KPI a partir de un array de materiales fuera.
 * @param {Array} materiales - Array de objetos MaterialFuera (con pendiente > 0)
 * @param {number|Object} [opciones] - Conteo de devoluciones hoy (number) o un objeto { devolucionesHoy: number }
 * @returns {{materialesFuera: number, vencidos: number, diasPromedio: number, devolucionesHoy: number}}
 */
export function calcularKPIs(materiales, opciones) {
  if (!materiales || !Array.isArray(materiales) || materiales.length === 0) {
    // Preserve devolucionesHoy from opciones even with empty/null array
    let devHoy = 0;
    if (typeof opciones === "number") {
      devHoy = opciones;
    } else if (opciones && typeof opciones === "object" && typeof opciones.devolucionesHoy === "number") {
      devHoy = opciones.devolucionesHoy;
    }
    return { materialesFuera: 0, vencidos: 0, diasPromedio: 0, devolucionesHoy: devHoy };
  }

  // Materiales fuera: count de registros con pendiente > 0
  const materialesFuera = materiales.filter(m => m.pendiente > 0).length;

  // Vencidos: count de registros con pendiente > 0 AND dias_fuera > UMBRAL_VENCIMIENTO
  const vencidos = materiales.filter(m => m.pendiente > 0 && m.dias_fuera > UMBRAL_VENCIMIENTO).length;

  // Días promedio fuera: media aritmética de dias_fuera de todos los materiales
  const sumaDias = materiales.reduce((sum, m) => sum + (m.dias_fuera || 0), 0);
  const diasPromedio = materiales.length > 0 ? Math.round(sumaDias / materiales.length) : 0;

  // Devoluciones hoy: use opciones if provided, otherwise count from materiales
  let devolucionesHoy = 0;
  if (typeof opciones === "number") {
    devolucionesHoy = opciones;
  } else if (opciones && typeof opciones === "object" && typeof opciones.devolucionesHoy === "number") {
    devolucionesHoy = opciones.devolucionesHoy;
  } else {
    // Count materials with fecha_devolucion matching today
    const hoy = new Date().toISOString().split("T")[0];
    devolucionesHoy = materiales.filter(m => m.fecha_devolucion === hoy).length;
  }

  return { materialesFuera, vencidos, diasPromedio, devolucionesHoy };
}

/**
 * Actualiza el DOM de las KPI cards con los valores calculados.
 * @param {{materialesFuera: number, vencidos: number, diasPromedio: number, devolucionesHoy: number}} kpis
 */
function renderizarKPIs(kpis) {
  const elMaterialesFuera = document.getElementById("kpi-materiales-fuera");
  const elVencidos = document.getElementById("kpi-vencidos");
  const elDiasPromedio = document.getElementById("kpi-dias-promedio");
  const elDevolucionesHoy = document.getElementById("kpi-devoluciones-hoy");

  if (elMaterialesFuera) elMaterialesFuera.textContent = kpis.materialesFuera;
  if (elVencidos) elVencidos.textContent = kpis.vencidos;
  if (elDiasPromedio) elDiasPromedio.textContent = kpis.diasPromedio;
  if (elDevolucionesHoy) elDevolucionesHoy.textContent = kpis.devolucionesHoy;
}

// --- Cargar tabla de materiales fuera ---
async function cargarMaterialesFuera() {
  const tbody = document.getElementById("materialesFueraBody");
  const badge = document.getElementById("badgePendientes");
  const badgeVencidos = document.getElementById("badgeVencidos");
  if (!tbody) return;

  try {
    const materiales = await obtenerMaterialesFuera({ incluirCerrados: true });
    materialesCompletos = materiales;

    // Obtener devoluciones de hoy desde el servicio
    let devolucionesHoy = 0;
    try {
      const resumen = await obtenerResumenDevoluciones(UMBRAL_VENCIMIENTO);
      devolucionesHoy = resumen.devolucionesHoy || 0;
    } catch (e) {
      // Si falla la consulta de resumen, continuar con 0
      console.warn("[Devoluciones] No se pudo obtener devolucionesHoy:", e);
    }

    // Calcular y renderizar KPIs
    const kpis = calcularKPIs(materiales, { devolucionesHoy });
    renderizarKPIs(kpis);

    // Actualizar badges
    if (badge) badge.textContent = materiales.length;
    if (badgeVencidos) badgeVencidos.textContent = kpis.vencidos;

    // Actualizar badge del sidebar (si está disponible)
    if (typeof window.actualizarBadgeDevoluciones === "function") {
      window.actualizarBadgeDevoluciones();
    }

    // Aplicar filtros activos y renderizar
    const filtros = obtenerFiltrosActivos();
    const filtrados = aplicarFiltros(materiales, filtros);
    renderizarTablaFiltrada(filtrados);

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#ef4444;">Error: ${esc(err.message)}</td></tr>`;
    // Mostrar cero en KPIs cuando hay error
    renderizarKPIs({ materialesFuera: 0, vencidos: 0, diasPromedio: 0, devolucionesHoy: 0 });
  }
}

/**
 * Determina el indicador de estado visual para un material.
 * - 🟢 si pendiente == 0 (completamente devuelto)
 * - 🟡 si pendiente > 0 y dias_fuera <= UMBRAL_VENCIMIENTO
 * - 🔴 si pendiente > 0 y dias_fuera > UMBRAL_VENCIMIENTO
 * @param {Object} material - Objeto MaterialFuera
 * @param {number} [umbral] - Umbral de vencimiento (default: UMBRAL_VENCIMIENTO)
 * @returns {string} Emoji indicador
 */
export function determinarIndicador(material, umbral) {
  const limite = typeof umbral === "number" ? umbral : UMBRAL_VENCIMIENTO;
  if (!material || material.pendiente <= 0) return "🟢";
  if (material.dias_fuera > limite) return "🔴";
  return "🟡";
}

/**
 * Renderiza la tabla con los materiales proporcionados (ya filtrados).
 * @param {Array} materiales - Array de materiales a mostrar
 */
function renderizarTablaFiltrada(materiales) {
  const tbody = document.getElementById("materialesFueraBody");
  if (!tbody) return;

  if (materiales.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#22c55e;padding:30px;">
      <i class="fa fa-check-circle" style="font-size:24px;"></i><br>
      Todos los materiales han sido devueltos
    </td></tr>`;
    return;
  }

  tbody.innerHTML = materiales.map(m => {
    const indicador = determinarIndicador(m);
    const diasClass = m.dias_fuera > UMBRAL_VENCIMIENTO ? "dias-vencido" : m.dias_fuera > 3 ? "dias-alerta" : "dias-ok";
    const acciones = m.pendiente > 0
      ? `<button class="btn-devolver" title="Registrar devolución"><i class="fa fa-rotate-left"></i></button>
         <button class="btn-devolver-todo" title="Devolver todo"><i class="fa fa-check-double"></i></button>`
      : "";

    // Columna Estado: mostrar badge de motivo si está cerrado, o indicador si está pendiente
    let estadoHTML = indicador;
    if (m.pendiente <= 0 && m.motivo_cierre) {
      const motivoLabels = {
        devuelto: "Devuelto",
        consumido: "Consumido",
        extraviado: "Extraviado",
        danado_baja: "Baja",
        danado_reparacion: "Reparación 🔧"
      };
      const label = motivoLabels[m.motivo_cierre] || m.motivo_cierre;
      estadoHTML = `<span class="badge-motivo ${m.motivo_cierre}">${label}</span>`;
    } else if (m.estado_especial === "en_reparacion") {
      estadoHTML += " 🔧";
    }

    return `<tr data-detalle-id="${m.detalle_id}" data-doc-id="${m.documento_id}" data-pendiente="${m.pendiente}">
      <td><span class="doc-numero">${esc(m.numero)}</span></td>
      <td>${esc(m.proyecto)}</td>
      <td><strong>${esc(m.descripcion)}</strong><br><small style="color:#9ca3af;">${esc(m.codigo)}</small></td>
      <td style="text-align:center;">${m.cantidad}</td>
      <td style="text-align:center;color:#22c55e;">${m.devuelta}</td>
      <td style="text-align:center;font-weight:bold;color:#f59e0b;">${m.pendiente}</td>
      <td style="text-align:center;"><span class="${diasClass}">${m.dias_fuera}d</span></td>
      <td style="text-align:center;">${estadoHTML}</td>
      <td>${acciones}</td>
    </tr>`;
  }).join("");
}

// --- Filtros ---

/**
 * Configura event listeners en todos los controles de filtro.
 * Cada cambio dispara la re-aplicación de filtros y re-renderizado de la tabla.
 */
function configurarFiltros() {
  const ids = [
    "filtro-busqueda",
    "filtro-tipo",
    "filtro-estado",
    "filtro-fecha-desde",
    "filtro-fecha-hasta",
    "filtro-dias-min",
    "filtro-dias-max"
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const evento = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evento, () => {
      const filtros = obtenerFiltrosActivos();
      const filtrados = aplicarFiltros(materialesCompletos, filtros);
      renderizarTablaFiltrada(filtrados);
    });
  });

  // Toggle "Mostrar documentos cerrados"
  const toggleCerrados = document.getElementById("toggleCerrados");
  if (toggleCerrados) {
    toggleCerrados.addEventListener("change", () => {
      const filtros = obtenerFiltrosActivos();
      const filtrados = aplicarFiltros(materialesCompletos, filtros);
      renderizarTablaFiltrada(filtrados);
    });
  }
}

/**
 * Lee los valores actuales de los controles de filtro del DOM.
 * @returns {Object} Objeto con los filtros activos
 */
function obtenerFiltrosActivos() {
  return {
    busqueda: (document.getElementById("filtro-busqueda")?.value || "").trim(),
    tipo: (document.getElementById("filtro-tipo")?.value || "").trim(),
    estado: (document.getElementById("filtro-estado")?.value || "").trim(),
    fechaDesde: (document.getElementById("filtro-fecha-desde")?.value || "").trim(),
    fechaHasta: (document.getElementById("filtro-fecha-hasta")?.value || "").trim(),
    diasMin: document.getElementById("filtro-dias-min")?.value || "",
    diasMax: document.getElementById("filtro-dias-max")?.value || ""
  };
}

/**
 * Aplica filtros con semántica de intersección (AND) sobre un array de materiales.
 * Cada filtro activo reduce el conjunto de resultados.
 *
 * @param {Array} materiales - Array de objetos MaterialFuera
 * @param {Object} filtros - Objeto con los criterios de filtro
 * @param {string} filtros.busqueda - Texto de búsqueda libre
 * @param {string} filtros.tipo - Tipo de documento
 * @param {string} filtros.estado - Estado: "pendiente" | "vencido" | "cerrado"
 * @param {string} filtros.fechaDesde - Fecha inicio (ISO string YYYY-MM-DD)
 * @param {string} filtros.fechaHasta - Fecha fin (ISO string YYYY-MM-DD)
 * @param {string|number} filtros.diasMin - Mínimo de días fuera
 * @param {string|number} filtros.diasMax - Máximo de días fuera
 * @returns {Array} Materiales que cumplen todos los filtros activos
 */
export function aplicarFiltros(materiales, filtros) {
  if (!materiales || !Array.isArray(materiales)) return [];
  if (!filtros) return materiales;

  // Toggle "Mostrar documentos cerrados"
  const mostrarCerrados = document.getElementById("toggleCerrados")?.checked || false;

  return materiales.filter(m => {
    // Ocultar items con pendiente === 0 si el toggle no está activo
    if (!mostrarCerrados && m.pendiente === 0) return false;

    // Filtro texto: buscar en número documento, descripción producto, código, proyecto
    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase();
      const campos = [
        (m.numero || "").toLowerCase(),
        (m.descripcion || "").toLowerCase(),
        (m.codigo || "").toLowerCase(),
        (m.proyecto || "").toLowerCase()
      ];
      const coincide = campos.some(campo => campo.includes(q));
      if (!coincide) return false;
    }

    // Filtro tipo: match exacto contra material.tipo
    if (filtros.tipo) {
      if (m.tipo !== filtros.tipo) return false;
    }

    // Filtro estado: lógica según definición
    // "pendiente" = pendiente > 0 AND dias_fuera <= UMBRAL_VENCIMIENTO
    // "vencido" = pendiente > 0 AND dias_fuera > UMBRAL_VENCIMIENTO
    // "cerrado" = estado_doc == "cerrado"
    if (filtros.estado) {
      const estado = filtros.estado.toLowerCase();
      if (estado === "pendiente") {
        if (!(m.pendiente > 0 && m.dias_fuera <= UMBRAL_VENCIMIENTO)) return false;
      } else if (estado === "vencido") {
        if (!(m.pendiente > 0 && m.dias_fuera > UMBRAL_VENCIMIENTO)) return false;
      } else if (estado === "cerrado") {
        if (m.estado_doc !== "cerrado") return false;
      }
    }

    // Filtro rango fechas: aplicado a fecha_salida (fecha de creación del documento)
    if (filtros.fechaDesde) {
      const fechaDesde = new Date(filtros.fechaDesde);
      const fechaMaterial = new Date(m.fecha_salida);
      if (fechaMaterial < fechaDesde) return false;
    }
    if (filtros.fechaHasta) {
      const fechaHasta = new Date(filtros.fechaHasta);
      const fechaMaterial = new Date(m.fecha_salida);
      if (fechaMaterial > fechaHasta) return false;
    }

    // Filtro rango días fuera: mínimo y máximo de dias_fuera
    if (filtros.diasMin !== "" && filtros.diasMin !== null && filtros.diasMin !== undefined) {
      const min = Number(filtros.diasMin);
      if (!isNaN(min) && m.dias_fuera < min) return false;
    }
    if (filtros.diasMax !== "" && filtros.diasMax !== null && filtros.diasMax !== undefined) {
      const max = Number(filtros.diasMax);
      if (!isNaN(max) && m.dias_fuera > max) return false;
    }

    return true;
  });
}

// --- Eventos ---
function configurarEventos() {
  const tbody = document.getElementById("materialesFueraBody");
  if (!tbody) return;

  tbody.addEventListener("click", async (e) => {
    const btnDevolver = e.target.closest(".btn-devolver");
    const btnDevolverTodo = e.target.closest(".btn-devolver-todo");
    const tr = e.target.closest("tr");
    if (!tr) return;

    const detalleId = tr.dataset.detalleId;
    const docId = tr.dataset.docId;
    const pendiente = parseFloat(tr.dataset.pendiente) || 0;

    if (btnDevolverTodo) {
      if (!confirm(`¿Devolver TODO (${pendiente} unidades)?`)) return;
      try {
        await registrarDevolucion(detalleId, pendiente, docId);
        showToast(`Devuelto: ${pendiente} unidades`, "success");
        await cargarMaterialesFuera();
      } catch (err) {
        showToast("Error: " + err.message, "error");
      }
      return;
    }

    if (btnDevolver) {
      abrirModalDevolucion(docId);
    }
  });

  // Modal buttons
  const btnCancelar = document.getElementById("btn-cancelar-modal");
  const btnConfirmar = document.getElementById("btn-confirmar-devolucion");
  if (btnCancelar) btnCancelar.addEventListener("click", cerrarModal);
  if (btnConfirmar) btnConfirmar.addEventListener("click", confirmarDevolucion);
}

// --- Modal de devolución ---

/** ID del documento actualmente abierto en el modal */
let modalDocumentoId = null;

/**
 * Abre el modal de devolución con los detalles del documento.
 * @param {string} docId - ID del documento
 */
async function abrirModalDevolucion(docId) {
  const modal = document.getElementById("modal-devolucion");
  if (!modal) return;

  modalDocumentoId = docId;

  // Buscar info del documento en materialesCompletos
  const docMaterial = materialesCompletos.find(m => m.documento_id === docId);
  document.getElementById("modal-doc-numero").textContent = docMaterial?.numero || "-";
  document.getElementById("modal-doc-tipo").textContent = docMaterial?.tipo || "-";
  document.getElementById("modal-doc-proyecto").textContent = docMaterial?.proyecto || "-";
  document.getElementById("modal-doc-fecha").textContent = docMaterial?.fecha_salida
    ? new Date(docMaterial.fecha_salida).toLocaleDateString("es-MX")
    : "-";

  // Cargar detalles del documento
  const tbody = document.getElementById("modal-productos-body");
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#9ca3af;">Cargando productos...</td></tr>`;
  modal.classList.add("show");

  try {
    const detalles = await obtenerDetallesDocumento(docId);
    if (!detalles || detalles.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#9ca3af;">Sin productos pendientes</td></tr>`;
      return;
    }

    tbody.innerHTML = detalles.map(det => {
      const maxVal = det.pendiente > 0 ? det.pendiente : 0;
      const inputDisabled = maxVal <= 0 ? "disabled" : "";
      const selectDisabled = maxVal <= 0 ? "disabled" : "";
      return `<tr data-detalle-id="${det.detalle_id}" data-doc-id="${docId}" data-pendiente="${det.pendiente}">
        <td><strong>${esc(det.descripcion)}</strong><br><small style="color:#9ca3af;">${esc(det.codigo)}</small></td>
        <td style="text-align:center;">${det.cantidad}</td>
        <td style="text-align:center;color:#22c55e;">${det.devuelta}</td>
        <td style="text-align:center;font-weight:bold;color:#f59e0b;">${det.pendiente}</td>
        <td style="text-align:center;">
          <input type="number" class="input-devolver-ahora" min="0" max="${maxVal}" value="0" ${inputDisabled} data-max="${maxVal}">
        </td>
        <td style="text-align:center;">
          <select class="select-motivo" ${selectDisabled}>
            <option value="devuelto" selected>Devuelto</option>
            <option value="consumido">Consumido</option>
            <option value="extraviado">Extraviado</option>
            <option value="danado_baja">Dañado - Baja</option>
            <option value="danado_reparacion">Dañado - Reparación</option>
          </select>
        </td>
      </tr>`;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#ef4444;">Error: ${esc(err.message)}</td></tr>`;
  }
}

/**
 * Cierra el modal de devolución y limpia su estado.
 */
function cerrarModal() {
  const modal = document.getElementById("modal-devolucion");
  if (modal) modal.classList.remove("show");
  modalDocumentoId = null;
  const tbody = document.getElementById("modal-productos-body");
  if (tbody) tbody.innerHTML = "";
}

/**
 * Procesa la devolución desde el modal.
 * Invoca el servicio para cada producto con valor > 0 en "Devolver ahora".
 */
async function confirmarDevolucion() {
  const inputs = document.querySelectorAll("#modal-productos-body .input-devolver-ahora");
  if (!inputs || inputs.length === 0) return;

  // Validar todos los inputs antes de enviar
  let hayError = false;
  const devoluciones = [];

  inputs.forEach(input => {
    const valor = parseFloat(input.value) || 0;
    const max = parseFloat(input.dataset.max) || 0;
    const tr = input.closest("tr");
    const detalleId = tr?.dataset.detalleId;
    const docId = tr?.dataset.docId;

    // Limpiar estado de error previo
    input.classList.remove("input-error");

    if (valor < 0 || valor > max) {
      input.classList.add("input-error");
      hayError = true;
    }

    if (valor > 0 && detalleId) {
      // Leer motivo del select de la misma fila
      const selectMotivo = tr?.querySelector(".select-motivo");
      const motivo = selectMotivo?.value || "devuelto";
      devoluciones.push({ detalleId, cantidad: valor, docId, motivo });
    }
  });

  if (hayError) {
    showToast("Hay cantidades inválidas. Revisa los campos marcados en rojo.", "error");
    return;
  }

  if (devoluciones.length === 0) {
    showToast("Ingresa al menos una cantidad a devolver", "error");
    return;
  }

  // Procesar cada devolución secuencialmente
  const btnConfirmar = document.getElementById("btn-confirmar-devolucion");
  if (btnConfirmar) btnConfirmar.disabled = true;

  try {
    for (const dev of devoluciones) {
      await registrarDevolucion(dev.detalleId, dev.cantidad, dev.docId || modalDocumentoId, dev.motivo);
    }
    showToast(`Devolución registrada correctamente (${devoluciones.length} producto${devoluciones.length > 1 ? "s" : ""})`, "success");
    cerrarModal();
    await cargarMaterialesFuera();
  } catch (err) {
    showToast("Error: " + err.message, "error");
  } finally {
    if (btnConfirmar) btnConfirmar.disabled = false;
  }
}

// --- Realtime ---
let realtimeSub = null;

/**
 * Inicia la suscripción realtime a UPDATE en documentos_inventario_detalle.
 * Al recibir un evento, refresca KPIs y tabla.
 * Maneja pérdida de conexión con re-suscripción automática.
 */
function iniciarRealtime() {
  if (!window.supabaseClient && !window.supabase) return;
  const sb = window.supabaseClient || window.supabase;

  realtimeSub = sb
    .from("documentos_inventario_detalle")
    .on("UPDATE", () => cargarMaterialesFuera())
    .subscribe((status) => {
      if (status === "SUBSCRIPTION_ERROR" || status === "CHANNEL_ERROR") {
        console.warn("[Devoluciones] Realtime subscription error, retrying in 5s...");
        setTimeout(() => {
          destruirRealtime();
          iniciarRealtime();
        }, 5000);
      }
    });
}

/**
 * Destruye la suscripción realtime para prevenir memory leaks.
 * Se invoca al navegar fuera del módulo.
 */
function destruirRealtime() {
  if (realtimeSub) {
    const sb = window.supabaseClient || window.supabase;
    if (sb && sb.removeSubscription) {
      sb.removeSubscription(realtimeSub);
    }
    realtimeSub = null;
  }
}

window.addEventListener("beforeunload", destruirRealtime);

// --- Utilidades ---
function esc(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
