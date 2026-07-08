// src/ai/alex/rag.js
// Documentos base (puedes reemplazar por DB o embeddings)

const documents = [
  {
    id: 1,
    keywords: ["inventario", "stock", "materiales"],
    content: "El inventario debe mantenerse actualizado con cada movimiento."
  },
  {
    id: 2,
    keywords: ["transferencia", "movimiento"],
    content: "Las transferencias requieren origen, destino y cantidad."
  }
];

export async function ragSearch(query) {
  const q = query.toLowerCase();
  const matches = documents.filter(doc =>
    doc.keywords.some(k => q.includes(k))
  );
  if (matches.length === 0) return "No se encontró información relevante.";
  return matches.map(m => m.content).join("\n");
}
