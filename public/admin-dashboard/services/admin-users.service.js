import { supabase } from "./supabase-client.js";

/**
 * Lista todos los usuarios de la tabla usuarios
 */
export async function listUsers() {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Crea un registro de usuario en la tabla (NO crea cuenta en Auth)
 */
export async function createUserRecord(nombre, email, rol = "usuario") {
  const { data, error } = await supabase
    .from("usuarios")
    .insert({
      nombre,
      email,
      rol,
      estado: "activo",
      creado_en: new Date().toISOString()
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Actualiza campos de un usuario existente
 */
export async function updateUserRecord(id, campos) {
  const { data, error } = await supabase
    .from("usuarios")
    .update(campos)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Desactiva un usuario (cambia estado a 'inactivo')
 */
export async function deactivateUser(id) {
  return await updateUserRecord(id, { estado: "inactivo" });
}

/**
 * Reactiva un usuario (cambia estado a 'activo')
 */
export async function activateUser(id) {
  return await updateUserRecord(id, { estado: "activo" });
}
