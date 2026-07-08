/**
 * inventario.controller.js
 * Orquestador de la vista de inventario multi-almacén.
 * Gestiona carga inicial, cambio de obra, suscripción realtime,
 * formulario de movimientos, paginación y visibilidad por rol.
 *
 * Requirements: 3.7, 4.1, 4.2, 4.3, 4.4, 4.6, 10.1
 */

import {
  obtenerStockPorObra,
  obtenerStockConsolidado,
  registrarEntrada,
  registrarSalida,
  registrarTransferencia,
  registrarAjuste,
  obtenerMovimientosPorObra,
  obtenerStockProductoObra,
} from "./inventario.service.js";

import {
  renderStockTabla,
  renderKPIs,
  calcularKPIs,
  renderPanelCriticos,
  renderRealtimeStatus,
  aplicarVisibilidadPorRol,
  renderSinObrasAsignadas,
} from "./inventario.ui.js";

import { getProductosPorCategoria } from "../productos/productos.service.js";
import { renderGraficaProductosPorCategoria } from "../productos/productos.ui.js";

import { RealtimeService } from "../../services/realtimeService.js";
import { obtenerProductosCriticos } from "../../services/stockAlertService.js";
import { getSession } from "../../services/sessionService.js";
import { supabase } from "../../services/supabase-client.js";
import { showToast } from "../../services/toastService.js";
import { getTop5Productos, getTendenciaMovimientos, getValorInventarioPorCategoria } from "../../services/chartService.js";
import { renderGraficaTop5Productos, renderGraficaTendenciaMovimientos, renderGraficaValorInventarioPorCategoria } from "../../services/chartUI.js";

// ─── Roles autorizados para la gráfica ─────────────────────────────────────────

const AUTHORIZED_ROLES = ["almacenista", "jefe", "administrador"];

// ─── Estado del módulo ─────────────────────────────────────────────────────────

let realtimeService = null;
let obraActiva = null;
let stockActual = [];
let usuario = null;
let rolUsuario = null;
let obrasDisponibles = [];
let paginaActual = 0;
const MOVIMIENTOS_POR_PAGINA = 50;

// ─── Inicialización ────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", init);

async function init() {
  // Verificar sesión
  const session = getSession();
  if (!session) {
    window.location.href = "/admin-dashboard/inicio-de-sesion.html";
    return;
  }

  usuario = session.user;

  // Obtener perfil y rol del usuario
  const perfil = await obtenerPerfilUsuario(usuario.id);
  if (!perfil) {
    showToast("Error al obtener perfil de usuario", "error");
    return;
  }
  rolUsuario = perfil.rol;

  // Aplicar visibilidad por rol (Req 10.1)
  aplicarVisibilidadPorRol(rolUsuario);

  // Cargar gráfica de productos por categoría (Req 4.1, 6.1, 6.2, 6.3, 6.4)
  if (AUTHORIZED_ROLES.includes(rolUsuario)) {
    try {
      await cargarGraficaProductosPorCategoria();
    } catch (err) {
      console.error("Error cargando gráfica de productos por categoría:", err);
      // Chart failure must NOT block other init logic
    }
  } else {
    // Hide chart section for unauthorized roles (Req 6.4)
    const chartSection = document.querySelector(".chart-section");
    if (chartSection) {
      chartSection.style.display = "none";
    }
  }

  // Cargar pack de 3 gráficas analíticas (Req 8.1, 8.2, 8.3, 8.4, 8.5)
  try {
    await cargarGraficas();
  } catch (err) {
    console.error("Error cargando gráficas analíticas:", err);
    // Chart failure must NOT block other init logic
  }

  // Inicializar RealtimeService
  realtimeService = new RealtimeService(supabase);

  // Cargar obras según rol (Req 3.7)
  await cargarObras();

  // Si almacenista sin obras asignadas, mostrar mensaje (Req 10.1)
  if (rolUsuario === "almacenista" && obrasDisponibles.length === 0) {
    renderSinObrasAsignadas();
    return;
  }

  // Configurar eventos de UI
  configurarEventos();

  // Seleccionar primera obra disponible y cargar datos
  if (obrasDisponibles.length > 0) {
    const selectObra = document.getElementById("selectObra");
    if (selectObra && selectObra.value !== "todas") {
      await cambiarObra(selectObra.value);
    } else if (obrasDisponibles.length === 1) {
      // Si solo hay una obra, seleccionarla automáticamente
      await cambiarObra(obrasDisponibles[0].id);
    }
  }
}

