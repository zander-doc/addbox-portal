// routes/api/alex.js
import alex from "../../src/ai/alex/index.js";

export default async function handler(req, res) {
  try {
    const { message, user } = JSON.parse(req.body);

    if (!message) {
      return res.status(400).json({ error: "Falta el mensaje." });
    }

    const reply = await alex.engine.chat(message, {
      id: user?.id || "anon",
      role: user?.role || "default"
    });

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Error en Alex API:", err);
    res.status(500).json({ error: "Error interno en Alex." });
  }
}
