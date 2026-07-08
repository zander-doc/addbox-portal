/* ============================================================
   CHART SERVICE — ADDBOX
   Capa de datos para gráficas analíticas.
   Invoca RPCs de Supabase y normaliza respuestas a Dataset
   [{label: string, value: number}]
============================================================ */

import { supabase } from "./supabase-client.js";

/* ============================
   TOP 5 PRODUCTOS (Donut)
============================ */

/**
 * Obtiene los 5 productos con mayor stock.
 * RPC: top_5_productos() → {nombre text, cantidad numeric}
 * Normaliza a {label, value}, ordena desc por value, máx 5 items.
 * @returns {Promise<Array<{label: string, value: number}>>}
 */
export async function getTop5Productos() {
  const { data, error } = await supabase.rpc("top_5_productos");

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data
    .map((row) => ({
      label: row.nombre != null ? String(row.nombre) : "Sin nombre",
      value: Math.max(0, Math.trunc(Number(row.cantidad) || 0)),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

/* ============================
   TENDENCIA DE MOVIMIENTOS (Line)
============================ */

/**
 * Obtiene la tendencia de movimientos de los últimos 30 días.
 * RPC: movimientos_tendencia_30dias() → {fecha date, total numeric}
 * Normaliza a {label ISO "YYYY-MM-DD", value}, excluye nulls,
 * ordena asc por label, máx 30 items.
 * @returns {Promise<Array<{label: string, value: number}>>}
 */
export async function getTendenciaMovimientos() {
  const { data, error } = await supabase.rpc("movimientos_tendencia_30dias");

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data
    .filter((row) => row.fecha != null && row.total != null)
    .map((row) => {
      // Normalizar fecha a ISO "YYYY-MM-DD"
      const fecha = new Date(row.fecha);
      const label = fecha.toISOString().split("T")[0];
      return {
        label,
        value: Number(row.total),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(0, 30);
}

/* ============================
   VALOR INVENTARIO POR CATEGORÍA (Bar)
============================ */

/**
 * Obtiene el valor del inventario agrupado por categoría.
 * RPC: valor_inventario_por_categoria() → {categoria text, valor numeric}
 * Normaliza a {label, value}, fallback "Sin categoría",
 * redondea a 2 decimales, negativos → 0.
 * @returns {Promise<Array<{label: string, value: number}>>}
 */
export async function getValorInventarioPorCategoria() {
  const { data, error } = await supabase.rpc("valor_inventario_por_categoria");

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((row) => {
    const rawValue = Number(row.valor);
    const value = isNaN(rawValue) || rawValue < 0
      ? 0
      : Math.round(rawValue * 100) / 100;

    return {
      label: row.categoria != null ? String(row.categoria) : "Sin categoría",
      value,
    };
  });
}
