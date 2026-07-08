// Alex de ADDBOX — Utilidades

/** Sanitizar input — eliminar HTML, limitar longitud */
export function sanitize(text) {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 500);
}

/** Formatear moneda MXN */
export function formatCurrency(amount) {
  return `$${Number(amount || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
}

export default { sanitize, formatCurrency };
