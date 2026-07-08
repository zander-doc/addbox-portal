/**
 * lote.controller.js
 * Controller para operaciones de inventario por lote.
 * Gestiona agregar/eliminar líneas manualmente, importación CSV,
 * validación del lote completo y procesamiento atómico.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7
 */

import { validarLote, procesarLote, parsearCSV } from "./lote.service.js";
import { supabase } from "../../services/supabase-client.js";
import { getSession } from "../../services/sessionService.js";
import { showToast } from "../../services/toastService.js";

// ─── Estado interno ────────────────────────────────────────────────────────────

/** @type {Array<{codigo_producto?: string, producto_id?: string, cantidad: number|string, tipo: string, obra?: string, obra_id?: string, motivo?: string, obra_destino_id?: string, _invalida?: boolean, _error?: string}>} */
let lineas = [];

/** Indica si se está procesando el lote */
let procesando = false;

/** Límite máximo de líneas por lote */
const LIMITE_LINEAS = 500;

// ─── Inicialización ────────────────────────────────────────────────────────────

/**
 * Inicializa el controller de operaciones por lote.
 * Debe llamarse después de que el DOM de lote.html esté disponible.
 */
export function initLoteController() {
  const session = getSession();
  if (!session) {
    window.location.href = "/admin-dashboard/inicio-de-sesion.html";
    return;
  }

  configurarEventos();
  renderTablaLineas();
  actualizarEstadoBotonConfirmar();
}

// ─── Configuración de eventos ──────────────────────────────────────────────────

function configurarEventos() {
  // Botón agregar línea manualmente
  const btnAgregar = document.getElementById("btnAgregarLinea");
  if (btnAgregar) {
    btnAgregar.addEventListener("click", agregarLineaManual);
  }

  // Botón importar CSV
  const btnImportar = document.getElementById("btnImportarCSV");
  if (btnImportar) {
    btnImportar.addEventListener("click", () => {
      const inputFile = document.getElementById("inputCSV");
      if (inputFile) inputFile.click();
    });
  }

  // Input file para CSV
  const inputCSV = document.getElementById("inputCSV");
  if (inputCSV) {
    inputCSV.addEventListener("change", handleImportarCSV);
  }

  // Botón confirmar lote
  const btnConfirmar = document.getElementById("btnConfirmarLote");
  if (btnConfirmar) {
    btnConfirmar.addEventListener("click", confirmarLote);
  }

  // Botón limpiar lote
  const btnLimpiar = document.getElementById("btnLimpiarLote");
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", limpiarLote);
  }
}

// ─── Gestión de líneas manuales (Req 6.1) ──────────────────────────────────────

/**
 * Agrega una línea vacía al lote para que el usuario la complete.
 * Req 6.1: permitir agregar entre 1 y 500 líneas.
 */
export function agregarLineaManual() {
  if (lineas.length >= LIMITE_LINEAS) {
    showToast(`El lote no puede exceder ${LIMITE_LINEAS} líneas`, "warning");
    return;
  }

  lineas.push({
    codigo_producto: "",
    cantidad: "",
    tipo: "entrada",
    obra: "",
    _invalida: false,
    _error: "",
  });

  renderTablaLineas();
  actualizarEstadoBotonConfirmar();
}

/**
 * Elimina una línea del lote por su índice.
 * @param {number} indice - Índice de la línea a eliminar
 */
export function eliminarLinea(indice) {
  if (indice < 0 || indice >= lineas.length) return;

  lineas.splice(indice, 1);
  renderTablaLineas();
  actualizarEstadoBotonConfirmar();
}

/**
 * Actualiza el valor de un campo en una línea específica.
 * @param {number} indice - Índice de la línea
 * @param {string} campo - Nombre del campo a actualizar
 * @param {string|number} valor - Nuevo valor
 */
