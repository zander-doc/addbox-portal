// src/ai/alex/inventory.js
// Módulo de inventario para Alex — consultas y lógica de negocio

const API_BASE = "/api/rest";

// -----------------------------
// Consultas a base de datos
// -----------------------------

/** Obtener producto por ID */
export async function getProductById(id) {
  return await fetch(`${API_BASE}/productos?id=eq.${id}`)
    .then(r => r.json())
    .then(d => d[0] || null);
}

/** Buscar productos por nombre */
export async function buscarProducto(texto) {
  return await fetch(`${API_BASE}/productos?nombre=ilike.%25${texto}%25`)
    .then(r => r.json());
}

// -----------------------------
// Validaciones
// -----------------------------

/** Validar si hay stock suficiente */
export function validateStock(producto, cantidad) {
  if (!producto) return false;
  return producto.stock >= cantidad;
}

/** Detectar errores en un producto */
export function detectarErrores(producto) {
  const errores = [];
  if (!producto) return ["Producto no encontrado."];
  if (producto.stock < 0) errores.push("Stock negativo detectado.");
  if (producto.stock === 0) errores.push("Producto sin existencias.");
  return errores;
}

// -----------------------------
// Guías operativas
// -----------------------------

/** Obtener pasos para una operación */
export function obtenerPasosOperacion(tipo) {
  const pasos = {
    transferencia: [
      "Seleccionar producto",
      "Indicar cantidad",
      "Seleccionar almacén destino",
      "Confirmar movimiento"
    ],
    salida: [
      "Seleccionar producto",
      "Indicar cantidad",
      "Seleccionar motivo de salida",
      "Confirmar"
    ],
    entrada: [
      "Seleccionar proveedor",
      "Registrar factura/guía",
      "Indicar productos y cantidades",
      "Confirmar entrada"
    ]
  };
  return pasos[tipo] || ["Operación no reconocida."];
}

/** Sugerencias según rol del usuario */
export function sugerenciasPorRol(rol) {
  const mapa = {
    almacenista: [
      "Puedes consultar stock",
      "Puedes registrar entradas y salidas",
      "Puedes hacer transferencias"
    ],
    supervisor: [
      "Puedes revisar diferencias",
      "Puedes aprobar ajustes",
      "Puedes ver KPIs"
    ],
    admin: [
      "Puedes ver costos",
      "Puedes ver auditoría",
      "Puedes configurar el sistema"
    ]
  };
  return mapa[rol] || ["Rol no reconocido."];
}

// -----------------------------
// Movimientos — Validación y simulación
// -----------------------------

/** Validar si un movimiento es posible */
export function validarMovimiento(tipo, producto, cantidad) {
  if (!producto) return { ok: false, motivo: "Producto no encontrado." };
  if (tipo === "salida" || tipo === "transferencia") {
    if (producto.stock < cantidad) {
      return { ok: false, motivo: "Stock insuficiente." };
    }
  }
  if (cantidad <= 0) {
    return { ok: false, motivo: "Cantidad inválida." };
  }
  return { ok: true, motivo: "Movimiento válido." };
}

/** Simular un movimiento sin ejecutarlo */
export function simularMovimiento(tipo, producto, cantidad) {
  if (!producto) return null;
  let nuevoStock = producto.stock;
  if (tipo === "entrada") nuevoStock += cantidad;
  if (tipo === "salida" || tipo === "transferencia") nuevoStock -= cantidad;
  return {
    id: producto.id,
    nombre: producto.nombre,
    stockActual: producto.stock,
    stockSimulado: nuevoStock
  };
}

/** Explicar un código de error de movimiento */
export function explicarErrorMovimiento(codigo) {
  const mapa = {
    "23514": "Violación de restricción: probablemente stock negativo.",
    "42501": "Permisos insuficientes para realizar este movimiento.",
    "22P02": "Formato inválido en la cantidad o ID.",
    "400": "Datos incompletos o inválidos.",
    "404": "Producto no encontrado."
  };
  return mapa[codigo] || "Error desconocido en el movimiento.";
}

/** Detectar inconsistencias en un movimiento */
export function detectarInconsistenciasMovimiento(mov) {
  const errores = [];
  if (!mov) return ["Movimiento no encontrado."];
  if (mov.cantidad <= 0) errores.push("Cantidad inválida.");
  if (!mov.producto_id) errores.push("Movimiento sin producto asociado.");
  if (!mov.tipo) errores.push("Movimiento sin tipo definido.");
  if (mov.stock_resultante < 0) errores.push("El movimiento genera stock negativo.");
  return errores;
}

/** Pasos detallados para un tipo de movimiento */
export function pasosMovimiento(tipo) {
  const mapa = {
    entrada: ["Seleccionar proveedor", "Registrar factura", "Agregar productos", "Confirmar entrada"],
    salida: ["Seleccionar producto", "Indicar cantidad", "Seleccionar motivo", "Confirmar salida"],
    transferencia: ["Seleccionar producto", "Indicar cantidad", "Seleccionar almacén destino", "Confirmar transferencia"]
  };
  return mapa[tipo] || ["Tipo de movimiento no reconocido."];
}

// -----------------------------
// Reportes y análisis
// -----------------------------

/** Resumen general del inventario */
export async function resumenInventario() {
  const data = await fetch(`${API_BASE}/productos`).then(r => r.json());
  const totalProductos = data.length;
  const totalStock = data.reduce((acc, p) => acc + (p.stock || 0), 0);
  const valorTotal = data.reduce((acc, p) => acc + ((p.stock || 0) * (p.costo || 0)), 0);
  return {
    totalProductos,
    totalStock,
    valorTotal
  };
}

/** Productos con stock crítico */
export async function productosCriticos(umbral = 5) {
  const data = await fetch(`${API_BASE}/productos?stock=lte.${umbral}`).then(r => r.json());
  return data || [];
}

/** Resumen de movimientos por periodo */
export async function resumenMovimientos(periodo = "30d") {
  const data = await fetch(`${API_BASE}/movimientos?periodo=eq.${periodo}`).then(r => r.json());
  const entradas = data.filter(m => m.tipo === "entrada").length;
  const salidas = data.filter(m => m.tipo === "salida").length;
  const transferencias = data.filter(m => m.tipo === "transferencia").length;
  return { entradas, salidas, transferencias };
}

/** Insights operativos */
export async function insightsOperativos() {
  const productos = await fetch(`${API_BASE}/productos`).then(r => r.json());
  const masUsado = [...productos].sort((a, b) => b.movimientos - a.movimientos)[0];
  const masCostoso = [...productos].sort((a, b) => (b.costo || 0) - (a.costo || 0))[0];
  const sinStock = productos.filter(p => p.stock === 0).length;
  return {
    masUsado: masUsado?.nombre || null,
    masCostoso: masCostoso?.nombre || null,
    sinStock
  };
}
