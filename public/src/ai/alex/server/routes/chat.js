// Alex de ADDBOX — Ruta de chat (respuesta completa)
import { runChat } from "../engine.js";
import { sanitize } from "../utils.js";

export async function chatHandler(req, res) {
  try {
    const { message, user } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Falta el mensaje." });
    }
    if (message.length > 500) {
      return res.status(400).json({ error: "Mensaje demasiado largo (máx 500 caracteres)." });
    }

    const reply = await runChat(
      user?.id || "anon",
      sanitize(message),
      user?.role || "default"
    );

    res.json({ reply, timestamp: Date.now() });
  } catch (err) {
    console.error("❌ Error en /api/chat:", err.message);
    if (err.status === 429) {
      return res.status(429).json({ error: "Límite de API alcanzado. Intenta en un momento." });
    }
    res.status(500).json({ error: "Error interno en Alex." });
  }
}
