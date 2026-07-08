// Alex de ADDBOX — Ruta de documentos RAG dinámico
import OpenAI from "openai";
import { supabase } from "../db.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Subir documento al RAG */
export async function uploadDocHandler(req, res) {
  try {
    const { content, metadata } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Falta el contenido del documento." });
    }
    if (content.length > 10000) {
      return res.status(400).json({ error: "Documento demasiado largo (máx 10,000 caracteres)." });
    }

    // Generar embedding
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: content
    });
    const embedding = embeddingRes.data[0].embedding;

    // Guardar en Supabase
    const { data, error } = await supabase.from("alex_docs").insert({
      content,
      metadata: metadata || {},
      embedding,
      created_at: new Date().toISOString()
    }).select("id");

    if (error) throw error;

    res.json({ ok: true, id: data[0].id, message: "Documento agregado al RAG." });
  } catch (err) {
    console.error("❌ Error subiendo doc:", err.message);
    res.status(500).json({ error: "Error al procesar documento." });
  }
}

/** Listar documentos del RAG */
export async function listDocsHandler(req, res) {
  try {
    const { data, error } = await supabase
      .from("alex_docs")
      .select("id, content, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ docs: data || [] });
  } catch (err) {
    res.status(500).json({ error: "Error listando documentos." });
  }
}

/** Eliminar documento del RAG */
export async function deleteDocHandler(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("alex_docs").delete().eq("id", id);
    if (error) throw error;
    res.json({ ok: true, message: "Documento eliminado." });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando documento." });
  }
}
