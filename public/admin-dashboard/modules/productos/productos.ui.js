/**
 * productos.ui.js
 * Capa de renderizado para el módulo de productos.
 * Renderiza tabla, KPIs, alertas, modales y estado visual.
 *
 * Requirements: 8.1-8.3, 8.6-8.7
 */

import { clasificarAlerta } from "../../services/stockAlertService.js";

// --- Constantes de UI ---
const COLORES = {
  critico: "#ef4444",
  alerta: "#f97316",
  normal: "#22c55e",
};

const LABELS = {
  critico: "BAJO",
  alerta: "ALERTA",
  normal: "OK",
};

// --- Renderizado de tabla ---

/**
 * Renderizar tabla de productos con indicadores de stock.
 * @param {Array} productos - Lista de productos
 * @param {HTMLElement} tbody - Elemento tbody de la tabla
 */
export function renderTablaProductos(productos, tbody) {
  if (!tbody) return;

  if (!productos || productos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#9ca3af;">No hay productos.</td></tr>`;
    return;
  }

  tbody.innerHTML = productos.map((p) => {
    const stock = p.existencia || 0;
    const umbralCritico = p.umbral_critico || 5;
    const umbralAlerta = p.umbral_alerta || 9;
    const estado = clasificarAlerta(stock, umbralCritico, umbralAlerta);
    const color = COLORES[estado];
    const label = LABELS[estado];
    const costoUsd = p.costo_prom != null ? Number(p.costo_prom).toFixed(2) : "0.00";
    const costoBs = p.costo_prom_bs != null ? Number(p.costo_prom_bs).toFixed(2) : (costoUsd * 36.50).toFixed(2);

    return `
    <tr data-id="${p.id}">
      <td>${p.codigo || ""}</td>
      <td>${p.descripcion || ""}</td>
      <td>${p.unidad || ""}</td>
      <td>$${costoUsd}</td>
      <td>Bs${costoBs}</td>
      <td>
        <span style="color:${color};font-weight:600;">${stock}</span>
        <span style="font-size:10px;color:${color};margin-left:4px;">${label}</span>
      </td>
      <td>${p.categoria || ""}</td>
      <td>
        <span style="background:${p.estado === "activo" ? "rgba(0,210,255,0.15)" : "rgba(255,118,117,0.15)"};color:${p.estado === "activo" ? "#00d2ff" : "#ff7675"};padding:4px 10px;border-radius:6px;font-size:12px;">
          ${p.estado || "activo"}
        </span>
      </td>
      <td>
        <button class="btn-editar-producto" data-id="${p.id}" style="background:#6c5ce7;border:none;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;margin-right:4px;" title="Editar">
          <i class="fa fa-pen"></i>
        </button>
        <button class="btn-eliminar-producto" data-id="${p.id}" style="background:#d63031;border:none;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;" title="Eliminar">
          <i class="fa fa-trash"></i>
        </button>
      </td>
    </tr>`;
  }).join("");
}

// --- KPIs ---

/**
 * Renderizar KPIs del módulo de productos.
 * @param {Array} productos - Lista de productos
 */
export function renderKPIs(productos) {
  const total = productos.length;
  const activos = productos.filter((p) => p.estado === "activo").length;
  const valor = productos.reduce((sum, p) => sum + (Number(p.costo_prom) || 0) * (p.existencia || 0), 0);
  const criticos = productos.filter((p) => {
    const umbral = p.umbral_critico || 5;
    return (p.existencia || 0) < umbral && p.estado === "activo";
  });

  setTexto("kpi-total", total);
  setTexto("kpi-valor", "$" + valor.toLocaleString("es-MX", { maximumFractionDigits: 0 }));
  setTexto("kpi-critico", criticos.length);
  setTexto("kpi-activos", activos);
}

// --- Alertas de stock ---

/**
 * Renderizar panel de alertas de stock crítico.
 * @param {Array} productos - Lista de productos
 */
export function renderAlertasStock(productos) {
  const alertas = document.getElementById("alertas-stock");
  const lista = document.getElementById("lista-criticos");
  if (!alertas || !lista) return;

  const criticos = productos
    .filter((p) => {
      const umbral = p.umbral_critico || 5;
      return (p.existencia || 0) < umbral && p.estado === "activo";
    })
    .sort((a, b) => (a.existencia || 0) - (b.existencia || 0));

  if (criticos.length > 0) {
    alertas.style.display = "block";
    lista.innerHTML = criticos.slice(0, 8).map((p) => {
      const stock = p.existencia || 0;
      return `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        🔴 <strong>${p.descripcion || p.codigo}</strong> — Stock: ${stock} unidades
      </div>`;
    }).join("");
  } else {
    alertas.style.display = "none";
    lista.innerHTML = "";
  }
}

// --- Modales ---

/**
 * Abrir modal de crear producto.
 */
export function abrirModalCrear() {
  const modal = document.getElementById("modalOverlay");
  const form = document.getElementById("productoForm");
  if (modal) modal.style.display = "flex";
  if (form) form.reset();
  // Enfocar primer input
  setTimeout(() => {
    const primerInput = document.getElementById("codigo");
    if (primerInput) primerInput.focus();
  }, 100);
}

