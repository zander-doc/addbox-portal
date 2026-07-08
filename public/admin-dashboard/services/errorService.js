import { audit } from "./auditService.js";
import { showToast } from "./toastService.js";

export async function handleError(error, modulo = "sistema", accion = "error") {
  console.error(`[${modulo}] Error en ${accion}:`, error);
  const mensaje = error?.message ?? "Error inesperado";
  showToast(mensaje, "error");
  await audit(modulo, accion, mensaje);
}

export function wrapAsync(fn, modulo, accion) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleError(error, modulo, accion);
      throw error;
    }
  };
}