// ─── Obtener perfil de usuario ─────────────────────────────────────────────────

async function obtenerPerfilUsuario(userId) {
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nombre, rol, estado")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error obteniendo perfil:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("Error inesperado obteniendo perfil:", err);
    return null;
  }
}

// ─── Carga de obras ────────────────────────────────────────────────────────────

/**
 * Carga las obras disponibles según el rol del usuario.
 * Req 3.7: almacenista solo ve obras asignadas.
 * Req 10.1: filtrado por rol.
 */
async function cargarObras() {
  try {
    if (rolUsuario === "almacenista") {
      // Solo obras asignadas al almacenista (Req 3.7, 10.1)
      const { data, error } = await supabase
        .from("usuario_obras")
        .select("obra_id, obras (id, nombre)")
        .eq("usuario_id", usuario.id);

      if (error) throw error;

      obrasDisponibles = (data || [])
        .filter((item) => item.obras)
        .map((item) => ({
          id: item.obras.id,
          nombre: item.obras.nombre,
        }));
    } else {
      // Admin, jefe, supervisor: todas las obras activas
      const { data, error } = await supabase
        .from("obras")
        .select("id, nombre")
        .eq("estado", "activa")
        .order("nombre");

      if (error) throw error;
      obrasDisponibles = data || [];
    }

    poblarSelectorObras();
  } catch (err) {
    console.error("Error cargando obras:", err);
    showToast("Error al cargar obras", "error");
  }
}

/**
 * Puebla el selector de obras con las obras disponibles.
 */
function poblarSelectorObras() {
  const select = document.getElementById("selectObra");
  if (!select) return;

  // Limpiar opciones existentes
  select.innerHTML = "";

  // Opción "Todas" solo para admin/jefe (vista consolidada)
  if (["admin", "jefe"].includes(rolUsuario)) {
    const optTodas = document.createElement("option");
    optTodas.value = "todas";
    optTodas.textContent = "Todas las obras (consolidado)";
    select.appendChild(optTodas);
  }

  // Agregar cada obra
  obrasDisponibles.forEach((obra) => {
    const opt = document.createElement("option");
    opt.value = obra.id;
    opt.textContent = obra.nombre;
    select.appendChild(opt);
  });

  // Si almacenista con una sola obra, seleccionarla
  if (rolUsuario === "almacenista" && obrasDisponibles.length === 1) {
    select.value = obrasDisponibles[0].id;
  }
}

// ─── Cambio de obra ────────────────────────────────────────────────────────────

/**
 * Gestiona el cambio de obra activa.
 * Req 4.2: cancelar suscripción anterior, suscribir a nueva obra.
 * @param {string} obraId - UUID de la obra seleccionada o "todas"
 */
async function cambiarObra(obraId) {
  // Cancelar suscripción realtime anterior (Req 4.2)
  if (realtimeService) {
    realtimeService.unsubscribe();
  }

  obraActiva = obraId;
  paginaActual = 0;

  if (obraId === "todas") {
    await cargarVistaConsolidada();
    // No hay suscripción realtime en vista consolidada
    actualizarIndicadorRealtime("disconnected");
  } else {
    await cargarStockObra(obraId);
    await cargarMovimientos(obraId);
    await cargarProductosCriticos(obraId);

    // Suscribir a realtime para la nueva obra (Req 4.2)
    suscribirRealtime(obraId);
  }
}

// ─── Carga de datos ────────────────────────────────────────────────────────────

/**
 * Carga el stock de una obra específica y actualiza la UI.
 */
async function cargarStockObra(obraId) {
  try {
    stockActual = await obtenerStockPorObra(obraId);
    renderStockTabla(stockActual, "#tablaStock");

    // Calcular y renderizar KPIs (Req 4.4)
    const kpis = calcularKPIs(stockActual);
    renderKPIs(kpis);
  } catch (err) {
    console.error("Error cargando stock:", err);
    showToast("Error al cargar stock de la obra", "error");
  }
}

/**
 * Carga la vista consolidada de todas las obras (admin/jefe).
 */
