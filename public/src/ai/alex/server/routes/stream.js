// Alex de ADDBOX — Ruta de streaming (SSE real)
import { runStream } from "../engine.js";
import { sanitize } from "../utils.js";

export async function streamHandler(req, res) {
  try {
    const { message, user } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Falta el mensaje." });
    }
    if (message.length > 500) {
      return res.status(400).json({ error: "Mensaje demasiado largo." });
    }

    // Configurar SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    await runStream(
      user?.id || "anon",
      sanitize(message),
      user?.role || "default",
      (chunk) => {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
    );

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("❌ Error en /api/stream:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Error interno." });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Error durante la respuesta." })}\n\n`);
      res.end();
    }
  }
}
