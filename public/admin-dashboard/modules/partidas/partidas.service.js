// 🔄 Reemplazado por supabase-client.js
/*
const supabase = window.supabaseClient;
*/

import { supabase } from "../../services/supabase-client.js";

export async function obtenerPartidas() {
  const { data, error } = await supabase
    .from("partidas")
    .select("id, nombre, descripcion, monto, estado, creado_en")
    .order("creado_en", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }
  return data || [];
}

export async function filtrarPartidasPorEstado(estado) {
  const { data, error } = await supabase
    .from("partidas")
    .select("id, nombre, descripcion, monto, estado, creado_en")
    .eq("estado", estado)
    .order("creado_en", { ascending: false });

  if (error) {
    throw error;
  }
  return data || [];
}

export async function insertarPartida(datos) {
  const { data, error } = await supabase
    .from("partidas")
    .insert([datos])
    .select();

  if (error) {
    throw error;
  }
  return data;
}

export async function actualizarPartida(id, datos) {
  const { data, error } = await supabase
    .from("partidas")
    .update(datos)
    .eq("id", id)
    .select();

  if (error) {
    throw error;
  }
  return data;
}

export async function eliminarPartida(id) {
  const { error } = await supabase
    .from("partidas")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
  return true;
}
