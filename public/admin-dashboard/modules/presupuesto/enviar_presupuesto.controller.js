import { supabase } from "../../services/supabase-client.js";
import { logAudit } from "../../services/auditService.js";
import { requireRole } from "../../services/role-guard.js";
import { showToast } from "../../services/toastService.js";

// Verificar rol antes de cargar el módulo
await requireRole(["jefe", "admin"]);

import { enviarPresupuesto } from "./enviar_presupuesto.service.js";
import { mostrarError, mostrarLoading } from "./enviar_presupuesto.ui.js";
import { handleError } from "../../services/error-handler.js";

export async function handleEnviarPresupuesto() {
  mostrarLoading();
  try {
    const resultado = await enviarPresupuesto();
    // 🔄 Reemplazado por error-handler.js
    handleError("enviar_presupuesto", new Error("Presupuesto enviado exitosamente"));
    showToast("Presupuesto enviado", "info");
    await logAudit({ usuario_id: null, accion: "Enviar presupuesto", modulo: "Presupuestos", descripcion: "Presupuesto enviado exitosamente" });
  } catch (error) {
    showToast("Error: " + error.message, "error");
    handleError(error, "Error al enviar presupuesto");
  }
}

export function logout() {
  window.location.href = "../../inicio-de-sesion.html";
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector('button[onclick="handleEnviarPresupuesto()"]')?.addEventListener("click", handleEnviarPresupuesto);
  document.querySelector('button[onclick="logout()"]')?.addEventListener("click", logout);
});
