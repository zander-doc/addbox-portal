// Alex de ADDBOX — Ruta de feedback
import { supabase } from "../db.js";

export async function feedbackHandler(req, res) {
  try {
    const { userId, messageId, rating, comment } = req.body;

    if (!rating || !["positive", "negative"].includes(rating)) {
      return res.status(400).json({ error: "Rating debe ser 'positive' o 'negative'." });
    }

    await supabase.from("alex_feedback").insert({
      user_id: userId || "anon",
      message_id: messageId || null,
      value: rating === "positive" ? 1 : -1,
      comment: comment || null,
      created_at: new Date().toISOString()
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error en /api/feedback:", err.message);
    res.status(500).json({ error: "Error guardando feedback." });
  }
}
