// src/ai/alex/engine.js
import OpenAI from "openai";
import { alexConfig } from "./config.js";
import { alexRoles } from "./roles.js";
import { getContextHistory } from "./context.js";
import { ragSearch } from "./rag.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// -----------------------------
// 1. Llamada al modelo
// -----------------------------
async function _callModel(prompt) {
  const response = await client.chat.completions.create({
    model: alexConfig.model,
    temperature: alexConfig.temperature,
    messages: [
      { role: "system", content: alexConfig.systemPrompt },
      { role: "user", content: prompt }
    ]
  });
  return response.choices[0].message.content;
}

// -----------------------------
// 2. Motor principal de Alex
// -----------------------------
export async function chat(userMessage, userRole = "default", userId = null) {
  // Rol dinámico
  const rolePrompt = alexRoles[userRole] || "";

  // Contexto conversacional
  const history = userId ? await getContextHistory(userId) : "";

  // RAG (si encuentra algo, lo añade al prompt)
  const ragContext = await ragSearch(userMessage);

  // Construcción del prompt final
  const finalPrompt = `${alexConfig.systemPrompt}

Rol del usuario:
${rolePrompt}

Contexto reciente:
${history}

Información relevante encontrada:
${ragContext}

Instrucción del usuario:
${userMessage}`;

  // Llamar al modelo
  const reply = await _callModel(finalPrompt);
  return reply;
}

export default { chat };