async function cargarVistaConsolidada() {
  try {
    const consolidado = await obtenerStockConsolidado();
    // Adaptar formato para renderStockTabla
    const items = consolidado.map((item) => ({
      producto_id: item.producto_id,
      codigo: item.codigo,
      descripcion: item.descripcion,
      unidad: "—",
      cantidad: item.stock_total,
      costo_prom: item.valor_total / (item.stock_total || 1),
      estado_alerta: "normal",
    }));
    stockActual = items;
    renderStockTabla(items, "#tablaStock");

    const kpis = calcularKPIs(items);
    renderKPIs(kpis);

    // Productos críticos globales
    await cargarProductosCriticos(null);
  } catch (err) {
    console.error("Error cargando vista consolidada:", err);
    showToast("Error al cargar inventario consolidado", "error");
  }
}

/**
 * Carga los movimientos de una obra con paginación.
 */
async function cargarMovimientos(obraId) {
  try {
    const offset = paginaActual * MOVIMIENTOS_POR_PAGINA;
    const { data, total } = await obtenerMovimientosPorObra(obraId, {
      limit: MOVIMIENTOS_POR_PAGINA,
      offset,
    });

    renderMovimientosTabla(data);
    actualizarPaginacion(total);
  } catch (err) {
    console.error("Error cargando movimientos:", err);
    showToast("Error al cargar movimientos", "error");
  }
}

/**
 * Renderiza la tabla de movimientos.
 */
function renderMovimientosTabla(movimientos) {
  const tbody = document.getElementById("tablaMovimientos");
  if (!tbody) return;

  if (!movimientos || movimientos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#9ca3af;">Sin movimientos registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = movimientos
    .map((mov) => {
      const fecha = mov.creado_en
        ? new Date(mov.creado_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })
        : "—";
      const tipo = mov.tipo || "—";
      const producto = mov.productos?.descripcion || mov.productos?.codigo || "—";
      const cantidad = mov.cantidad || 0;
      const observacion = mov.observacion || "—";

      return `
        <tr>
          <td>${fecha}</td>
          <td><span class="badge-${tipoBadgeClass(tipo)}">${tipo}</span></td>
          <td>${escapeHtml(producto)}</td>
          <td>${cantidad}</td>
          <td>—</td>
          <td>${escapeHtml(observacion)}</td>
        </tr>`;
    })
    .join("");
}

/**
 * Retorna la clase CSS para el badge del tipo de movimiento.
 */
function tipoBadgeClass(tipo) {
  switch (tipo) {
    case "entrada":
    case "transferencia_entrada":
      return "normal";
    case "salida":
    case "transferencia_salida":
      return "critico";
    case "ajuste":
      return "alerta";
    default:
      return "normal";
  }
}

/**
 * Carga productos críticos y renderiza el panel.
 */
async function cargarProductosCriticos(obraId) {
  try {
    const criticos = await obtenerProductosCriticos(obraId || undefined);
    renderPanelCriticos(criticos, "#panelCriticos");
  } catch (err) {
    console.error("Error cargando productos críticos:", err);
  }
}

// ─── Gráfica: Productos por Categoría ─────────────────────────────────────────

/**
 * Orquesta la carga y renderizado de la gráfica de productos por categoría.
 * Solo se invoca para roles autorizados.
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.4
 */
async function cargarGraficaProductosPorCategoria() {
  const container = document.getElementById("chart-productos-por-categoria");

  // Guard: ApexCharts not available (Req 4.4)
  if (typeof ApexCharts === "undefined") {
    if (container) {
      container.innerHTML = `<p style="text-align:center;color:#9ca3af;padding:20px;font-size:13px;">La gráfica no pudo ser cargada</p>`;
    }
    return;
  }

  let dataset;
  try {
    dataset = await getProductosPorCategoria();
  } catch (err) {
    showToast("Error al cargar datos de la gráfica", "error");
    return;
  }

  // Handle empty/null/undefined dataset (Req 4.3)
  if (!dataset || !Array.isArray(dataset) || dataset.length === 0) {
    if (container) {
      container.innerHTML = `<p style="text-align:center;color:#9ca3af;padding:20px;font-size:13px;">No hay datos disponibles para la gráfica</p>`;
    }
    return;
  }

  try {
    renderGraficaProductosPorCategoria(dataset);
  } catch (err) {
    showToast("Error al renderizar la gráfica", "error");
  }
}

