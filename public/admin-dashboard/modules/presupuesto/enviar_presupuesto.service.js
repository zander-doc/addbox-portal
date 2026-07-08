// 🔄 Reemplazado por supabase-client.js
/*
const supabase = window.supabaseClient;
*/

import { supabase } from "../../services/supabase-client.js";

export async function enviarPresupuesto() {
  // Esta función se encargará de enviar el presupuesto al cliente
  // Implementación pendiente
  return { success: true };
}

export async function obtenerPresupuestosPendientes() {
  const { data, error } = await supabase
    .from("presupuestos")
    .select("id, nombre, cliente, monto, estado, creado_en")
    .eq("estado", "pendiente")
    .order("creado_en", { ascending: false });

  if (error) {
    throw error;
  }
  return data || [];
}

export async function actualizarEstadoPresupuesto(id, estado) {
  const { data, error } = await supabase
    .from("presupuestos")
    .update({ estado })
    .eq("id", id)
    .select();

  if (error) {
    throw error;
  }
  return data;
}