export function actualizarCampoLinea(indice, campo, valor) {
  if (indice < 0 || indice >= lineas.length) return;

  lineas[indice][campo] = valor;

  // Limpiar estado de error al editar (Req 6.3: permitir corregir sin perder válidas)
  lineas[indice]._invalida = false;
  lineas[indice]._error = "";

  actualizarEstadoBotonConfirmar();
}

// ─── Importación CSV (Req 6.5, 6.6, 6.7) ──────────────────────────────────────

/**
 * Maneja la importación de un archivo CSV.
 * Lee el archivo, parsea su contenido y carga las líneas o muestra errores.
 *
 * Req 6.5: importar líneas desde CSV con columnas codigo_producto, cantidad, tipo, obra.
 * Req 6.6: mostrar errores de formato por fila.
 * Req 6.7: rechazar si excede 500 líneas.
 *
 * @param {Event} event - Evento change del input file
 */
async function handleImportarCSV(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  // Validar que sea un archivo CSV o texto
  if (!file.name.endsWith(".csv") && !file.type.includes("text") && !file.type.includes("csv")) {
    showToast("Seleccione un archivo CSV válido", "warning");
    resetInputCSV();
    return;
  }

  try {
    const contenido = await leerArchivoComoTexto(file);

    if (!contenido || contenido.trim().length === 0) {
      showToast("El archivo está vacío", "warning");
      resetInputCSV();
      return;
    }

    const resultado = parsearCSV(contenido);

    // Mostrar errores de parseo si los hay (Req 6.6)
    if (resultado.errores.length > 0) {
      mostrarErroresCSV(resultado.errores);
    }

    // Si hay líneas válidas, agregarlas al lote
    if (resultado.lineas.length > 0) {
      // Verificar que no se exceda el límite total (Req 6.7)
      const totalLineas = lineas.length + resultado.lineas.length;
      if (totalLineas > LIMITE_LINEAS) {
        showToast(
          `No se pueden agregar ${resultado.lineas.length} líneas. El lote tendría ${totalLineas} líneas (máximo ${LIMITE_LINEAS})`,
          "error"
        );
        resetInputCSV();
        return;
      }

      // Agregar líneas parseadas al lote
      resultado.lineas.forEach((linea) => {
        lineas.push({
          ...linea,
          _invalida: false,
          _error: "",
        });
      });

      showToast(`${resultado.lineas.length} líneas importadas correctamente`, "success");
      renderTablaLineas();
      actualizarEstadoBotonConfirmar();
    } else if (resultado.errores.length > 0) {
      showToast("No se pudieron importar líneas. Revise los errores.", "error");
    }
  } catch (err) {
    console.error("Error leyendo archivo CSV:", err);
    showToast("Error al leer el archivo CSV", "error");
  }

  resetInputCSV();
}

/**
 * Lee un archivo como texto usando FileReader.
 * @param {File} file
 * @returns {Promise<string>}
 */
function leerArchivoComoTexto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
    reader.readAsText(file, "UTF-8");
  });
}

/**
 * Resetea el input file para permitir seleccionar el mismo archivo de nuevo.
 */
function resetInputCSV() {
  const inputCSV = document.getElementById("inputCSV");
  if (inputCSV) inputCSV.value = "";
}

/**
 * Muestra los errores de parseo CSV en la UI.
 * Req 6.6: mostrar número de fila y motivo del error.
 * @param {Array<{fila: number, motivo: string}>} errores
 */
