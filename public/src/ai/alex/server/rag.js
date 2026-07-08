// Alex de ADDBOX — RAG con búsqueda vectorial + fallback local
import OpenAI from "openai";
import { supabase } from "./db.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Cargar knowledge.md dinámicamente ─────────────────────────────────────────
let knowledgeDoc = "";
function loadKnowledge() {
  try {
    knowledgeDoc = readFileSync(join(__dirname, "knowledge.md"), "utf-8");
  } catch (e) {
    console.warn("⚠️ knowledge.md no encontrado, usando solo fallback local");
  }
}
loadKnowledge();

// Knowledge base local (fallback)
const knowledgeBase = [
  // ─── Inventario General ───
  { keywords: ["inventario", "stock", "materiales", "producto"], content: "El inventario se gestiona por obra. Cada producto tiene: código, descripción, unidad, categoría, stock por obra. La tabla stock_obra almacena la cantidad actual de cada producto en cada obra." },
  
  // ─── Movimientos ───
  { keywords: ["movimiento", "tipo", "tipos"], content: "Los tipos de movimiento son: entrada (suma stock), salida (resta stock), ajuste (reconciliación), transferencia_salida (resta en origen), transferencia_entrada (suma en destino), devolucion (suma stock). Cada movimiento registra: producto_id, cantidad, tipo, obra_id, sitio, motivo, fecha." },
  
  // ─── Transferencias ───
  { keywords: ["transferencia", "mover", "trasladar"], content: "Las transferencias mueven material entre obras. Generan 2 movimientos: transferencia_salida en origen y transferencia_entrada en destino. Se valida que haya stock suficiente en origen antes de ejecutar." },
  
  // ─── Entradas ───
  { keywords: ["entrada", "recepción", "proveedor", "compra"], content: "Las entradas registran material que llega a una obra. Datos: producto, cantidad, proveedor (opcional), factura/guía (referencia_factura), obra destino. Se suma al stock_obra del producto en esa obra." },
  
  // ─── Salidas ───
  { keywords: ["salida", "despacho", "consumo"], content: "Las salidas registran material consumido o despachado. Datos: producto, cantidad, motivo, obra. Se resta del stock_obra. No se permite si el stock resultante sería negativo." },
  
  // ─── Devoluciones ───
  { keywords: ["devolución", "devolver", "retorno"], content: "Las devoluciones registran material que regresa. Estados: pendiente, devuelto (suma stock), en reparación (no suma hasta repararse). Se registra el estado del material (bueno/dañado)." },
  
  // ─── Reconciliación ───
  { keywords: ["ajuste", "conteo", "reconciliación", "conteo físico", "inventario físico"], content: "La reconciliación compara el stock del sistema con un conteo físico real. Flujo: 1) Seleccionar obra, 2) Iniciar conteo, 3) Ingresar cantidades reales, 4) Finalizar conteo (muestra diferencias), 5) Aprobar (ajusta stock y registra movimientos tipo 'ajuste') o Rechazar (descarta). Los ajustes quedan registrados con motivo detallado para auditoría." },
  
  // ─── Stock Mínimo y Alertas ───
  { keywords: ["stock mínimo", "alerta", "crítico", "umbral"], content: "Cada producto puede tener un stock_minimo configurado. Cuando el stock actual baja de ese umbral, se genera una alerta. Los productos críticos aparecen en el dashboard y en reportes. El supervisor debe aprobar la reposición." },
  
  // ─── Roles y Permisos ───
  { keywords: ["rol", "permiso", "almacenista", "supervisor", "admin", "jefe"], content: "Roles del sistema: almacenista (entradas, salidas, consultar stock de obras asignadas), supervisor (reconciliación, aprobar ajustes, KPIs, conteos físicos), admin (todo + costos, auditoría, configuración de umbrales, exportar reportes), jefe (todos los permisos del admin). Cada rol tiene permisos específicos controlados por role-guard." },
  
  // ─── Obras ───
  { keywords: ["obra", "proyecto", "sitio", "ubicación"], content: "El inventario se distribuye por obras (proyectos/sitios de construcción). Cada obra tiene: nombre, estado (activa/inactiva). El stock se gestiona independientemente por obra. Las transferencias mueven material entre obras." },
  
  // ─── Reportes ───
  { keywords: ["reporte", "kpi", "estadística", "informe"], content: "Reportes disponibles: movimientos por periodo (filtrar por tipo, obra, fechas), stock por obra, productos críticos (bajo stock mínimo), valor del inventario. Los movimientos de ajuste aparecen en reportes filtrando por tipo 'Ajustes'." },
  
  // ─── Operaciones por Lote ───
  { keywords: ["lote", "masivo", "bulk", "csv", "importar"], content: "Las operaciones por lote permiten registrar múltiples movimientos a la vez. Se puede importar desde CSV. Cada línea del lote se valida individualmente (producto, cantidad, tipo, obra). Si una línea falla, las demás se procesan igual." },
  
  // ─── Auditoría ───
  { keywords: ["auditoría", "historial", "trazabilidad", "log"], content: "Cada operación importante genera un registro de auditoría: usuario, acción, módulo, descripción, timestamp, IP. Las reconciliaciones registran diferencias encontradas y ajustes generados. Los movimientos tienen referencia_cruzada para vincular operaciones relacionadas." },
  
  // ─── Invitaciones ───
  { keywords: ["invitación", "invitar", "usuario nuevo", "registro"], content: "Los administradores pueden invitar usuarios al sistema. Se envía un enlace de invitación por email. El invitado se registra con el rol asignado. Las invitaciones tienen estado: pendiente, aceptada, expirada." },
  
  // ─── Dashboard ───
  { keywords: ["dashboard", "panel", "resumen", "inicio"], content: "El dashboard muestra un resumen general: total de productos, movimientos recientes, productos críticos, valor del inventario, alertas activas. Cada rol ve información relevante a sus permisos." }
];

