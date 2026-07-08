/**
 * inventario.ui.js
 * Módulo de renderizado de UI para el inventario multi-almacén.
 * Renderiza tabla de stock, KPIs, panel de productos críticos,
 * indicador de conexión realtime y controla visibilidad por rol.
 *
 * Requirements: 4.4, 8.1, 8.2, 8.3, 8.6, 8.7, 10.5
 */

// ─── Colores de estado de alerta ───────────────────────────────────────────────
const COLORES_ALERTA = {
  critico: "#ef4444",
  alerta: "#f97316",
  normal: "#22c55e",
};

const LABELS_ALERTA = {
  critico: "CRÍTICO",
  alerta: "ALERTA",
  normal: "OK",
};

// ─── Colores de estado de conexión ─────────────────────────────────────────────
const COLORES_CONEXION = {
  connected: "#22c55e",
  reconnecting: "#f97316",
  disconnected: "#ef4444",
};

const LABELS_CONEXION = {
  connected: "Conectado",
  reconnecting: "Reconectando...",
  disconnected: "Desconectado",
};

// ─── Renderizado de tabla de stock ─────────────────────────────────────────────

/**
 * Renderiza la tabla de stock con indicadores de color según estado de alerta.
 * Req 8.1: rojo para crítico (< umbral_critico)
 * Req 8.2: naranja para alerta (>= umbral_critico y <= umbral_alerta)
 * Req 8.3: verde para normal (> umbral_alerta)
 * Req 8.7: cuando stock se recupera, se muestra verde (sin notificación crítica)
 *
 * @param {Array<{producto_id, codigo, descripcion, unidad, cantidad, costo_prom, estado_alerta}>} stockItems
 * @param {string} tbodySelector - Selector CSS del tbody de la tabla (default: "#stock-tbody")
 */
export function renderStockTabla(stockItems, tbodySelector = "#stock-tbody") {
  const tbody = document.querySelector(tbodySelector);
  if (!tbody) return;

  if (!stockItems || stockItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#9ca3af;">No hay productos en esta obra.</td></tr>`;
    return;
  }

  tbody.innerHTML = stockItems
    .map((item) => {
      const color = COLORES_ALERTA[item.estado_alerta] || COLORES_ALERTA.normal;
      const label = LABELS_ALERTA[item.estado_alerta] || LABELS_ALERTA.normal;
      const valor = ((item.cantidad || 0) * (item.costo_prom || 0)).toFixed(2);

      return `
      <tr data-producto-id="${item.producto_id}">
        <td>${escapeHtml(item.codigo || "")}</td>
        <td>${escapeHtml(item.descripcion || "")}</td>
        <td>${escapeHtml(item.unidad || "—")}</td>
        <td>
          <span style="color:${color};font-weight:600;">${item.cantidad}</span>
        </td>
        <td>
          <span style="background:${color}20;color:${color};padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;">
            ${label}
          </span>
        </td>
        <td>$${valor}</td>
      </tr>`;
    })
    .join("");
}

/**
 * Actualiza parcialmente una fila de la tabla de stock sin recargar toda la tabla.
 * Req 4.4: actualización parcial de UI sin recarga completa.
 * Req 8.7: cuando stock se recupera por encima del umbral crítico, se remueve indicador rojo.
 *
 * @param {string} productoId - UUID del producto a actualizar
 * @param {{cantidad: number, estado_alerta: string, costo_prom?: number}} datos - Datos actualizados
 * @param {string} tbodySelector - Selector CSS del tbody
 */
export function actualizarFilaStock(productoId, datos, tbodySelector = "#stock-tbody") {
  const tbody = document.querySelector(tbodySelector);
  if (!tbody) return;

  const fila = tbody.querySelector(`tr[data-producto-id="${productoId}"]`);
  if (!fila) return;

  const celdas = fila.querySelectorAll("td");
  if (celdas.length < 6) return;

  const color = COLORES_ALERTA[datos.estado_alerta] || COLORES_ALERTA.normal;
  const label = LABELS_ALERTA[datos.estado_alerta] || LABELS_ALERTA.normal;

  // Actualizar cantidad (celda 3)
  celdas[3].innerHTML = `<span style="color:${color};font-weight:600;">${datos.cantidad}</span>`;

  // Actualizar badge de estado (celda 4)
  celdas[4].innerHTML = `
    <span style="background:${color}20;color:${color};padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;">
      ${label}
    </span>`;

  // Actualizar valor si se proporciona costo_prom (celda 5)
  if (datos.costo_prom != null) {
    const valor = ((datos.cantidad || 0) * (datos.costo_prom || 0)).toFixed(2);
    celdas[5].textContent = `$${valor}`;
  }
}