// ─── Gráficas: Pack de 3 Charts (Top5, Tendencia, Valor por Categoría) ─────────

/**
 * Orquesta la carga y renderizado de las 3 gráficas analíticas.
 * Solo se invoca para roles autorizados. Cada fetch es independiente.
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
async function cargarGraficas() {
  const chartsSection = document.getElementById("charts-section");

  // Role gating: ocultar sección si no autorizado (Req 8.3)
  if (!AUTHORIZED_ROLES.includes(rolUsuario)) {
    if (chartsSection) {
      chartsSection.style.display = "none";
    }
    return;
  }

  // Fetch independiente por gráfica — fallo en una no bloquea las demás (Req 8.1, 8.4, 8.5)
  const fetches = [
    { fetch: getTop5Productos, render: renderGraficaTop5Productos, name: "Top 5 Productos" },
    { fetch: getTendenciaMovimientos, render: renderGraficaTendenciaMovimientos, name: "Tendencia Movimientos" },
    { fetch: getValorInventarioPorCategoria, render: renderGraficaValorInventarioPorCategoria, name: "Valor por Categoría" },
  ];

  await Promise.allSettled(fetches.map(async ({ fetch, render, name }) => {
    try {
      const dataset = await fetch();
      render(dataset);
    } catch (err) {
      showToast(`Error cargando ${name}: ${err.message}`, "error");
    }
  }));
}

// ─── Paginación ────────────────────────────────────────────────────────────────

/**
 * Actualiza los controles de paginación.
 */
function actualizarPaginacion(total) {
  const totalPaginas = Math.ceil(total / MOVIMIENTOS_POR_PAGINA);
  const btnAnterior = document.getElementById("btnPagAnterior");
  const btnSiguiente = document.getElementById("btnPagSiguiente");
  const infoEl = document.getElementById("paginaInfo");

  if (btnAnterior) btnAnterior.disabled = paginaActual === 0;
  if (btnSiguiente) btnSiguiente.disabled = paginaActual >= totalPaginas - 1;
  if (infoEl) infoEl.textContent = `Página ${paginaActual + 1} de ${totalPaginas || 1}`;
}

// ─── Suscripción Realtime ──────────────────────────────────────────────────────

/**
 * Suscribe a movimientos en tiempo real para la obra activa.
 * Req 4.1: actualizar vista en todos los clientes conectados.
 * Req 4.2: suscripción filtrada por obra activa.
 * Req 4.3: reconexión automática con backoff exponencial.
 */
function suscribirRealtime(obraId) {
  if (!realtimeService) return;

  realtimeService.subscribe(obraId, async (nuevoMovimiento) => {
    // Req 4.4: actualizar UI sin recarga completa
    await manejarNuevoMovimiento(nuevoMovimiento);
  });

  // Monitorear estado de conexión
  iniciarMonitoreoConexion();
}

/**
 * Monitorea el estado de conexión realtime y actualiza el indicador.
 * Req 4.3: indicador visual de reconexión.
 * Req 4.6: indicador de desconectado + botón de reintento.
 */
function iniciarMonitoreoConexion() {
  // Polling del estado de conexión cada segundo
  const intervalo = setInterval(() => {
    if (!realtimeService || !obraActiva || obraActiva === "todas") {
      clearInterval(intervalo);
      return;
    }

    const status = realtimeService.getStatus();
    actualizarIndicadorRealtime(status);
  }, 1000);
}

/**
 * Actualiza el indicador visual de estado de conexión realtime.
 * Req 4.3: mostrar "reconectando" durante reintentos.
 * Req 4.6: mostrar "desconectado" + botón reintento cuando se agotan reintentos.
 */
function actualizarIndicadorRealtime(status) {
  const indicator = document.getElementById("realtimeIndicator");
  const label = document.getElementById("realtimeLabel");
  const btnRetry = document.getElementById("btnRetryConnection");

  if (!indicator || !label) return;

  // Remover clases previas
  indicator.classList.remove("connected", "reconnecting", "disconnected");
  indicator.classList.add(status);

  const labels = {
    connected: "Conectado",
    reconnecting: "Reconectando...",
    disconnected: "Desconectado",
  };
  label.textContent = labels[status] || "Desconectado";

  // Mostrar/ocultar botón de reintento (Req 4.6)
  if (btnRetry) {
    if (status === "disconnected") {
      btnRetry.classList.remove("hidden");
    } else {
      btnRetry.classList.add("hidden");
    }
  }
}

