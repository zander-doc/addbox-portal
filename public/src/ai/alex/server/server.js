// Alex de ADDBOX — Server principal v2
import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { chatHandler } from "./routes/chat.js";
import { streamHandler } from "./routes/stream.js";
import { feedbackHandler } from "./routes/feedback.js";
import { uploadDocHandler, listDocsHandler, deleteDocHandler } from "./routes/docs.js";
import { reloadKnowledge } from "./rag.js";

const app = express();
const PORT = process.env.PORT || 3100;

// Middlewares
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:5500", "http://127.0.0.1:5500"];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, true); // En desarrollo permitir todo, en prod restringir
  },
  credentials: true
}));
app.use(express.json({ limit: "10kb" }));

// Rate limiting — 30 requests por minuto por IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Demasiadas solicitudes. Intenta en un momento." }
});
app.use("/api", limiter);

// Rutas
app.post("/api/chat", chatHandler);
app.post("/api/stream", streamHandler);
app.post("/api/feedback", feedbackHandler);

// RAG dinámico
app.post("/api/docs", uploadDocHandler);
app.get("/api/docs", listDocsHandler);
app.delete("/api/docs/:id", deleteDocHandler);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", agent: "Alex de ADDBOX", version: "2.0.0" });
});

// Recargar knowledge.md sin reiniciar servidor
app.post("/api/reload-knowledge", (req, res) => {
  reloadKnowledge();
  res.json({ success: true, message: "Knowledge base recargada" });
});

app.listen(PORT, () => {
  console.log(`🤖 Alex de ADDBOX escuchando en puerto ${PORT}`);
});
