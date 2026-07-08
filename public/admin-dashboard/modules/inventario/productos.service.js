import { supabase } from "../../services/supabase-client.js";

export async function obtenerProductos() {
  const { data, error } = await supabase.from("productos").select("*");
  if (error) throw error;
  return data;
}

export async function crearProducto(payload) {
  const { data, error } = await supabase.from("productos").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function actualizarProducto(id, payload) {
  const { data, error } = await supabase.from("productos").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function eliminarProducto(id) {
  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) throw error;
  return true;
}