function mostrarErroresCSV(errores) {
  const contenedor = document.getElementById("erroresCSV");
  if (!contenedor) {
    // Fallback: mostrar como toast los primeros errores
    const maxMostrar = Math.min(errores.length, 3);
    for (let i = 0; i < maxMostrar; i++) {
      showToast(`Fila ${errores[i].fila}: ${errores[i].motivo}`, "warning");
    }
    if (errores.length > maxMostrar) {
      showToast(`...y ${errores.length - maxMostrar} errores más`, "warning");
    }
    return;
  }

  contenedor.classList.remove("hidden");
  contenedor.innerHTML = `
    <div class="errores-csv-header">
      <strong>Errores en archivo CSV (${errores.length})</strong>
      <button type="button" class="btn-cerrar-errores" id="btnCerrarErroresCSV">&times;</button>
    </div>
    <ul class="errores-csv-lista">
      ${errores.map((e) => `<li>Fila ${e.fila}: ${escapeHtml(e.motivo)}</li>`).join("")}
    </ul>
  `;

  // Botón cerrar errores
  const btnCerrar = document.getElementById("btnCerrarErroresCSV");
  if (btnCerrar) {
    btnCerrar.addEventListener("click", () => {
      contenedor.classList.add("hidden");
      contenedor.innerHTML = "";
    });
  }
}

// ─── Validación del lote (Req 6.2, 6.3) ────────────────────────────────────────

/**
 * Valida el lote completo antes de confirmar.
 * Marca líneas inválidas sin perder las válidas (Req 6.3).
 *
 * @returns {boolean} true si el lote es válido
 */
export function validarLoteCompleto() {
  if (lineas.length === 0) {
    showToast("Agregue al menos una línea al lote", "warning");
    return false;
  }

  // Preparar líneas para validación (sin campos internos)
  const lineasParaValidar = lineas.map((l) => ({
    codigo_producto: l.codigo_producto || undefined,
    producto_id: l.producto_id || undefined,
    cantidad: l.cantidad,
    tipo: l.tipo,
    obra: l.obra || undefined,
    obra_id: l.obra_id || undefined,
    motivo: l.motivo || undefined,
    obra_destino_id: l.obra_destino_id || undefined,
  }));

  const resultado = validarLote(lineasParaValidar);

  if (!resultado.valido) {
    // Marcar líneas inválidas con su motivo específico (Req 6.3)
    // Primero limpiar estados previos
    lineas.forEach((l) => {
      l._invalida = false;
      l._error = "";
    });

    // Marcar las líneas con error
    resultado.errores.forEach((err) => {
      if (err.linea === 0) {
        // Error global del lote
        showToast(err.motivo, "error");
      } else {
        const idx = err.linea - 1;
        if (idx >= 0 && idx < lineas.length) {
          lineas[idx]._invalida = true;
          // Acumular errores si hay múltiples para la misma línea
          if (lineas[idx]._error) {
            lineas[idx]._error += "; " + err.motivo;
          } else {
            lineas[idx]._error = err.motivo;
          }
        }
      }
    });

    renderTablaLineas();
    showToast(`El lote tiene ${resultado.errores.length} error(es). Corrija las líneas marcadas.`, "warning");
    return false;
  }

  // Limpiar marcas de error si todo es válido
  lineas.forEach((l) => {
    l._invalida = false;
    l._error = "";
  });

  return true;
}

// ─── Procesamiento del lote (Req 6.2, 6.4) ─────────────────────────────────────

/**
 * Confirma y procesa el lote completo.
 * Valida primero, luego envía al backend para procesamiento atómico.
 *
 * Req 6.2: validar cada línea antes de procesar.
 * Req 6.4: procesar como transacción atómica.
 */
