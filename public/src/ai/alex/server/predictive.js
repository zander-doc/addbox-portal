// Alex de ADDBOX — Auditoría predictiva
import { supabase } from "./db.js";

/**
 * Predecir cuándo se agotará un producto basado en consumo promedio
 */
export async function predecirAgotamiento(productoId) {
  // Obtener producto
  const { data: producto } = await supabase
    .from("productos")
    .select("id, nombre, stock")
    .eq("id", productoId)
    .single();

  if (!producto) return null;

  // Obtener salidas de los últimos 30 días
  const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: salidas } = await supabase
    .from("movimientos")
    .select("cantidad, creado_en")
    .eq("producto_id", productoId)
    .eq("tipo", "salida")
    .gte("creado_en", hace30dias);

  if (!salidas || salidas.length === 0) {
    return { producto: producto.nombre, stock: producto.stock, diasRestantes: null, mensaje: "Sin salidas recientes — no se puede predecir." };
  }

  // Calcular consumo promedio diario
  const totalSalidas = salidas.reduce((acc, s) => acc + (s.cantidad || 0), 0);
  const consumoDiario = totalSalidas / 30;

  if (consumoDiario === 0) {
    return { producto: producto.nombre, stock: producto.stock, diasRestantes: null, mensaje: "Consumo diario es 0." };
  }

  const diasRestantes = Math.floor(producto.stock / consumoDiario);

  return {
    producto: producto.nombre,
    stock: producto.stock,
    consumoDiario: Math.round(consumoDiario * 10) / 10,
    diasRestantes,
    mensaje: diasRestantes <= 3
      ? `⚠️ CRÍTICO: ${producto.nombre} se agotará en ~${diasRestantes} días`
      : diasRestantes <= 7
        ? `⚡ ALERTA: ${producto.nombre} se agotará en ~${diasRestantes} días`
        : `✅ ${producto.nombre} tiene stock para ~${diasRestantes} días`
  };
}

/**
 * Detectar patrones sospechosos en movimientos recientes
 */
export async function detectarAnomalias() {
  const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: movimientos } = await supabase
    .from("movimientos")
    .select("*")
    .gte("creado_en", hace7dias)
    .order("creado_en", { ascending: false });

  if (!movimientos || movimientos.length === 0) return [];

  const anomalias = [];

  // 1. Salidas inusualmente grandes (>2x el promedio)
  const salidas = movimientos.filter(m => m.tipo === "salida");
  if (salidas.length > 2) {
    const promedio = salidas.reduce((acc, s) => acc + s.cantidad, 0) / salidas.length;
    const grandes = salidas.filter(s => s.cantidad > promedio * 2);
    for (const s of grandes) {
      anomalias.push({
        tipo: "salida_grande",
        mensaje: `Salida inusual: ${s.cantidad} unidades (promedio: ${Math.round(promedio)})`,
        movimiento_id: s.id,
        fecha: s.creado_en
      });
    }
  }

  // 2. Movimientos en horarios inusuales (antes de 6am o después de 10pm)
  for (const m of movimientos) {
    const hora = new Date(m.creado_en).getHours();
    if (hora < 6 || hora > 22) {
      anomalias.push({
        tipo: "horario_inusual",
        mensaje: `Movimiento a las ${hora}:00 — fuera de horario laboral`,
        movimiento_id: m.id,
        fecha: m.creado_en
      });
    }
  }

  // 3. Mismo producto con muchas salidas en poco tiempo
  const porProducto = {};
  for (const s of salidas) {
    if (!porProducto[s.producto_id]) porProducto[s.producto_id] = [];
    porProducto[s.producto_id].push(s);
  }
  for (const [pid, movs] of Object.entries(porProducto)) {
    if (movs.length >= 5) {
      anomalias.push({
        tipo: "frecuencia_alta",
        mensaje: `Producto #${pid}: ${movs.length} salidas en 7 días — revisar`,
        producto_id: pid
      });
    }
  }

  return anomalias;
}

/**
 * Generar recomendaciones de reorden
 */
export async function recomendacionesReorden() {
  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, stock, stock_minimo")
    .lte("stock", 10)
    .order("stock", { ascending: true });

  if (!productos || productos.length === 0) return [];

  const recomendaciones = [];
  for (const p of productos) {
    const prediccion = await predecirAgotamiento(p.id);
    recomendaciones.push({
      producto: p.nombre,
      stock: p.stock,
      stockMinimo: p.stock_minimo || 0,
      diasRestantes: prediccion?.diasRestantes || null,
      urgencia: p.stock === 0 ? "inmediata" : (prediccion?.diasRestantes || 99) <= 3 ? "alta" : "media",
      sugerencia: `Reabastecer ${p.nombre}. Stock actual: ${p.stock}${prediccion?.diasRestantes ? ` (~${prediccion.diasRestantes} días restantes)` : ""}`
    });
  }

  return recomendaciones.sort((a, b) => {
    const orden = { inmediata: 0, alta: 1, media: 2 };
    return (orden[a.urgencia] || 3) - (orden[b.urgencia] || 3);
  });
}

/**
 * Resumen predictivo completo para Alex
 */
export async function resumenPredictivo() {
  const [anomalias, reorden] = await Promise.all([
    detectarAnomalias(),
    recomendacionesReorden()
  ]);

  let resumen = "📊 AUDITORÍA PREDICTIVA\n\n";

  // Anomalías
  if (anomalias.length > 0) {
    resumen += `🚨 ${anomalias.length} anomalía(s) detectada(s):\n`;
    resumen += anomalias.slice(0, 5).map(a => `• ${a.mensaje}`).join("\n");
    resumen += "\n\n";
  } else {
    resumen += "✅ Sin anomalías detectadas en los últimos 7 días.\n\n";
  }

  // Reorden
  if (reorden.length > 0) {
    resumen += `📦 ${reorden.length} producto(s) necesitan reabastecimiento:\n`;
    resumen += reorden.slice(0, 5).map(r => `• [${r.urgencia.toUpperCase()}] ${r.sugerencia}`).join("\n");
  } else {
    resumen += "✅ Todos los productos tienen stock suficiente.";
  }

  return resumen;
}

export default { predecirAgotamiento, detectarAnomalias, recomendacionesReorden, resumenPredictivo };