/**
 * Cerrar modal de crear producto.
 */
export function cerrarModalCrear() {
  const modal = document.getElementById("modalOverlay");
  const form = document.getElementById("productoForm");
  if (modal) modal.style.display = "none";
  if (form) form.reset();
}

/**
 * Abrir modal de editar producto con datos precargados.
 * @param {object} producto - Datos del producto a editar
 */
export function abrirModalEditar(producto) {
  if (!producto) return;
  document.getElementById("edit_id").value = producto.id;
  document.getElementById("edit_codigo").value = producto.codigo || "";
  document.getElementById("edit_descripcion").value = producto.descripcion || "";
  document.getElementById("edit_categoria").value = producto.categoria || "";
  document.getElementById("edit_unidad").value = producto.unidad || "";
  document.getElementById("edit_costo_prom").value = producto.costo_prom || "";
  document.getElementById("edit_costo_prom_bs").value = producto.costo_prom_bs || "";
  document.getElementById("edit_existencia").value = producto.existencia || "";
  document.getElementById("edit_estado").value = producto.estado || "activo";

  const modal = document.getElementById("modalEditarProducto");
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  }
  // Enfocar primer input editable
  setTimeout(() => {
    const input = document.getElementById("edit_codigo");
    if (input) input.focus();
  }, 100);
}

/**
 * Cerrar modal de editar producto.
 */
export function cerrarModalEditar() {
  const modal = document.getElementById("modalEditarProducto");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
}

/**
 * Deshabilitar/habilitar botón de guardar.
 * @param {string} btnId - ID del botón
 * @param {boolean} disabled - true para deshabilitar
 */
export function toggleBotonGuardar(btnId, disabled) {
  const btn = document.querySelector(`#${btnId} .btn-save`) || document.querySelector(`#${btnId}`);
  if (btn) {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? "0.6" : "1";
  }
}

// --- Gráfica de productos por categoría ---

/**
 * Paleta de colores para la gráfica de productos por categoría.
 * Al menos 8 colores distinguibles.
 */
const PALETA_GRAFICA = [
  "#6c5ce7", "#00cec9", "#fdcb6e", "#e17055",
  "#0984e3", "#00b894", "#d63031", "#e84393",
  "#2d3436", "#74b9ff", "#55efc4", "#fab1a0",
];

/**
 * Función de hash determinista para asignar un color consistente
 * basado en el nombre de categoría.
 * @param {string} nombre - Nombre de la categoría
 * @returns {string} Color hexadecimal de la paleta
 */
export function hashColor(nombre) {
  let hash = 0;
  const str = String(nombre || "");
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % PALETA_GRAFICA.length;
  return PALETA_GRAFICA[index];
}

/**
 * Trunca un label a un máximo de 20 caracteres, añadiendo "…" si excede.
 * @param {string} label
 * @returns {string}
 */
export function truncarLabel(label) {
  const str = String(label || "");
  if (str.length > 20) {
    return str.slice(0, 20) + "…";
  }
  return str;
}

/**
 * Renderiza gráfica de barras verticales con ApexCharts.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 *
 * @param {Array<{label: string, value: number}>|null|undefined} dataset
 */
export function renderGraficaProductosPorCategoria(dataset) {
  const container = document.getElementById("chart-productos-por-categoria");
  if (!container) return;

  // Verificar que ApexCharts esté disponible
  if (typeof ApexCharts === "undefined") {
    container.innerHTML = `<p style="text-align:center;color:#9ca3af;padding:20px;font-size:13px;">La gráfica no pudo ser cargada</p>`;
    return;
  }

  // Dataset vacío, null o undefined
  if (!dataset || !Array.isArray(dataset) || dataset.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:#9ca3af;padding:20px;font-size:13px;">No hay datos disponibles para la gráfica</p>`;
    return;
  }

  // Si hay más de 50 categorías, tomar las primeras 50 ordenadas alfabéticamente
  let datos = [...dataset];
  if (datos.length > 50) {
    datos.sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
    datos = datos.slice(0, 50);
  }

  // Preparar labels truncados, valores y colores
  const labels = datos.map((d) => truncarLabel(d.label));
  const values = datos.map((d) => Math.max(0, Math.floor(Number(d.value) || 0)));
  const colores = datos.map((d) => hashColor(d.label));

  // Limpiar contenedor antes de renderizar
  container.innerHTML = "";

  const chartOptions = {
    chart: {
      type: "bar",
      height: 300,
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
      },
    },
    series: [{ name: "Productos", data: values }],
    xaxis: {
      categories: labels,
    },
    yaxis: {
      labels: {
        formatter: (val) => Math.floor(val).toString(),
      },
    },
    colors: colores,
    plotOptions: {
      bar: {
        distributed: true,
        columnWidth: "60%",
      },
    },
    legend: {
      show: false,
    },
  };

  const chart = new ApexCharts(container, chartOptions);
  chart.render();
}

// --- Utilidades internas ---

function setTexto(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor ?? "—";
}
