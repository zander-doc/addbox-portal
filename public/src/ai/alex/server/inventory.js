// Alex de ADDBOX — Módulo de inventario (server-side)
import { supabase } from "./db.js";

// ─────────────────────────────────────────
// Consultas
// ─────────────────────────────────────────

export async function getProductById(id) {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function buscarProducto(texto) {
  const { data } = await supabase
    .from("productos")
    .select("id, nombre, stock, unidad, categoria, ubicacion")
    .ilike("nombre", `%${texto}%`)
    .limit(10);
  return data || [];
}

export async function resumenInventario() {
  const { data } = await supabase.from("productos").select("stock, costo");
  if (!data) return { totalProductos: 0, totalStock: 0, valorTotal: 0 };
  return {
    totalProductos: data.length,
    totalStock: data.reduce((acc, p) => acc + (p.stock || 0), 0),
    valorTotal: data.reduce((acc, p) => acc + ((p.stock || 0) * (p.costo || 0)), 0)
  };
}

export async function productosCriticos(umbral = 5) {
  const { data } = await supabase
    .from("productos")
    .select("id, nombre, stock, stock_minimo, unidad")
    .lte("stock", umbral)
    .order("stock", { ascending: true });
  return data || [];
}

export async function insightsOperativos() {
  const { data: productos } = await supabase.from("productos").select("nombre, stock, costo, movimientos");
  if (!productos || productos.length === 0) return { masUsado: null, masCostoso: null, sinStock: 0 };
  const masUsado = [...productos].sort((a, b) => (b.movimientos || 0) - (a.movimientos || 0))[0];
  const masCostoso = [...productos].sort((a, b) => (b.costo || 0) - (a.costo || 0))[0];
  const sinStock = productos.filter(p => p.stock === 0).length;
  return { masUsado: masUsado?.nombre, masCostoso: masCostoso?.nombre, sinStock };
}

// ─────────────────────────────────────────
// Validaciones y simulaciones
// ─────────────────────────────────────────

export function validarMovimiento(tipo, producto, cantidad) {
  if (!producto) return { ok: false, motivo: "Producto no encontrado." };
  if (cantidad <= 0) return { ok: false, motivo: "Cantidad inválida." };
  if ((tipo === "salida" || tipo === "transferencia") && producto.stock < cantidad) {
    return { ok: false, motivo: `Stock insuficiente. Disponible: ${producto.stock}, solicitado: ${cantidad}.` };
  }
  return { ok: true, motivo: "Movimiento válido." };
}

export function simularMovimiento(tipo, producto, cantidad) {
  if (!producto) return null;
  let nuevoStock = producto.stock;
  if (tipo === "entrada") nuevoStock += cantidad;
  if (tipo === "salida" || tipo === "transferencia") nuevoStock -= cantidad;
  return {
    id: producto.id,
    nombre: producto.nombre,
    stockActual: producto.stock,
    stockSimulado: nuevoStock,
    alerta: nuevoStock <= (producto.stock_minimo || 0) ? "⚠️ Quedará en stock crítico" : null
  };
}

export function detectarErrores(producto) {
  const errores = [];
  if (!producto) return ["Producto no encontrado."];
  if (producto.stock < 0) errores.push("Stock negativo detectado.");
  if (producto.stock === 0) errores.push("Producto sin existencias.");
  if (!producto.unidad) errores.push("Sin unidad de medida.");
  if (!producto.categoria) errores.push("Sin categoría asignada.");
  return errores;
}

export function explicarError(codigo) {
  const mapa = {
    "23514": "Violación de restricción: probablemente stock negativo.",
    "42501": "Permisos insuficientes para este movimiento.",
    "22P02": "Formato inválido en cantidad o ID.",
    "400": "Datos incompletos o inválidos.",
    "404": "Producto no encontrado.",
    "409": "Conflicto: producto modificado por otro usuario."
  };
  return mapa[String(codigo)] || "Error desconocido.";
}

export function pasosMovimiento(tipo) {
  const mapa = {
    entrada: ["Seleccionar proveedor", "Registrar factura/guía", "Agregar productos y cantidades", "Revisar totales", "Confirmar entrada"],
    salida: ["Seleccionar producto", "Indicar cantidad", "Seleccionar motivo", "Verificar stock", "Confirmar salida"],
    transferencia: ["Seleccionar producto", "Indicar cantidad", "Seleccionar almacén destino", "Verificar stock en origen", "Confirmar transferencia"],
    devolucion: ["Seleccionar material prestado", "Indicar estado (bueno/dañado)", "Si dañado: enviar a reparación", "Confirmar devolución"],
    ajuste: ["Realizar conteo físico", "Comparar con sistema", "Registrar diferencias", "Indicar motivo", "Solicitar aprobación"]
  };
  return mapa[tipo] || ["Tipo no reconocido. Válidos: entrada, salida, transferencia, devolucion, ajuste."];
}

export function sugerenciasPorRol(rol) {
  const mapa = {
    almacenista: ["Consultar stock", "Registrar entradas y salidas", "Hacer transferencias", "Buscar productos", "Validar stock antes de despachar"],
    supervisor: ["Revisar diferencias", "Aprobar ajustes", "Ver KPIs y movimientos", "Detectar inconsistencias", "Revisar productos críticos"],
    admin: ["Ver costos y valor del inventario", "Acceder a auditoría", "Ver insights operativos", "Configurar el sistema", "Analizar errores"]
  };
  return mapa[rol] || ["Consultar stock", "Buscar productos", "Pedir ayuda"];
}

export default {
  getProductById, buscarProducto, resumenInventario, productosCriticos,
  insightsOperativos, validarMovimiento, simularMovimiento, detectarErrores,
  explicarError, pasosMovimiento, sugerenciasPorRol
};
