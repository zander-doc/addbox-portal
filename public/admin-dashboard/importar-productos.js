/**
 * importar-productos.js
 * Controlador para la página de importación de productos.
 */

import { importarCSV, guardarProductos, crearStockInicial, actualizarTasaCambio, obtenerTasaCambio } from "./importService.js";
import { getSession } from "./sessionService.js";
import { showToast } from "./toastService.js";

// Elementos del DOM
const archivoInput = document.getElementById("archivoCSV");
const btnPreview = document.getElementById("btnPreview");
const panelPreview = document.getElementById("panelPreview");
const tablaPreview = document.getElementById("tablaPreview").querySelector("tbody");
const countProductos = document.getElementById("countProductos");
const countErrores = document.getElementById("countErrores");
const btnImportar = document.getElementById("btnImportar");
const panelProgreso = document.getElementById("panelProgreso");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const panelResultados = document.getElementById("panelResultados");
const resultadosInsertados = document.getElementById("resultadosInsertados");
const resultadosErrores = document.getElementById("resultadosErrores");
const detallesErrores = document.getElementById("detallesErrores");
const btnVolver = document.getElementById("btnVolver");
const btnLogout = document.getElementById("btnLogout"); // puede ser null si usa sidebar

// Estado
let productosPreview = [];
let erroresParsing = [];

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  const session = getSession();
  if (!session) {
    window.location.href = "/admin-dashboard/inicio-de-sesion.html";
    return;
  }

  const usuarioEl = document.getElementById("usuarioNombre");
  if (usuarioEl) usuarioEl.textContent = session.user.email;

  // Configurar eventos
  btnPreview.addEventListener("click", mostrarVistaPrevia);
  btnImportar.addEventListener("click", iniciarImportacion);
  if (btnVolver) {
    btnVolver.addEventListener("click", () => {
      window.location.href = "/admin-dashboard/modules/inventario/inventario.html";
    });
  }
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "/admin-dashboard/inicio-de-sesion.html";
    });
  }
});

// Mostrar vista previa
async function mostrarVistaPrevia() {
  const archivo = archivoInput.files[0];
  if (!archivo) {
    showToast("Selecciona un archivo CSV primero", "warning");
    return;
  }

  if (!archivo.name.endsWith(".csv")) {
    showToast("El archivo debe ser CSV", "warning");
    return;
  }

  // Mostrar progreso
  panelProgreso.style.display = "block";
  progressFill.style.width = "20%";
  progressText.textContent = "Leyendo archivo...";

  try {
    const resultado = await importarCSV(archivo);
    productosPreview = resultado.productos;
    erroresParsing = resultado.errores;

    // Actualizar UI
    countProductos.textContent = productosPreview.length;
    countErrores.textContent = erroresParsing.length;

    if (erroresParsing.length > 0) {
      showToast(`Se encontraron ${erroresParsing.length} errores de parsing`, "warning");
    }

    // Renderizar tabla
    renderizarTabla(productosPreview);

    // Mostrar panel de preview
    panelPreview.style.display = "block";
    btnImportar.disabled = productosPreview.length === 0;

    // Ocultar progreso
    panelProgreso.style.display = "none";

    showToast(`Vista previa cargada: ${productosPreview.length} productos`, "success");
  } catch (err) {
    console.error("Error en vista previa:", err);
    showToast(`Error al leer archivo: ${err.message}`, "error");
    panelProgreso.style.display = "none";
  }
}

// Renderizar tabla de preview
function renderizarTabla(productos) {
  tablaPreview.innerHTML = "";

  if (productos.length === 0) {
    tablaPreview.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#9ca3af;">No hay productos para mostrar</td></tr>`;
    return;
  }

  // Mostrar solo primeras 50 filas para no saturar
  const limite = Math.min(productos.length, 50);
  const filas = productos.slice(0, limite).map((p) => `
    <tr>
      <td>${escapeHtml(p.codigo)}</td>
      <td>${escapeHtml(p.descripcion)}</td>
      <td>${escapeHtml(p.unidad)}</td>
      <td>${p.costo_prom_dolares?.toFixed(2) || "0.00"}</td>
      <td>${p.costo_prom?.toFixed(2) || "0.00"}</td>
      <td>${escapeHtml(p.categoria)}</td>
      <td>${escapeHtml(p.estado)}</td>
    </tr>
  `).join("");

  tablaPreview.innerHTML = filas;

  if (productos.length > 50) {
    const filaExtra = document.createElement("tr");
    filaExtra.innerHTML = `<td colspan="7" style="text-align:center;color:#9ca3af;">... y ${productos.length - 50} productos más</td>`;
    tablaPreview.appendChild(filaExtra);
  }
}

// Iniciar importación
async function iniciarImportacion() {
  if (productosPreview.length === 0) {
    showToast("No hay productos para importar", "warning");
    return;
  }

  // Confirmación
  if (!confirm(`¿Importar ${productosPreview.length} productos? Esta acción actualizará productos existentes.`)) {
    return;
  }

  // Mostrar progreso
  panelProgreso.style.display = "block";
  progressFill.style.width = "0%";
  progressText.textContent = "Iniciando importación...";

  try {
    // Paso 1: Guardar productos
    progressFill.style.width = "30%";
    progressText.textContent = "Guardando productos en Supabase...";

    const resultado = await guardarProductos(productosPreview);

    if (!resultado.success) {
      throw new Error(resultado.errores.join("\n"));
    }

    // Paso 2: Crear stock_obra
    progressFill.style.width = "70%";
    progressText.textContent = "Creando stock_obra para todas las obras...";

    const stockResultado = await crearStockInicial();

    if (!stockResultado.success) {
      console.warn("Advertencia al crear stock_obra:", stockResultado.errores);
    }

    // Paso 3: Mostrar resultados
    progressFill.style.width = "100%";
    progressText.textContent = "Importación completada";

    setTimeout(() => {
      panelProgreso.style.display = "none";
      panelResultados.style.display = "block";

      resultadosInsertados.textContent = resultado.insertados;
      resultadosErrores.textContent = stockResultado.errores.length;

      if (stockResultado.errores.length > 0) {
        detallesErrores.innerHTML = stockResultado.errores
          .map((e) => `<p class="error-item">• ${escapeHtml(e)}</p>`)
          .join("");
        detallesErrores.style.display = "block";
      }

      showToast(`Importación completada: ${resultado.insertados} productos`, "success");
    }, 1000);

  } catch (err) {
    console.error("Error en importación:", err);
    showToast(`Error: ${err.message}`, "error");
    panelProgreso.style.display = "none";
  }
}

// Utilidades
function escapeHtml(texto) {
  if (!texto) return "";
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}