// ─── Renderizado de KPIs ───────────────────────────────────────────────────────

/**
 * Renderiza los KPIs del inventario.
 * Req 4.4: actualización parcial de UI sin recarga completa.
 *
 * @param {{totalProductos: number, valorInventario: number, stockCritico: number, productosActivos: number}} kpis
 */
export function renderKPIs(kpis) {
  const elTotal = document.getElementById("kpi-total");
  const elValor = document.getElementById("kpi-valor");
  const elCritico = document.getElementById("kpi-critico");
  const elActivos = document.getElementById("kpi-activos");

  if (elTotal) elTotal.textContent = kpis.totalProductos ?? "—";
  if (elValor) elValor.textContent = `$${(kpis.valorInventario || 0).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  if (elCritico) elCritico.textContent = kpis.stockCritico ?? "—";
  if (elActivos) elActivos.textContent = kpis.productosActivos ?? "—";
}

/**
 * Calcula KPIs a partir de los datos de stock.
 *
 * @param {Array<{cantidad: number, costo_prom: number, estado_alerta: string}>} stockItems
 * @returns {{totalProductos: number, valorInventario: number, stockCritico: number, productosActivos: number}}
 */
export function calcularKPIs(stockItems) {
  const totalProductos = stockItems.length;
  const valorInventario = stockItems.reduce(
    (sum, item) => sum + (item.cantidad || 0) * (item.costo_prom || 0),
    0
  );
  const stockCritico = stockItems.filter(
    (item) => item.estado_alerta === "critico"
  ).length;
  const productosActivos = stockItems.filter(
    (item) => item.cantidad > 0
  ).length;

  return { totalProductos, valorInventario, stockCritico, productosActivos };
}

// ─── Panel de productos críticos ───────────────────────────────────────────────

/**
 * Renderiza el panel de productos críticos ordenados por menor stock.
 * Req 8.6: panel resumen con productos críticos ordenados por menor stock.
 * Req 8.1: indicador visual rojo para productos bajo umbral crítico.
 * Req 8.7: cuando stock se recupera, el producto se remueve del panel.
 *
 * @param {Array<{producto_id: string, descripcion: string, obra: string, cantidad: number, umbral_critico: number}>} productosCriticos
 * @param {string} containerSelector - Selector del contenedor (default: "#panel-criticos")
 */
export function renderPanelCriticos(productosCriticos, containerSelector = "#panel-criticos") {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  if (!productosCriticos || productosCriticos.length === 0) {
    container.style.display = "none";
    return;
  }

  // Ordenar por menor stock primero (Req 8.6)
  const ordenados = [...productosCriticos].sort((a, b) => a.cantidad - b.cantidad);

  container.style.display = "block";

  const listaEl = container.querySelector(".criticos-lista") || container;
  const headerHtml = container.querySelector(".criticos-header")
    ? ""
    : `<h3 class="criticos-header" style="font-size:14px;color:#ef4444;margin-bottom:10px;">
        <i class="fa fa-triangle-exclamation" style="margin-right:6px;"></i>
        Productos con stock crítico (${ordenados.length})
      </h3>`;

  // Actualizar header si existe
  const headerEl = container.querySelector(".criticos-header");
  if (headerEl) {
    headerEl.innerHTML = `
      <i class="fa fa-triangle-exclamation" style="margin-right:6px;"></i>
      Productos con stock crítico (${ordenados.length})`;
  }

  const listaHtml = ordenados
    .map(
      (p) => `
    <div class="critico-item" data-producto-id="${p.producto_id}" style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center;">
      <div>
        <span style="color:#ef4444;margin-right:6px;">●</span>
        <strong style="color:#fff;">${escapeHtml(p.descripcion)}</strong>
        <span style="color:#9ca3af;font-size:12px;margin-left:8px;">${escapeHtml(p.obra)}</span>
      </div>
      <div style="text-align:right;">
        <span style="color:#ef4444;font-weight:600;">${p.cantidad}</span>
        <span style="color:#6b7280;font-size:11px;"> / ${p.umbral_critico}</span>
      </div>
    </div>`
    )
    .join("");

  if (container.querySelector(".criticos-lista")) {
    container.querySelector(".criticos-lista").innerHTML = listaHtml;
  } else {
    container.innerHTML = `
      ${headerHtml}
      <div class="criticos-lista" style="font-size:13px;">${listaHtml}</div>`;
  }
}

// ─── Indicador de conexión realtime ────────────────────────────────────────────

/**
 * Renderiza/actualiza el indicador visual de estado de conexión realtime.
 * Req 4.4: indicador visual de estado de conexión.
 *
 * @param {'connected'|'reconnecting'|'disconnected'} status
 * @param {string} containerSelector - Selector del contenedor (default: "#realtime-status")
 * @param {{onRetry?: Function}} opciones - Callback para botón de reintento
 */
export function renderRealtimeStatus(status, containerSelector = "#realtime-status", opciones = {}) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const color = COLORES_CONEXION[status] || COLORES_CONEXION.disconnected;
  const label = LABELS_CONEXION[status] || LABELS_CONEXION.disconnected;

  let retryBtn = "";
  if (status === "disconnected" && opciones.onRetry) {
    retryBtn = `<button id="btn-retry-realtime" style="margin-left:8px;background:${color};border:none;color:#fff;padding:3px 10px;border-radius:4px;font-size:11px;cursor:pointer;">Reintentar</button>`;
  }

  container.innerHTML = `
    <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:${color};">
      <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;${status === "reconnecting" ? "animation:pulse 1.5s infinite;" : ""}"></span>
      ${label}
    </span>
    ${retryBtn}`;

  // Vincular evento de reintento
  if (status === "disconnected" && opciones.onRetry) {
    const btn = container.querySelector("#btn-retry-realtime");
    if (btn) {
      btn.addEventListener("click", opciones.onRetry);
    }
  }
}

// ─── Control de visibilidad por rol ────────────────────────────────────────────

/**
 * Oculta o muestra elementos del DOM según el rol del usuario.
 * Req 10.5: ocultar elementos no permitidos (no renderizar en DOM).
 *
 * Elementos con atributo `data-roles` serán removidos del DOM si el rol
 * del usuario no está incluido en la lista de roles permitidos.
 *
 * Ejemplo HTML: <button data-roles="admin,jefe">Exportar</button>
 *
 * @param {string} rolUsuario - Rol del usuario activo
 * @param {string} containerSelector - Selector del contenedor donde buscar elementos (default: document)
 */
export function aplicarVisibilidadPorRol(rolUsuario, containerSelector) {
  const container = containerSelector
    ? document.querySelector(containerSelector)
    : document;
  if (!container) return;

  const elementos = container.querySelectorAll("[data-roles]");
  elementos.forEach((el) => {
    const rolesPermitidos = el.getAttribute("data-roles").split(",").map((r) => r.trim());
    if (!rolesPermitidos.includes(rolUsuario)) {
      // Req 10.5: no renderizar en DOM (remover completamente)
      el.remove();
    }
  });
}

/**
 * Oculta secciones completas según el rol del usuario.
 * Útil para secciones grandes que no deben existir en el DOM para ciertos roles.
 *
 * @param {string} rolUsuario - Rol del usuario activo
 * @param {Array<{selector: string, roles: string[]}>} reglas - Reglas de visibilidad
 */
export function ocultarSeccionesPorRol(rolUsuario, reglas) {
  reglas.forEach(({ selector, roles }) => {
    if (!roles.includes(rolUsuario)) {
      const el = document.querySelector(selector);
      if (el) {
        el.remove();
      }
    }
  });
}

// ─── Utilidades ────────────────────────────────────────────────────────────────

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

/**
 * Muestra un mensaje de estado vacío en un contenedor.
 * @param {string} selector - Selector del contenedor
 * @param {string} mensaje - Mensaje a mostrar
 */
export function renderMensajeVacio(selector, mensaje) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.innerHTML = `<p style="text-align:center;color:#9ca3af;padding:20px;font-size:13px;">${escapeHtml(mensaje)}</p>`;
}

/**
 * Muestra un mensaje cuando el almacenista no tiene obras asignadas.
 * @param {string} containerSelector - Selector del contenedor principal
 */
export function renderSinObrasAsignadas(containerSelector = ".dashboard-center") {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;text-align:center;padding:40px;">
      <i class="fa fa-warehouse" style="font-size:48px;color:#6b7280;margin-bottom:16px;"></i>
      <h2 style="color:#fff;font-size:18px;margin-bottom:8px;">Sin obras asignadas</h2>
      <p style="color:#9ca3af;font-size:14px;max-width:400px;">
        No tienes obras asignadas actualmente. Contacta a un administrador para que te asigne al menos una obra.
      </p>
    </div>`;
}
