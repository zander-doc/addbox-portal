/**
 * movimientos-form.controller.js
 * Controller para el formulario de registro de movimientos de inventario.
 * Valida inputs en frontend, llama al service correspondiente según tipo,
 * maneja errores con toast y preserva formulario, y muestra stock disponible.
 *
 * Requirements: 1.6, 1.7, 2.1, 2.2, 2.3, 2.4
 */

import {
  registrarEntrada,
  registrarSalida,
  registrarTransferencia,
  registrarAjuste,
  obtenerStockProductoObra,
} from "./inventario.service.js";

import { showToast } from "../../services/toastService.js";

// ─── Estado interno ────────────────────────────────────────────────────────────

let stockDisponibleActual = null;
let submitting = false;

// ─── Inicialización ────────────────────────────────────────────────────────────

/**
 * Inicializa el controller del formulario de movimientos.
 * Debe llamarse después de que el DOM del formulario esté disponible.
 */
export function initMovimientosFormController() {
  const form = document.getElementById("formMovimiento");
  if (!form) return;

  // Escuchar el custom event emitido por el componente HTML al pasar validación visual
  form.addEventListener("movimiento:submit", handleMovimientoSubmit);

  // Escuchar cambios de producto/obra para mostrar stock disponible
  const productoSelect = document.getElementById("mov-producto");
  const obraSelect = document.getElementById("mov-obra");

  if (productoSelect) {
    productoSelect.addEventListener("change", actualizarStockDisponible);
  }
  if (obraSelect) {
    obraSelect.addEventListener("change", actualizarStockDisponible);
  }
}

// ─── Validación de negocio (frontend) ──────────────────────────────────────────

/**
 * Valida los datos del movimiento antes de enviar al backend.
 * Complementa la validación visual del componente HTML con reglas de negocio.
 *
 * Req 1.6: Rechazar cantidad fuera de rango o cero para entradas/salidas.
 * Req 1.7, 2.1, 2.3: Verificar stock suficiente para salidas/transferencias.
 * Req 2.2, 2.4: Preservar datos y mostrar error si stock insuficiente.
 *
 * @param {object} datos - Datos del formulario
 * @returns {{valido: boolean, errores: string[]}}
 */
export function validarMovimiento(datos) {
  const errores = [];
  const { tipo, productoId, obraId, obraDestinoId, cantidad, motivo } = datos;

  // Validar selecciones obligatorias
  if (!tipo) {
    errores.push("Seleccione un tipo de movimiento");
  }
  if (!productoId) {
    errores.push("Seleccione un producto");
  }
  if (!obraId) {
    errores.push("Seleccione una obra");
  }

  // Validar cantidad según tipo (Req 1.6)
  if (tipo === "ajuste") {
    if (cantidad === 0) {
      errores.push("La cantidad no puede ser cero para ajustes");
    } else if (cantidad < -999999 || cantidad > 999999) {
      errores.push("Cantidad fuera de rango permitido (-999,999 a 999,999)");
    }
  } else {
    // Entradas, salidas, transferencias: 1 a 999,999
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 999999) {
      errores.push("Cantidad fuera de rango permitido (1 a 999,999)");
    }
  }

  // Validar motivo para ajustes (mínimo 10 caracteres)
  if (tipo === "ajuste") {
    if (!motivo || motivo.trim().length < 10) {
      errores.push("El motivo del ajuste debe tener al menos 10 caracteres");
    }
  }

  // Validar obra destino para transferencias
  if (tipo === "transferencia") {
    if (!obraDestinoId) {
      errores.push("Seleccione una obra destino para la transferencia");
    } else if (obraDestinoId === obraId) {
      errores.push("La obra destino debe ser diferente a la obra origen");
    }
  }

  // Validar stock suficiente para salidas y transferencias (Req 1.7, 2.1, 2.3)
  if ((tipo === "salida" || tipo === "transferencia") && stockDisponibleActual !== null) {
    if (cantidad > stockDisponibleActual) {
      errores.push(
        `Stock insuficiente. Disponible: ${stockDisponibleActual} unidades`
      );
    }
  }

  return { valido: errores.length === 0, errores };
}

// ─── Manejo del submit ─────────────────────────────────────────────────────────

/**
 * Maneja el evento de submit del formulario de movimientos.
 * Valida, llama al service correspondiente y gestiona la respuesta.
 *
 * @param {CustomEvent} event - Evento con detail conteniendo los datos del formulario
 */
async function handleMovimientoSubmit(event) {
  if (submitting) return;

  const datos = event.detail;
  if (!datos) return;

  // Validación de negocio en frontend
  const { valido, errores } = validarMovimiento(datos);

  if (!valido) {
    // Mostrar primer error como toast y resaltar campos inválidos (Req 1.6)
    showToast(errores[0], "warning");
    resaltarCamposInvalidos(datos, errores);
    return;
  }

  submitting = true;
  deshabilitarBotonSubmit(true);

  try {
    const resultado = await ejecutarMovimiento(datos);

    if (resultado.success) {
      showToast("Movimiento registrado correctamente", "success");
      // Cerrar modal y limpiar formulario
      if (window.MovimientosForm) {
        window.MovimientosForm.limpiar();
        window.MovimientosForm.cerrar();
      }
      stockDisponibleActual = null;
    } else {
      // Error de negocio del backend (Req 2.2, 2.4: preservar formulario)
      showToast(resultado.error || "Error al registrar movimiento", "error");
      // Preservar datos del formulario — no limpiar
      if (window.MovimientosForm) {
        window.MovimientosForm.preservarDatos();
      }
      // Resaltar campo de cantidad si es error de stock
      if (resultado.error && resultado.error.toLowerCase().includes("stock")) {
        resaltarCampoError("mov-cantidad", resultado.error);
      }
    }
  } catch (err) {
    console.error("Error inesperado registrando movimiento:", err);
    showToast("Error inesperado. Intente nuevamente.", "error");
    // Preservar formulario en caso de error de red
    if (window.MovimientosForm) {
      window.MovimientosForm.preservarDatos();
    }
  } finally {
    submitting = false;
    deshabilitarBotonSubmit(false);
  }
}

