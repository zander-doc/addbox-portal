/**
 * productos.controller.js
 * Controlador del módulo de productos.
 * Orquesta service, UI, auditoría, alertas y realtime.
 *
 * Requirements: 1.1-1.8, 7.1, 8.1-8.7
 */

import {
  obtenerProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  actualizarStock,
  registrarMovimientoProducto,
  suscribirRealtime,
  desuscribirRealtime,
  existeCodigo,
  crearProductosEnLote,
  eliminarTodoInventario,
  obtenerConteoInventario,
  getInventarioCompleto,
} from "./productos.service.js";

import {
  renderTablaProductos,
  renderKPIs,
  renderAlertasStock,
  abrirModalCrear,
  cerrarModalCrear,
  abrirModalEditar,
  cerrarModalEditar,
  toggleBotonGuardar,
} from "./productos.ui.js";

import { audit } from "../../services/auditService.js";
import { showToast } from "../../services/toastService.js";

import {
  getTop5Productos,
  getTendenciaMovimientos,
  getValorInventarioPorCategoria,
} from "../../services/chartService.js";

import {
  renderGraficaTop5Productos,
  renderGraficaTendenciaMovimientos,
  renderGraficaValorInventarioPorCategoria,
} from "../../services/chartUI.js";

import { getSession } from "../../services/sessionService.js";
import { supabase } from "../../services/supabase-client.js";
import { exportarDatos } from "../../services/excelExport.js";

// --- Estado local ---
let productosCache = [];

// --- Roles autorizados para gráficas ---
const AUTHORIZED_ROLES = ["almacenista", "jefe", "administrador"];

// --- Inicialización ---

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await cargarProductos();
  configurarEventos();
  iniciarRealtime();
  await cargarGraficas();
}

// --- Carga de datos ---

async function cargarProductos() {
  try {
    productosCache = await obtenerProductos();
    const tbody = document.getElementById("tablaProductos");
    renderTablaProductos(productosCache, tbody);
    renderKPIs(productosCache);
    renderAlertasStock(productosCache);
  } catch (err) {
    showToast("Error cargando productos: " + err.message, "error");
  }
}

// --- Carga de gráficas ---