/**
 * Maneja un nuevo movimiento recibido en tiempo real.
 * Req 4.4: actualizar KPIs y tabla sin recarga.
 */
async function manejarNuevoMovimiento(movimiento) {
  if (!movimiento) return;

  // Recargar stock de la obra activa para reflejar el cambio
  await cargarStockObra(obraActiva);

  // Recargar productos críticos
  await cargarProductosCriticos(obraActiva);

  // Agregar movimiento al inicio de la tabla de movimientos
  agregarMovimientoATabla(movimiento);

  showToast("Stock actualizado en tiempo real", "info", 2000);
}

/**
 * Agrega un movimiento nuevo al inicio de la tabla de movimientos.
 */
function agregarMovimientoATabla(movimiento) {
  const tbody = document.getElementById("tablaMovimientos");
  if (!tbody) return;

  // Si la tabla tiene el mensaje "Sin movimientos", limpiarlo
  const primeraCelda = tbody.querySelector("td[colspan]");
  if (primeraCelda) {
    tbody.innerHTML = "";
  }

  const fecha = movimiento.creado_en
    ? new Date(movimiento.creado_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })
    : "—";

  const fila = document.createElement("tr");
  fila.innerHTML = `
    <td>${fecha}</td>
    <td><span class="badge-${tipoBadgeClass(movimiento.tipo)}">${movimiento.tipo || "—"}</span></td>
    <td>${escapeHtml(movimiento.producto_descripcion || "—")}</td>
    <td>${movimiento.cantidad || 0}</td>
    <td>—</td>
    <td>${escapeHtml(movimiento.observacion || "—")}</td>
  `;

  // Insertar al inicio
  tbody.insertBefore(fila, tbody.firstChild);

  // Limitar filas visibles a MOVIMIENTOS_POR_PAGINA
  while (tbody.children.length > MOVIMIENTOS_POR_PAGINA) {
    tbody.removeChild(tbody.lastChild);
  }
}

// ─── Eventos de UI ─────────────────────────────────────────────────────────────

function configurarEventos() {
  // Cambio de obra
  const selectObra = document.getElementById("selectObra");
  if (selectObra) {
    selectObra.addEventListener("change", (e) => {
      cambiarObra(e.target.value);
    });
  }

  // Botón de reintento de conexión (Req 4.6)
  const btnRetry = document.getElementById("btnRetryConnection");
  if (btnRetry) {
    btnRetry.addEventListener("click", () => {
      if (realtimeService) {
        realtimeService.retry();
        actualizarIndicadorRealtime("reconnecting");
        showToast("Reintentando conexión...", "info", 2000);
      }
    });
  }

  // Abrir modal de movimiento
  const btnRegistrar = document.getElementById("btnRegistrarMovimiento");
  if (btnRegistrar) {
    btnRegistrar.addEventListener("click", abrirModalMovimiento);
  }

  // Cerrar modal
  const btnCerrar = document.getElementById("btnCerrarMovimiento");
  if (btnCerrar) {
    btnCerrar.addEventListener("click", cerrarModalMovimiento);
  }

  // Cerrar modal al hacer clic fuera
  const modalOverlay = document.getElementById("modalMovimiento");
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) cerrarModalMovimiento();
    });
  }

  // Formulario de movimiento
  const formMov = document.getElementById("formMovimiento");
  if (formMov) {
    formMov.addEventListener("submit", manejarSubmitMovimiento);
  }

  // Cambio de tipo de movimiento (mostrar/ocultar campos)
  const selectTipo = document.getElementById("mov-tipo");
  if (selectTipo) {
    selectTipo.addEventListener("change", manejarCambioTipoMovimiento);
  }

  // Cambio de producto/obra para mostrar stock disponible
  const selectProducto = document.getElementById("mov-producto");
  const selectObraMov = document.getElementById("mov-obra");
  if (selectProducto) {
    selectProducto.addEventListener("change", mostrarStockDisponible);
  }
  if (selectObraMov) {
    selectObraMov.addEventListener("change", mostrarStockDisponible);
  }

  // Paginación
  const btnAnterior = document.getElementById("btnPagAnterior");
  const btnSiguiente = document.getElementById("btnPagSiguiente");
  if (btnAnterior) {
    btnAnterior.addEventListener("click", () => {
      if (paginaActual > 0) {
        paginaActual--;
        cargarMovimientos(obraActiva);
      }
    });
  }
  if (btnSiguiente) {
    btnSiguiente.addEventListener("click", () => {
      paginaActual++;
      cargarMovimientos(obraActiva);
    });
  }

  // Logout
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      if (realtimeService) realtimeService.unsubscribe();
      await supabase.auth.signOut();
      window.location.href = "/admin-dashboard/inicio-de-sesion.html";
    });
  }
}

