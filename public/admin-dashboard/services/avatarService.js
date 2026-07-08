import { supabase } from "./supabase-client.js";

const BUCKET = "AVATAR";

/**
 * Sube una foto de avatar a Supabase Storage
 * @param {File} file - Archivo de imagen
 * @param {string} userId - ID del usuario
 * @returns {string} URL pública del avatar
 */
export async function uploadAvatar(file, userId) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}.${fileExt}`;
  const filePath = `${fileName}`;

  // Subir archivo (sobreescribe si ya existe)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  // Obtener URL pública
  const { publicURL } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  // Guardar URL en tabla usuarios
  await supabase
    .from("usuarios")
    .update({ avatar_url: publicURL })
    .eq("id", userId);

  // Guardar en sessionStorage para uso inmediato
  sessionStorage.setItem("foto", publicURL);

  return publicURL;
}

/**
 * Obtiene la URL del avatar del usuario
 * @param {string} userId - ID del usuario
 * @returns {string|null} URL del avatar
 */
export async function getAvatarUrl(userId) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("avatar_url")
    .eq("id", userId)
    .single();

  if (error || !data?.avatar_url) return null;
  return data.avatar_url;
}
