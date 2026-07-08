import { supabase } from "../../services/supabase-client.js";
import { logAudit } from "../../services/auditService.js";
import { requireRole } from "../../services/role-guard.js";

// Verificar rol antes de cargar el módulo
await requireRole(["jefe", "admin"]);

import { obtenerPartidas } from "./partidas.service.js";
import { renderTabla, mostrarError, mostrarLoading } from "./partidas.ui.js";

let todasLasPartidas = [];

export async function cargarPartidas() {
  mostrarLoading();
  try {
    todasLasPartidas = await obtenerPartidas();
    renderTabla(todasLasPartidas);
  } catch (error) {
    mostrarError(error.message);
  }
}

export function logout() {
  window.location.href = "../../inicio-de-sesion.html";
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(cargarPartidas, 50);
  document.querySelector('button[onclick="logout()"]')?.addEventListener("click", logout);
});