async function confirmarLote() {
  if (procesando) return;

  // Validar lote completo
  if (!validarLoteCompleto()) return;

  procesando = true;
  actualizarEstadoBotonConfirmar();
  mostrarEstadoProcesando(true);

  try {
    // Preparar líneas para el servicio (sin campos internos _invalida, _error)
    const lineasProcesar = lineas.map((l) => ({
      codigo_producto: l.codigo_producto || undefined,
      producto_id: l.producto_id || undefined,
      cantidad: Number(l.cantidad),
      tipo: l.tipo,
      obra: l.obra || undefined,
      obra_id: l.obra_id || undefined,
      motivo: l.motivo || undefined,
      obra_destino_id: l.obra_destino_id || undefined,
    }));

    const resultado = await procesarLote(lineasProcesar);

    if (resultado.success) {
      showToast(
        `Lote procesado exitosamente. ${resultado.movimientos_creados} movimientos creados.`,
        "success"
      );
      // Limpiar lote después de éxito
      lineas = [];
      renderTablaLineas();
      mostrarResultadoExito(resultado);
    } else {
      // Error del backend
      showToast(resultado.error || "Error al procesar el lote", "error");

      // Si hay errores por línea del backend, marcarlos
      if (resultado.errores && resultado.errores.length > 0) {
        resultado.errores.forEach((err) => {
          if (err.linea > 0 && err.linea <= lineas.length) {
            lineas[err.linea - 1]._invalida = true;
            lineas[err.linea - 1]._error = err.motivo;
          }
        });
        renderTablaLineas();
      }
    }
  } catch (err) {
    console.error("Error procesando lote:", err);
    showToast("Error inesperado al procesar el lote", "error");
  } finally {
    procesando = false;
    actualizarEstadoBotonConfirmar();
    mostrarEstadoProcesando(false);
  }
}

// ─── Limpiar lote ──────────────────────────────────────────────────────────────

/**
 * Limpia todas las líneas del lote.
 */
function limpiarLote() {
  if (lineas.length === 0) return;

  if (lineas.length > 0 && !confirm("¿Está seguro de limpiar todas las líneas del lote?")) {
    return;
  }

  lineas = [];
  renderTablaLineas();
  actualizarEstadoBotonConfirmar();

  // Ocultar errores CSV si están visibles
  const contenedorErrores = document.getElementById("erroresCSV");
  if (contenedorErrores) {
    contenedorErrores.classList.add("hidden");
    contenedorErrores.innerHTML = "";
  }

  showToast("Lote limpiado", "info");
}

// ─── Renderizado de UI ─────────────────────────────────────────────────────────

/**
 * Renderiza la tabla de líneas del lote.
 * Muestra indicadores visuales para líneas inválidas (Req 6.3).
 */