// ─── Modal de Movimiento ───────────────────────────────────────────────────────

function abrirModalMovimiento() {
  const modal = document.getElementById("modalMovimiento");
  if (modal) {
    modal.classList.add("show");
    poblarSelectsModal(); // async but fire-and-forget is fine here
  }
}

function cerrarModalMovimiento() {
  const modal = document.getElementById("modalMovimiento");
  if (modal) {
    modal.classList.remove("show");
    // Reset form
    const form = document.getElementById("formMovimiento");
    if (form) form.reset();
    // Ocultar campos condicionales
    ocultarCamposCondicionales();
  }
}

/**
 * Puebla los selects del modal con productos y obras disponibles.
 */
async function poblarSelectsModal() {
  // Poblar productos — cargar de la tabla productos directamente
  const selectProducto = document.getElementById("mov-producto");
  if (selectProducto) {
    selectProducto.innerHTML = `<option value="">Seleccionar producto...</option>`;

    // Si hay stock actual, usar eso (más rápido)
    if (stockActual && stockActual.length > 0) {
      stockActual.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.producto_id;
        opt.textContent = `${item.codigo || ""} ${item.descripcion || item.nombre || "Producto"}`.trim();
        selectProducto.appendChild(opt);
      });
    } else {
      // Fallback: cargar todos los productos de Supabase
      try {
        const { data } = await supabase
          .from("productos")
          .select("id, codigo, descripcion, nombre")
          .order("descripcion");
        if (data && data.length > 0) {
          data.forEach((p) => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = `${p.codigo || ""} ${p.descripcion || p.nombre || ""}`.trim();
            selectProducto.appendChild(opt);
          });
        }
      } catch (err) {
        console.error("Error cargando productos para modal:", err);
      }
    }
  }

  // Poblar obras
  const selectObraMov = document.getElementById("mov-obra");
  const selectObraDestino = document.getElementById("mov-obra-destino");

  // Si obrasDisponibles está vacío, intentar cargar de nuevo
  if (obrasDisponibles.length === 0) {
    try {
      const { data } = await supabase
        .from("obras")
        .select("id, nombre")
        .eq("estado", "activa")
        .order("nombre");
      if (data) obrasDisponibles = data;
    } catch (err) {
      console.error("Error recargando obras:", err);
    }
  }

  if (selectObraMov) {
    selectObraMov.innerHTML = `<option value="">Seleccionar obra...</option>`;
    obrasDisponibles.forEach((obra) => {
      const opt = document.createElement("option");
      opt.value = obra.id;
      opt.textContent = obra.nombre;
      selectObraMov.appendChild(opt);
    });
    // Pre-seleccionar obra activa si hay una
    if (obraActiva && obraActiva !== "todas") {
      selectObraMov.value = obraActiva;
    }
  }

  if (selectObraDestino) {
    selectObraDestino.innerHTML = `<option value="">Seleccionar obra destino...</option>`;
    obrasDisponibles.forEach((obra) => {
      const opt = document.createElement("option");
      opt.value = obra.id;
      opt.textContent = obra.nombre;
      selectObraDestino.appendChild(opt);
    });
  }
}

/**
 * Maneja el cambio de tipo de movimiento para mostrar/ocultar campos.
 */
function manejarCambioTipoMovimiento() {
  const tipo = document.getElementById("mov-tipo")?.value;
  const campoDestino = document.getElementById("campoObraDestino");
  const campoMotivo = document.getElementById("campoMotivo");
  const stockInfo = document.getElementById("stockDisponible");

  // Mostrar obra destino solo para transferencias
  if (campoDestino) {
    campoDestino.classList.toggle("hidden", tipo !== "transferencia");
  }

  // Mostrar motivo solo para ajustes
  if (campoMotivo) {
    campoMotivo.classList.toggle("hidden", tipo !== "ajuste");
  }

  // Mostrar stock disponible para salidas y transferencias
  if (stockInfo) {
    stockInfo.classList.toggle("hidden", !["salida", "transferencia"].includes(tipo));
  }

  if (["salida", "transferencia"].includes(tipo)) {
    mostrarStockDisponible();
  }
}

