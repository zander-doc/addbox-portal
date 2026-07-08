// Alex de ADDBOX — Contexto conversacional (RAM + Supabase)
import { supabase } from "./db.js";

const memoryCache = new Map();
const MAX_MESSAGES = 20;

/** Guardar mensaje en contexto */
export async function saveContext(userId, role, content) {
  // Cache local
  if (!memoryCache.has(userId)) memoryCache.set(userId, []);
  const history = memoryCache.get(userId);
  history.push({ role, content });
  if (history.length > MAX_MESSAGES) history.shift();

  // Persistir en Supabase (fire and forget)
  supabase.from("alex_context").insert({
    user_id: userId,
    role,
    message: content,
    created_at: new Date().toISOString()
  }).then(() => {}).catch(() => {});
}

/** Cargar historial del usuario */
export async function loadContext(userId) {
  // Si hay cache, usar eso
  if (memoryCache.has(userId) && memoryCache.get(userId).length > 0) {
    return memoryCache.get(userId);
  }

  // Si no, cargar de Supabase
  const { data } = await supabase
    .from("alex_context")
    .select("role, message")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(MAX_MESSAGES);

  if (data && data.length > 0) {
    const formatted = data.map(m => ({ role: m.role, content: m.message }));
    memoryCache.set(userId, formatted);
    return formatted;
  }

  return [];
}

/** Limpiar contexto */
export async function clearContext(userId) {
  memoryCache.delete(userId);
  await supabase.from("alex_context").delete().eq("user_id", userId);
}

export default { saveContext, loadContext, clearContext };