/**
 * Carga y renderiza las 3 gráficas analíticas.
 * Verifica rol del usuario; si no autorizado, oculta la sección.
 * Usa Promise.allSettled para independencia entre gráficas.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
async function cargarGraficas() {
  // Obtener rol del usuario
  let rolUsuario = null;
  try {
    const session = getSession();
    if (session && session.user) {
      const { data, error } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", session.user.id)
        .single();
      if (!error && data) {
        rolUsuario = data.rol;
      }
    }
  } catch (err) {
    // Si no se puede obtener el rol, ocultar gráficas
  }

  // Verificación de rol (Req 7.3)
  if (!AUTHORIZED_ROLES.includes(rolUsuario)) {
    const chartsSection = document.getElementById("charts-section");
    if (chartsSection) {
      chartsSection.style.display = "none";
    }
    return;
  }

  // Fetch independiente de cada gráfica (Req 7.1, 7.4, 7.5)
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

// --- Eventos ---

function configurarEventos() {
  // Botón nuevo producto
  const btnNuevo = document.querySelector("[data-action='nuevo-producto']");
  if (btnNuevo) btnNuevo.addEventListener("click", abrirModalCrear);

  // Formulario crear
  const formCrear = document.getElementById("productoForm");
  if (formCrear) {
    formCrear.addEventListener("submit", handleCrear);
  }

  // Formulario editar
  const formEditar = document.getElementById("formEditarProducto");
  if (formEditar) {
    formEditar.addEventListener("submit", handleEditar);
  }

  // Botón cerrar modal crear
  const btnCerrarCrear = document.querySelector("#modalOverlay .btn-cancel");
  if (btnCerrarCrear) btnCerrarCrear.addEventListener("click", cerrarModalCrear);

  // Botón cerrar modal editar
  const btnCerrarEditar = document.getElementById("btnCerrarEditar");
  if (btnCerrarEditar) btnCerrarEditar.addEventListener("click", cerrarModalEditar);

  // Delegación de eventos en tabla (editar/eliminar)
  const tabla = document.getElementById("tablaProductos");
  if (tabla) {
    tabla.addEventListener("click", handleTablaClick);
  }

  // Búsqueda
  const searchBar = document.getElementById("searchBar");
  if (searchBar) {
    searchBar.addEventListener("input", handleBusqueda);
  }
  setupAutocomplete();

  // Botones de acciones rápidas
  const btnCriticos = document.querySelector("[data-action='ver-criticos']");
  if (btnCriticos) btnCriticos.addEventListener("click", filtrarCriticos);

  const btnTodos = document.querySelector("[data-action='ver-todos']");
  if (btnTodos) btnTodos.addEventListener("click", () => {
    const tbody = document.getElementById("tablaProductos");
    renderTablaProductos(productosCache, tbody);
  });

  // Carga masiva manual
  const btnMasiva = document.querySelector("[data-action='carga-masiva']");
  if (btnMasiva) btnMasiva.addEventListener("click", abrirModalCargaMasiva);

  const btnAgregarFila = document.getElementById("btnAgregarFila");
  if (btnAgregarFila) btnAgregarFila.addEventListener("click", agregarFilaMasiva);

  const btnGuardarLote = document.getElementById("btnGuardarLote");
  if (btnGuardarLote) btnGuardarLote.addEventListener("click", guardarLoteMasivo);

  const btnCerrarMasiva = document.getElementById("btnCerrarMasiva");
  if (btnCerrarMasiva) btnCerrarMasiva.addEventListener("click", cerrarModalCargaMasiva);

  // Carga CSV
  const btnCSV = document.querySelector("[data-action='carga-csv']");
  if (btnCSV) btnCSV.addEventListener("click", abrirModalCSV);

  const inputCSV = document.getElementById("inputCSV");
  if (inputCSV) inputCSV.addEventListener("change", handleCSVFile);

  const btnImportarCSV = document.getElementById("btnImportarCSV");
  if (btnImportarCSV) btnImportarCSV.addEventListener("click", importarCSV);

  const btnCerrarCSV = document.getElementById("btnCerrarCSV");
  if (btnCerrarCSV) btnCerrarCSV.addEventListener("click", cerrarModalCSV);

  // Eliminación total
  const btnWipe = document.querySelector("[data-action='wipe-inventario']");
  if (btnWipe) btnWipe.addEventListener("click", iniciarWipeInventario);

  // Exportar inventario
  const btnExportar = document.querySelector("[data-action='exportar-inventario']");
  if (btnExportar) btnExportar.addEventListener("click", exportarInventarioExcel);

  const btnWipeCancel1 = document.getElementById("btnWipeCancel1");
  if (btnWipeCancel1) btnWipeCancel1.addEventListener("click", cerrarWipeModals);

  const btnWipeNext = document.getElementById("btnWipeNext");
  if (btnWipeNext) btnWipeNext.addEventListener("click", abrirWipePaso2);

  const btnWipeCancel2 = document.getElementById("btnWipeCancel2");
  if (btnWipeCancel2) btnWipeCancel2.addEventListener("click", cerrarWipeModals);

  const inputWipeConfirm = document.getElementById("inputWipeConfirm");
  if (inputWipeConfirm) inputWipeConfirm.addEventListener("input", validarTextoWipe);

  const btnWipeExecute = document.getElementById("btnWipeExecute");
  if (btnWipeExecute) btnWipeExecute.addEventListener("click", ejecutarWipe);
}

// --- Handlers ---

async function handleCrear(e) {
  e.preventDefault();

  const payload = {
    codigo: document.getElementById("codigo").value,
    descripcion: document.getElementById("descripcion").value,
    categoria: document.getElementById("categoria").value,
    costo_prom: document.getElementById("costo_prom").value,
    costo_prom_bs: document.getElementById("costo_prom_bs") ? document.getElementById("costo_prom_bs").value : null,
    estado: document.getElementById("estado").value,
    unidad: document.getElementById("unidad").value,
    existencia: document.getElementById("existencia").value,
  };

  // Validación frontend
  const errores = validarProducto(payload);
  if (errores.length > 0) {
    mostrarErroresCampos(errores);
    return;
  }

  // Validar unicidad del código
  try {
    const existe = await existeCodigo(payload.codigo);
    if (existe) {
      showToast("El código ya existe. Usa uno diferente.", "error");
      return;
    }
  } catch (err) {
    showToast("Error verificando código: " + err.message, "error");
    return;
  }

  toggleBotonGuardar("productoForm", true);

  try {
    const nuevo = await crearProducto(payload);
    await audit("productos", "crear", `Producto ${nuevo.codigo} creado (ID: ${nuevo.id})`);
    showToast("Producto creado correctamente", "success");
    cerrarModalCrear();
    limpiarErroresCampos();
    await cargarProductos();
  } catch (err) {
    showToast("Error al crear producto: " + err.message, "error");
  } finally {
    toggleBotonGuardar("productoForm", false);
  }
}

async function handleEditar(e) {
  e.preventDefault();

  const id = document.getElementById("edit_id").value;
  const payload = {
    codigo: document.getElementById("edit_codigo").value,
    descripcion: document.getElementById("edit_descripcion").value,
    categoria: document.getElementById("edit_categoria").value,
    unidad: document.getElementById("edit_unidad").value,
    costo_prom: document.getElementById("edit_costo_prom").value,
    costo_prom_bs: document.getElementById("edit_costo_prom_bs") ? document.getElementById("edit_costo_prom_bs").value : null,
    existencia: document.getElementById("edit_existencia").value,
    estado: document.getElementById("edit_estado").value,
  };

  const errores = validarProducto(payload);
  if (errores.length > 0) {
    showToast(errores[0], "error");
    return;
  }

  toggleBotonGuardar("formEditarProducto", true);

  try {
    await actualizarProducto(id, payload);
    await audit("productos", "editar", `Producto ${payload.codigo} actualizado (ID: ${id})`);
    showToast("Producto actualizado correctamente", "success");
    cerrarModalEditar();
    await cargarProductos();
  } catch (err) {
    showToast("Error al actualizar producto: " + err.message, "error");
  } finally {
    toggleBotonGuardar("formEditarProducto", false);
  }
}

async function handleTablaClick(e) {
  const btn = e.target.closest("[data-id]");
  if (!btn) return;

  const id = btn.dataset.id;

  if (btn.classList.contains("btn-editar-producto")) {
    try {
      const producto = await obtenerProductoPorId(id);
      abrirModalEditar(producto);
    } catch (err) {
      showToast("Error cargando producto: " + err.message, "error");
    }
  }

  if (btn.classList.contains("btn-eliminar-producto")) {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;
    try {
      await eliminarProducto(id);
      await audit("productos", "eliminar", `Producto eliminado (ID: ${id})`);
      showToast("Producto eliminado", "success");
      await cargarProductos();
    } catch (err) {
      showToast("Error al eliminar producto: " + err.message, "error");
    }
  }
}

let autocompleteIndex = -1;

function handleBusqueda() {
  const q = document.getElementById("searchBar").value.toLowerCase().trim();
  const resultsBox = document.getElementById("autocomplete-results");

  // Filtrar tabla normalmente
  const filtrados = productosCache.filter((p) =>
    (p.codigo && p.codigo.toLowerCase().includes(q)) ||
    (p.descripcion && p.descripcion.toLowerCase().includes(q))
  );
  const tbody = document.getElementById("tablaProductos");
  renderTablaProductos(filtrados, tbody);

  // Mostrar dropdown de autocompletado
  if (q.length < 2) {
    resultsBox.style.display = "none";
    autocompleteIndex = -1;
    return;
  }

  const sugerencias = filtrados.slice(0, 10);
  if (sugerencias.length === 0) {
    resultsBox.innerHTML = `<div class="autocomplete-item" style="color:#9ca3af;cursor:default;justify-content:center;">Sin resultados</div>`;
    resultsBox.style.display = "block";
    return;
  }

  resultsBox.innerHTML = sugerencias.map((p, i) => {
    const stock = p.existencia || 0;
    const stockClass = stock === 0 ? "zero" : stock < 5 ? "low" : "";
    return `<div class="autocomplete-item" data-index="${i}" data-codigo="${p.codigo || ""}">
      <span class="ac-desc">${esc(p.descripcion || "")}</span>
      <span class="ac-meta">
        <span class="ac-codigo">${esc(p.codigo || "")}</span>
        <span class="ac-cat">${esc(p.categoria || "")}</span>
        <span class="ac-stock ${stockClass}">${stock} uds</span>
      </span>
    </div>`;
  }).join("");
  resultsBox.style.display = "block";
  autocompleteIndex = -1;
}

// Navegación con teclado en el autocomplete
function setupAutocomplete() {
  const searchBar = document.getElementById("searchBar");
  const resultsBox = document.getElementById("autocomplete-results");
  if (!searchBar || !resultsBox) return;

  searchBar.addEventListener("keydown", (e) => {
    const items = resultsBox.querySelectorAll(".autocomplete-item[data-codigo]");
    if (!items.length || resultsBox.style.display === "none") return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      autocompleteIndex = Math.min(autocompleteIndex + 1, items.length - 1);
      updateActiveItem(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      autocompleteIndex = Math.max(autocompleteIndex - 1, 0);
      updateActiveItem(items);
    } else if (e.key === "Enter" && autocompleteIndex >= 0) {
      e.preventDefault();
      items[autocompleteIndex]?.click();
    } else if (e.key === "Escape") {
      resultsBox.style.display = "none";
      autocompleteIndex = -1;
    }
  });

  // Click en item del autocomplete
  resultsBox.addEventListener("click", (e) => {
    const item = e.target.closest(".autocomplete-item[data-codigo]");
    if (!item) return;
    const codigo = item.dataset.codigo;
    // Poner el texto en el buscador y filtrar
    const producto = productosCache.find(p => p.codigo === codigo);
    if (producto) {
      searchBar.value = producto.descripcion;
      handleBusqueda();
    }
    resultsBox.style.display = "none";
    autocompleteIndex = -1;
  });

  // Cerrar al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!resultsBox.contains(e.target) && e.target !== searchBar) {
      resultsBox.style.display = "none";
      autocompleteIndex = -1;
    }
  });
}

function updateActiveItem(items) {
  items.forEach((item, i) => {
    item.classList.toggle("active", i === autocompleteIndex);
  });
  if (autocompleteIndex >= 0 && items[autocompleteIndex]) {
    items[autocompleteIndex].scrollIntoView({ block: "nearest" });
  }
}

function filtrarCriticos() {
  const criticos = productosCache.filter((p) => {
    const umbral = p.umbral_critico || 5;
    return (p.existencia || 0) < umbral && p.estado === "activo";
  });
  const tbody = document.getElementById("tablaProductos");
  renderTablaProductos(criticos, tbody);
  const searchBar = document.getElementById("searchBar");
  if (searchBar) searchBar.value = "";
}

// --- Realtime ---

function iniciarRealtime() {
  suscribirRealtime((evento) => {
    // Refrescar datos completos en cada cambio
    cargarProductos();
  });
}

// Limpiar al salir de la página
window.addEventListener("beforeunload", () => {
  desuscribirRealtime();
});

// --- Validación ---

function validarProducto(payload) {
  const errores = [];

  if (!payload.codigo || !payload.codigo.trim()) {
    errores.push({ campo: "codigo", msg: "El código es requerido" });
  }
  if (!payload.descripcion || !payload.descripcion.trim()) {
    errores.push({ campo: "descripcion", msg: "La descripción es requerida" });
  }
  if (!payload.categoria || !payload.categoria.trim()) {
    errores.push({ campo: "categoria", msg: "La categoría es requerida" });
  }
  if (payload.costo_prom === undefined || payload.costo_prom === "") {
    errores.push({ campo: "costo_prom", msg: "El costo es requerido" });
  } else {
    const costo = Number(String(payload.costo_prom).replace(",", "."));
    if (isNaN(costo) || costo <= 0) {
      errores.push({ campo: "costo_prom", msg: "El costo debe ser mayor a 0" });
    }
  }
  if (payload.existencia !== undefined && payload.existencia !== "") {
    const ex = Number(payload.existencia);
    if (isNaN(ex) || ex < 0) {
      errores.push({ campo: "existencia", msg: "La existencia debe ser >= 0" });
    }
  }

  return errores;
}

function mostrarErroresCampos(errores) {
  limpiarErroresCampos();
  errores.forEach(({ campo, msg }) => {
    const el = document.getElementById(`error-${campo}`);
    if (el) el.textContent = msg;
  });
  if (errores.length > 0) {
    showToast(errores[0].msg, "error");
  }
}

function limpiarErroresCampos() {
  document.querySelectorAll(".field-error").forEach(el => el.textContent = "");
}

// --- Exponer funciones globales para compatibilidad con HTML inline ---
window.abrirFormulario = abrirModalCrear;
window.cerrarFormulario = cerrarModalCrear;
window.filtrarCriticos = filtrarCriticos;
window.filtrarProductos = handleBusqueda;
window.editarProducto = async (id) => {
  try {
    const producto = await obtenerProductoPorId(id);
    abrirModalEditar(producto);
  } catch (err) {
    showToast("Error cargando producto: " + err.message, "error");
  }
};

// ============================================================
// EXPORTAR INVENTARIO A EXCEL (CSV)
// ============================================================

async function exportarInventarioExcel() {
  try {
    const inventario = await getInventarioCompleto();
    if (!inventario || inventario.length === 0) {
      showToast("No hay productos para exportar", "warning");
      return;
    }

    const columnas = [
      { key: "codigo", label: "Código" },
      { key: "descripcion", label: "Descripción" },
      { key: "unidad", label: "Unidad" },
      { key: "costo_prom", label: "Costo Promedio USD" },
      { key: "costo_prom_bs", label: "Costo Promedio BS" },
      { key: "existencia", label: "Existencia" },
      { key: "categoria", label: "Categoría" },
      { key: "estado", label: "Estado" },
    ];

    const formato = exportarDatos(`Inventario_${new Date().toISOString().slice(0, 10)}`, inventario, columnas);
    showToast(`${inventario.length} productos exportados (${formato.toUpperCase()})`, "success");
  } catch (err) {
    showToast("Error exportando inventario: " + err.message, "error");
  }
}

// ============================================================
// CARGA MASIVA MANUAL
// ============================================================

function abrirModalCargaMasiva() {
  const modal = document.getElementById("modalCargaMasiva");
  if (modal) {
    modal.classList.add("show");
    const body = document.getElementById("bodyMasiva");
    body.innerHTML = "";
    agregarFilaMasiva();
    agregarFilaMasiva();
    agregarFilaMasiva();
  }
}

function cerrarModalCargaMasiva() {
  const modal = document.getElementById("modalCargaMasiva");
  if (modal) modal.classList.remove("show");
  document.getElementById("erroresMasiva").textContent = "";
}

function agregarFilaMasiva() {
  const body = document.getElementById("bodyMasiva");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" class="m-codigo" placeholder="PROD-001"></td>
    <td><input type="text" class="m-descripcion" placeholder="Nombre"></td>
    <td><input type="text" class="m-categoria" placeholder="Categoría"></td>
    <td><input type="number" class="m-costo" min="0.01" step="0.01" placeholder="0.00"></td>
    <td><input type="number" class="m-costo-bs" min="0.01" step="0.01" placeholder="0.00"></td>
    <td><input type="number" class="m-stock" min="0" step="1" placeholder="0"></td>
    <td><button type="button" class="btn-remove-row"><i class="fa fa-times"></i></button></td>
  `;
  body.appendChild(tr);

  tr.querySelector(".btn-remove-row").addEventListener("click", () => {
    tr.remove();
  });
}

async function guardarLoteMasivo() {
  const filas = document.querySelectorAll("#bodyMasiva tr");
  const lista = [];
  const errores = [];

  filas.forEach((tr, i) => {
    const codigo = tr.querySelector(".m-codigo").value.trim();
    const descripcion = tr.querySelector(".m-descripcion").value.trim();
    const categoria = tr.querySelector(".m-categoria").value.trim();
    const costo = tr.querySelector(".m-costo").value;
    const costoBs = tr.querySelector(".m-costo-bs").value;
    const stock = tr.querySelector(".m-stock").value;

    if (!codigo && !descripcion) return; // fila vacía, ignorar

    if (!codigo) errores.push(`Fila ${i + 1}: código requerido`);
    if (!descripcion) errores.push(`Fila ${i + 1}: descripción requerida`);
    if (!categoria) errores.push(`Fila ${i + 1}: categoría requerida`);
    if (!costo || Number(costo) <= 0) errores.push(`Fila ${i + 1}: costo debe ser > 0`);

    lista.push({
      codigo,
      descripcion,
      categoria,
      costo_prom: costo,
      costo_prom_bs: costoBs || null,
      existencia: stock || "0",
      estado: "activo",
    });
  });

  const errDiv = document.getElementById("erroresMasiva");

  if (lista.length === 0) {
    errDiv.textContent = "No hay filas con datos para guardar.";
    return;
  }

  if (errores.length > 0) {
    errDiv.innerHTML = errores.join("<br>");
    return;
  }

  errDiv.textContent = "";

  try {
    const resultado = await crearProductosEnLote(lista);
    if (resultado.errores.length > 0) {
      showToast(`Insertados: ${resultado.insertados}. Errores: ${resultado.errores.length}`, "warning");
      errDiv.innerHTML = resultado.errores.map(e => `Fila ${e.fila}: ${e.error}`).join("<br>");
    } else {
      showToast(`${resultado.insertados} productos creados correctamente`, "success");
      await audit("productos", "carga_masiva_manual", `Lote de ${resultado.insertados} productos creados`);
      cerrarModalCargaMasiva();
      await cargarProductos();
    }
  } catch (err) {
    showToast("Error en carga masiva: " + err.message, "error");
  }
}

// ============================================================
// CARGA MASIVA CSV
// ============================================================

let csvDataParsed = [];

function abrirModalCSV() {
  const modal = document.getElementById("modalCargaCSV");
  if (modal) {
    modal.classList.add("show");
    document.getElementById("inputCSV").value = "";
    document.getElementById("previewCSV").innerHTML = "";
    document.getElementById("erroresCSV").textContent = "";
    document.getElementById("btnImportarCSV").disabled = true;
    csvDataParsed = [];
  }
}

function cerrarModalCSV() {
  const modal = document.getElementById("modalCargaCSV");
  if (modal) modal.classList.remove("show");
  csvDataParsed = [];
}

function handleCSVFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    const text = evt.target.result;
    parsearCSV(text);
  };
  reader.readAsText(file);
}

function parsearCSV(text) {
  // Eliminar BOM si existe
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const errDiv = document.getElementById("erroresCSV");
  const previewDiv = document.getElementById("previewCSV");
  const btnImportar = document.getElementById("btnImportarCSV");

  if (lines.length < 2) {
    errDiv.textContent = "El archivo debe tener al menos una fila de encabezado y una de datos.";
    btnImportar.disabled = true;
    return;
  }

  // Detectar separador automáticamente (coma o punto y coma)
  const firstLine = lines[0];
  const sep = firstLine.includes(";") ? ";" : ",";

  // Parsear encabezado
  const header = firstLine.split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
  const requiredCols = ["codigo", "descripcion", "categoria", "costo"];
  const missing = requiredCols.filter(c => !header.includes(c));

  if (missing.length > 0) {
    errDiv.textContent = `Columnas faltantes: ${missing.join(", ")}. Requeridas: codigo, descripcion, categoria, costo, costo_bs, stock`;
    btnImportar.disabled = true;
    return;
  }

  const iCodigo = header.indexOf("codigo");
  const iDesc = header.indexOf("descripcion");
  const iCat = header.indexOf("categoria");
  const iCosto = header.indexOf("costo");
  const iCostoBs = header.indexOf("costo_bs");
  const iStock = header.indexOf("stock");

  csvDataParsed = [];
  const errores = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ""));
    const codigo = cols[iCodigo] || "";
    const descripcion = cols[iDesc] || "";
    const categoria = cols[iCat] || "";
    let costo = cols[iCosto] || "0";
    let costoBs = iCostoBs >= 0 ? (cols[iCostoBs] || "0") : null;
    const stock = iStock >= 0 ? (cols[iStock] || "0") : "0";

    if (!codigo && !descripcion) continue;
    if (!codigo) { errores.push(`Fila ${i + 1}: código vacío`); continue; }
    if (!descripcion) { errores.push(`Fila ${i + 1}: descripción vacía`); continue; }

    // Normalizar costo (aceptar punto o coma como decimal)
    costo = costo.replace(",", ".");
    const costoNum = parseFloat(costo) || 0;

    if (costoBs !== null) {
      costoBs = costoBs.replace(",", ".");
      const costoBsNum = parseFloat(costoBs);
      if (isNaN(costoBsNum)) costoBs = null;
    }

    csvDataParsed.push({ codigo, descripcion, categoria: categoria || "Materiales", costo_prom: costoNum, costo_prom_bs: costoBs, existencia: parseInt(stock) || 0, estado: "activo" });
  }

  // Preview
  const maxPreview = Math.min(csvDataParsed.length, 10);
  let html = `<p style="color:#22c55e;margin-bottom:8px;">${csvDataParsed.length} productos detectados (separador: "${sep}")</p>`;
  html += `<table style="width:100%;font-size:11px;border-collapse:collapse;">`;
  html += `<tr style="border-bottom:1px solid #333;"><th>Código</th><th>Descripción</th><th>Categoría</th><th>Costo (USD)</th><th>Costo (BS)</th><th>Stock</th></tr>`;
  for (let i = 0; i < maxPreview; i++) {
    const p = csvDataParsed[i];
    const costoBs = p.costo_prom_bs != null ? p.costo_prom_bs : "N/A";
    html += `<tr><td>${p.codigo}</td><td>${p.descripcion}</td><td>${p.categoria}</td><td>${p.costo_prom}</td><td>${costoBs}</td><td>${p.existencia}</td></tr>`;
  }
  if (csvDataParsed.length > 10) html += `<tr><td colspan="6" style="color:#9ca3af;">... y ${csvDataParsed.length - 10} más</td></tr>`;
  html += `</table>`;
  previewDiv.innerHTML = html;

  if (errores.length > 0) {
    errDiv.innerHTML = errores.slice(0, 10).join("<br>");
    if (csvDataParsed.length > 0) {
      errDiv.innerHTML += `<br><span style="color:#f59e0b;">Se importarán ${csvDataParsed.length} productos válidos (${errores.length} con errores serán omitidos)</span>`;
      btnImportar.disabled = false;
    } else {
      btnImportar.disabled = true;
    }
  } else {
    errDiv.textContent = "";
    btnImportar.disabled = false;
  }
}

async function importarCSV() {
  if (csvDataParsed.length === 0) {
    showToast("No hay datos para importar", "error");
    return;
  }

  try {
    const resultado = await crearProductosEnLote(csvDataParsed);
    if (resultado.errores.length > 0) {
      showToast(`Insertados: ${resultado.insertados}. Errores: ${resultado.errores.length}`, "warning");
    } else {
      showToast(`${resultado.insertados} productos importados desde CSV`, "success");
      await audit("productos", "carga_masiva_csv", `Lote CSV de ${resultado.insertados} productos importados`);
      cerrarModalCSV();
      await cargarProductos();
    }
  } catch (err) {
    showToast("Error importando CSV: " + err.message, "error");
  }
}

// ============================================================
// ELIMINACIÓN TOTAL SEGURA
// ============================================================

const WIPE_ROLES = ["administrador", "jefe"];

async function iniciarWipeInventario() {
  // Verificar rol
  let rolUsuarioWipe = null;
  try {
    const session = getSession();
    if (session && session.user) {
      const { data } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", session.user.id)
        .single();
      if (data) rolUsuarioWipe = data.rol;
    }
  } catch (err) { /* ignore */ }

  if (!WIPE_ROLES.includes(rolUsuarioWipe)) {
    showToast("No tienes permisos para esta acción", "error");
    return;
  }

  // Mostrar conteo
  try {
    const conteo = await obtenerConteoInventario();
    document.getElementById("wipeCountInfo").innerHTML =
      `Se eliminarán: <strong style="color:#ef4444;">${conteo.productos} productos</strong> y <strong style="color:#ef4444;">${conteo.movimientos} movimientos</strong>`;
  } catch (err) {
    document.getElementById("wipeCountInfo").textContent = "Error obteniendo conteo";
  }

  document.getElementById("modalWipeConfirm1").classList.add("show");
}