/**
 * Muestra el stock disponible del producto seleccionado en la obra seleccionada.
 */
async function mostrarStockDisponible() {
  const productoId = document.getElementById("mov-producto")?.value;
  const obraId = document.getElementById("mov-obra")?.value;
  const spanValor = document.getElementById("stockDisponibleValor");

  if (!productoId || !obraId || !spanValor) return;

  try {
    const { cantidad } = await obtenerStockProductoObra(productoId, obraId);
    spanValor.textContent = `${cantidad} unidades`;
  } catch (err) {
    spanValor.textContent = "Error al consultar";
  }
}

function ocultarCamposCondicionales() {
  document.getElementById("campoObraDestino")?.classList.add("hidden");
  document.getElementById("campoMotivo")?.classList.add("hidden");
  document.getElementById("stockDisponible")?.classList.add("hidden");
}

// ─── Submit de Movimiento ──────────────────────────────────────────────────────

/**
 * Maneja el envío del formulario de movimiento.
 */
async function manejarSubmitMovimiento(e) {
  e.preventDefault();

  const tipo = document.getElementById("mov-tipo")?.value;
  const productoId = document.getElementById("mov-producto")?.value;
  const obraId = document.getElementById("mov-obra")?.value;
  const cantidad = parseInt(document.getElementById("mov-cantidad")?.value, 10);
  const observacion = document.getElementById("mov-observacion")?.value || "";
  const motivo = document.getElementById("mov-motivo")?.value || "";
  const obraDestinoId = document.getElementById("mov-obra-destino")?.value || "";

  // Validación básica frontend
  if (!tipo || !productoId || !obraId || !cantidad) {
    showToast("Complete todos los campos obligatorios", "warning");
    return;
  }

  if (cantidad < 1 || cantidad > 999999) {
    showToast("La cantidad debe estar entre 1 y 999,999", "warning");
    return;
  }

  if (tipo === "ajuste" && motivo.length < 10) {
    showToast("El motivo del ajuste debe tener al menos 10 caracteres", "warning");
    return;
  }

  if (tipo === "transferencia" && !obraDestinoId) {
    showToast("Seleccione una obra destino para la transferencia", "warning");
    return;
  }

  if (tipo === "transferencia" && obraDestinoId === obraId) {
    showToast("La obra destino debe ser diferente a la obra origen", "warning");
    return;
  }

  try {
    let resultado;

    switch (tipo) {
      case "entrada":
        resultado = await registrarEntrada({ productoId, obraId, cantidad, observacion });
        break;
      case "salida":
        resultado = await registrarSalida({ productoId, obraId, cantidad, observacion });
        break;
      case "transferencia":
        resultado = await registrarTransferencia({
          productoId,
          obraOrigenId: obraId,
          obraDestinoId,
          cantidad,
          observacion,
        });
        break;
      case "ajuste":
        resultado = await registrarAjuste({ productoId, obraId, cantidad, motivo });
        break;
      default:
        showToast("Tipo de movimiento no válido", "error");
        return;
    }

    if (resultado.success) {
      showToast("Movimiento registrado correctamente", "success");
      cerrarModalMovimiento();

      // Recargar datos si la obra activa coincide
      if (obraActiva === obraId || obraActiva === "todas") {
        await cargarStockObra(obraActiva === "todas" ? obraActiva : obraId);
        await cargarMovimientos(obraActiva === "todas" ? obraId : obraActiva);
        await cargarProductosCriticos(obraActiva === "todas" ? null : obraActiva);
      }
    } else {
      showToast(resultado.error || "Error al registrar movimiento", "error");
    }
  } catch (err) {
    console.error("Error registrando movimiento:", err);
    showToast("Error inesperado al registrar movimiento", "error");
  }
}

// ─── Utilidades ────────────────────────────────────────────────────────────────

/**
 * Escapa caracteres HTML para prevenir XSS.
 */
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