/**
 * Ejecuta el movimiento llamando al service correspondiente según el tipo.
 *
 * @param {object} datos - Datos validados del formulario
 * @returns {Promise<{success: boolean, movimiento?: object, error?: string}>}
 */
async function ejecutarMovimiento(datos) {
  const { tipo, productoId, obraId, obraDestinoId, cantidad, motivo, observacion } = datos;

  switch (tipo) {
    case "entrada":
      return registrarEntrada({ productoId, obraId, cantidad, observacion });

    case "salida":
      return registrarSalida({ productoId, obraId, cantidad, observacion });

    case "transferencia":
      return registrarTransferencia({
        productoId,
        obraOrigenId: obraId,
        obraDestinoId,
        cantidad,
        observacion,
      });

    case "ajuste":
      return registrarAjuste({ productoId, obraId, cantidad, motivo });

    default:
      return { success: false, error: "Tipo de movimiento no válido" };
  }
}

// ─── Stock disponible ──────────────────────────────────────────────────────────

/**
 * Consulta y muestra el stock disponible al seleccionar producto y obra.
 * Solo se muestra para salidas y transferencias (Req 2.1, 2.3).
 */
async function actualizarStockDisponible() {
  const tipoSelect = document.getElementById("mov-tipo");
  const productoSelect = document.getElementById("mov-producto");
  const obraSelect = document.getElementById("mov-obra");

  const tipo = tipoSelect?.value;
  const productoId = productoSelect?.value;
  const obraId = obraSelect?.value;

  // Solo mostrar stock para salidas y transferencias
  if (!tipo || !["salida", "transferencia"].includes(tipo)) {
    stockDisponibleActual = null;
    if (window.MovimientosForm) {
      window.MovimientosForm.actualizarStock(null);
    }
    return;
  }

  if (!productoId || !obraId) {
    stockDisponibleActual = null;
    if (window.MovimientosForm) {
      window.MovimientosForm.actualizarStock(null);
    }
    return;
  }

  try {
    const { cantidad } = await obtenerStockProductoObra(productoId, obraId);
    stockDisponibleActual = cantidad;
    if (window.MovimientosForm) {
      window.MovimientosForm.actualizarStock(cantidad);
    }
  } catch (err) {
    console.error("Error consultando stock disponible:", err);
    stockDisponibleActual = null;
    if (window.MovimientosForm) {
      window.MovimientosForm.actualizarStock(null);
    }
  }
}

// ─── Helpers de UI ─────────────────────────────────────────────────────────────

/**
 * Resalta campos inválidos basándose en los errores de validación.
 * @param {object} datos - Datos del formulario
 * @param {string[]} errores - Lista de mensajes de error
 */
function resaltarCamposInvalidos(datos, errores) {
  const errorText = errores.join(" ").toLowerCase();

  if (errorText.includes("tipo") && window.MovimientosForm) {
    window.MovimientosForm.mostrarError("mov-tipo", "Seleccione un tipo de movimiento");
  }
  if (errorText.includes("producto") && window.MovimientosForm) {
    window.MovimientosForm.mostrarError("mov-producto", "Seleccione un producto");
  }
  if (errorText.includes("obra origen") || (errorText.includes("obra") && !errorText.includes("destino"))) {
    if (window.MovimientosForm) {
      window.MovimientosForm.mostrarError("mov-obra", "Seleccione una obra");
    }
  }
  if (errorText.includes("destino") && window.MovimientosForm) {
    window.MovimientosForm.mostrarError("mov-obra-destino", "Seleccione una obra destino válida");
  }
  if ((errorText.includes("cantidad") || errorText.includes("rango") || errorText.includes("stock")) && window.MovimientosForm) {
    window.MovimientosForm.mostrarError("mov-cantidad", errores.find(e => e.toLowerCase().includes("cantidad") || e.toLowerCase().includes("stock")) || "");
  }
  if (errorText.includes("motivo") && window.MovimientosForm) {
    window.MovimientosForm.mostrarError("mov-motivo", "El motivo debe tener al menos 10 caracteres");
  }
}

/**
 * Resalta un campo específico con un mensaje de error.
 * @param {string} campoId - ID del campo
 * @param {string} mensaje - Mensaje de error
 */
function resaltarCampoError(campoId, mensaje) {
  if (window.MovimientosForm) {
    window.MovimientosForm.mostrarError(campoId, mensaje);
  }
}

/**
 * Habilita o deshabilita el botón de submit para evitar doble envío.
 * @param {boolean} deshabilitar
 */
function deshabilitarBotonSubmit(deshabilitar) {
  const btn = document.getElementById("btnRegistrarMovimiento");
  if (btn) {
    btn.disabled = deshabilitar;
    if (deshabilitar) {
      btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Registrando...';
    } else {
      btn.innerHTML = '<i class="fa fa-check"></i> Registrar';
    }
  }
}

// ─── API pública ───────────────────────────────────────────────────────────────

/**
 * Permite al controller principal (inventario.controller.js) obtener
 * el stock disponible actual cacheado.
 * @returns {number|null}
 */
export function getStockDisponible() {
  return stockDisponibleActual;
}

/**
 * Resetea el estado interno del controller.
 * Útil al cerrar el modal o cambiar de obra.
 */
export function resetState() {
  stockDisponibleActual = null;
  submitting = false;
}