function cerrarWipeModals() {
  document.getElementById("modalWipeConfirm1").classList.remove("show");
  document.getElementById("modalWipeConfirm2").classList.remove("show");
  document.getElementById("inputWipeConfirm").value = "";
  document.getElementById("btnWipeExecute").disabled = true;
  document.getElementById("btnWipeExecute").style.opacity = "0.5";
}

function abrirWipePaso2() {
  document.getElementById("modalWipeConfirm1").classList.remove("show");
  document.getElementById("modalWipeConfirm2").classList.add("show");
  document.getElementById("inputWipeConfirm").value = "";
  document.getElementById("btnWipeExecute").disabled = true;
  document.getElementById("btnWipeExecute").style.opacity = "0.5";
}

function validarTextoWipe() {
  const input = document.getElementById("inputWipeConfirm").value.trim();
  const btn = document.getElementById("btnWipeExecute");
  if (input === "ELIMINAR TODO") {
    btn.disabled = false;
    btn.style.opacity = "1";
  } else {
    btn.disabled = true;
    btn.style.opacity = "0.5";
  }
}

async function ejecutarWipe() {
  const input = document.getElementById("inputWipeConfirm").value.trim();
  if (input !== "ELIMINAR TODO") return;

  try {
    const resultado = await eliminarTodoInventario();
    await audit("productos", "wipe_total_inventario",
      `Eliminación total: ${resultado.productos_eliminados} productos, ${resultado.movimientos_eliminados} movimientos`);
    showToast(`Inventario eliminado: ${resultado.productos_eliminados} productos, ${resultado.movimientos_eliminados} movimientos`, "success");
    cerrarWipeModals();
    await cargarProductos();
  } catch (err) {
    showToast("Error eliminando inventario: " + err.message, "error");
  }
}

// --- Utilidad de escape HTML ---
function esc(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