function renderTablaLineas() {
  const tbody = document.getElementById("loteBody");
  const emptyState = document.getElementById("loteEmpty");
  const summary = document.getElementById("loteSummary");
  const footer = document.getElementById("loteFooter");

  if (!tbody) return;

  if (lineas.length === 0) {
    tbody.innerHTML = "";
    if (emptyState) emptyState.style.display = "";
    if (summary) summary.style.display = "none";
    if (footer) footer.style.display = "none";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (summary) summary.style.display = "";
  if (footer) footer.style.display = "";

  // Update summary counts
  const totalCount = lineas.length;
  const invalidCount = lineas.filter(l => l._invalida).length;
  const validCount = totalCount - invalidCount;

  const elTotal = document.getElementById("summaryTotal");
  const elValid = document.getElementById("summaryValid");
  const elInvalid = document.getElementById("summaryInvalid");
  if (elTotal) elTotal.textContent = totalCount;
  if (elValid) elValid.textContent = validCount;
  if (elInvalid) elInvalid.textContent = invalidCount;

  tbody.innerHTML = lineas
    .map((linea, idx) => {
      const rowClass = linea._invalida ? "row-invalid" : (linea.codigo_producto && linea.cantidad ? "row-valid" : "row-pending");
      const statusIcon = linea._invalida
        ? '<i class="fa fa-exclamation-circle"></i>'
        : (linea.codigo_producto && linea.cantidad ? '<i class="fa fa-check-circle"></i>' : '<i class="fa fa-minus-circle"></i>');

      return `
        <tr class="${rowClass}">
          <td class="row-num">${idx + 1}</td>
          <td class="row-status">${statusIcon}</td>
          <td>
            <input type="text" value="${escapeHtml(linea.codigo_producto || "")}"
              placeholder="Ej: 26.8.0"
              onchange="window.LoteController.actualizarCampo(${idx}, 'codigo_producto', this.value)"
              ${linea._invalida ? 'class="input-error"' : ""} />
          </td>
          <td>
            <input type="number" value="${linea.cantidad || ""}"
              placeholder="Cant." min="1" max="999999"
              onchange="window.LoteController.actualizarCampo(${idx}, 'cantidad', this.value)"
              ${linea._invalida ? 'class="input-error"' : ""} />
          </td>
          <td>
            <select onchange="window.LoteController.actualizarCampo(${idx}, 'tipo', this.value)">
              <option value="entrada" ${linea.tipo === "entrada" ? "selected" : ""}>Entrada</option>
              <option value="salida" ${linea.tipo === "salida" ? "selected" : ""}>Salida</option>
              <option value="ajuste" ${linea.tipo === "ajuste" ? "selected" : ""}>Ajuste</option>
              <option value="transferencia_salida" ${linea.tipo === "transferencia_salida" ? "selected" : ""}>Transferencia</option>
            </select>
          </td>
          <td>
            <input type="text" value="${escapeHtml(linea.obra || "")}"
              placeholder="Obra"
              onchange="window.LoteController.actualizarCampo(${idx}, 'obra', this.value)" />
          </td>
          <td>
            <button type="button" class="btn-delete-row" onclick="window.LoteController.eliminarLinea(${idx})" title="Eliminar">
              <i class="fa fa-times"></i>
            </button>
          </td>
        </tr>
        ${linea._invalida && linea._error ? `
        <tr class="row-invalid" style="border-left:none;">
          <td></td>
          <td></td>
          <td colspan="5">
            <div class="error-tooltip"><i class="fa fa-exclamation-triangle"></i> ${escapeHtml(linea._error)}</div>
          </td>
        </tr>` : ""}
      `;
    })
    .join("");
}

/**
 * Actualiza el estado del botón de confirmar lote.
 * Se deshabilita si no hay líneas o si se está procesando.
 */
function actualizarEstadoBotonConfirmar() {
  const btn = document.getElementById("btnConfirmarLote");
  if (!btn) return;

  const deshabilitado = lineas.length === 0 || procesando;
  btn.disabled = deshabilitado;

  if (procesando) {
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Procesando...';
  } else {
    btn.innerHTML = '<i class="fa fa-check"></i> Confirmar Lote';
  }
}

/**
 * Muestra/oculta el indicador de procesamiento.
 * @param {boolean} mostrar
 */
function mostrarEstadoProcesando(mostrar) {
  const overlay = document.getElementById("loteProcessing");
  if (overlay) {
    overlay.classList.toggle("show", mostrar);
  }
}

/**
 * Muestra el resultado exitoso del procesamiento del lote.
 * @param {{movimientos_creados: number, lote_id?: string}} resultado
 */
function mostrarResultadoExito(resultado) {
  const contenedor = document.getElementById("resultadoLote");
  if (!contenedor) return;

  contenedor.classList.remove("hidden");
  contenedor.innerHTML = `
    <div class="resultado-exito">
      <i class="fa fa-check-circle"></i>
      <p><strong>Lote procesado exitosamente</strong></p>
      <p>${resultado.movimientos_creados} movimientos creados</p>
      ${resultado.lote_id ? `<p class="lote-id">ID del lote: ${escapeHtml(resultado.lote_id)}</p>` : ""}
    </div>
  `;

  // Ocultar después de 10 segundos
  setTimeout(() => {
    contenedor.classList.add("hidden");
    contenedor.innerHTML = "";
  }, 10000);
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

// ─── API pública (expuesta en window para eventos inline) ──────────────────────

/**
 * Expone métodos del controller en window para uso desde eventos inline del HTML.
 */
window.LoteController = {
  actualizarCampo: actualizarCampoLinea,
  eliminarLinea,
};

// ─── Exports para testing y uso externo ────────────────────────────────────────

export {
  lineas as _lineas,
  agregarLineaManual as agregarLinea,
  confirmarLote,
  limpiarLote,
  validarLoteCompleto as validar,
};

// ─── Auto-inicialización ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", initLoteController);
