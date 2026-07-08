import { supabase } from "../../services/supabase-client.js";
import { logAudit } from "../../services/auditService.js";
import { requireRole } from "../../services/role-guard.js";
import { showToast } from "../../services/toastService.js";

// Verificar rol antes de cargar el módulo
await requireRole(["jefe", "admin"]);

import { obtenerPresupuestos } from "./presupuesto.service.js";
import { renderTabla, mostrarError, mostrarLoading } from "./presupuesto.ui.js";

let todosLosPresupuestos = [];

export async function cargarPresupuestos() {
  mostrarLoading();
  try {
    todosLosPresupuestos = await obtenerPresupuestos();
    renderTabla(todosLosPresupuestos);
    await logAudit({ usuario_id: null, accion: "Consultar presupuestos", modulo: "Presupuestos", descripcion: `${todosLosPresupuestos.length} presupuestos cargados` });
  } catch (error) {
    showToast("Error: " + error.message, "error");
    mostrarError(error.message);
  }
}

export function logout() {
  window.location.href = "../../inicio-de-sesion.html";
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(cargarPresupuestos, 50);
  document.querySelector('button[onclick="logout()"]')?.addEventListener("click", logout);
});