/**
 * Búsqueda RAG — intenta vectorial, fallback a keywords + knowledge.md
 */
export async function ragSearch(query) {
  // 1. Intentar búsqueda vectorial
  try {
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });
    const queryEmbedding = embeddingRes.data[0].embedding;

    const { data, error } = await supabase.rpc("match_docs_vector", {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: 3
    });

    if (!error && data && data.length > 0) {
      return data.map(d => d.content).join("\n");
    }
  } catch (e) {
    // Fallback silencioso a búsqueda por texto
  }

  // 2. Intentar búsqueda por texto en DB
  try {
    const { data } = await supabase.rpc("match_docs", { query_text: query });
    if (data && data.length > 0) {
      return data.map(d => d.content).join("\n");
    }
  } catch (e) {}

  // 3. Buscar en knowledge.md (secciones relevantes)
  const knowledgeResult = searchKnowledge(query);
  if (knowledgeResult) {
    return knowledgeResult;
  }

  // 4. Fallback: keywords locales
  const q = query.toLowerCase();
  const matches = knowledgeBase
    .map(doc => ({ ...doc, score: doc.keywords.filter(k => q.includes(k)).length }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return matches.map(m => m.content).join("\n");
}

/**
 * Busca secciones relevantes en knowledge.md basado en la query
 */
function searchKnowledge(query) {
  if (!knowledgeDoc) return "";

  const q = query.toLowerCase();
  const sections = knowledgeDoc.split(/^## /m).filter(s => s.trim());

  // Buscar secciones que coincidan con palabras clave de la query
  const scored = sections.map(section => {
    const sectionLower = section.toLowerCase();
    const words = q.split(/\s+/).filter(w => w.length > 2);
    const score = words.filter(w => sectionLower.includes(w)).length;
    return { section: "## " + section, score };
  });

  const relevant = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  if (relevant.length === 0) return "";

  return relevant.map(r => r.section.trim()).join("\n\n---\n\n");
}

export default { ragSearch, reloadKnowledge: loadKnowledge };
