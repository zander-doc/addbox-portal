// src/ai/alex/context.js
// Memoria temporal en RAM (puede migrarse a DB luego)

const memory = new Map();

export function addToContext(userId, message) {
  if (!memory.has(userId)) memory.set(userId, []);
  const history = memory.get(userId);
  history.push(message);
  // Mantener solo las últimas 10 interacciones
  if (history.length > 10) history.shift();
  memory.set(userId, history);
}

export function getContextHistory(userId) {
  const history = memory.get(userId) || [];
  return history.join("\n");
}
