// Alex de ADDBOX — Acciones ejecutables (con auditoría)
import { supabase } from "./db.js";

/**
 * Registrar una entrada de inventario
 */
export async function ejecutarEntrada({ producto_id, cantidad, proveedor, factura, usuario_id }) {
  // Validar
  const { data: producto } = await supabase.from("productos").select("*").eq("id", producto_id).single();
  if (!producto) return { ok: false, error: "Producto no encontrado." };
  if (cantidad <= 0) return { ok: false, error: "Cantidad inválida." };

  // Ejecutar
  const nuevoStock = producto.stock + cantidad;
  const { error } = await supabase
    .from("productos")
    .update({ stock: nuevoStock })
    .eq("id", producto_id);

  if (error) return { ok: false, error: error.message };

  // Registrar movimiento
  await supabase.from("movimientos").insert({
    producto_id,
    tipo: "entrada",
    cantidad,
    stock_resultante: nuevoStock,
    proveedor: proveedor || null,
    factura: factura || null,
    usuario_id,
    creado_en: new Date().toISOString()
  });

  // Auditoría Alex
  await registrarAccion(usuario_id, "entrada", { producto_id, cantidad, nuevoStock });

  return { ok: true, producto: producto.nombre, stockAnterior: producto.stock, stockNuevo: nuevoStock };
}

/**
 * Registrar una salida de inventario
 */
export async function ejecutarSalida({ producto_id, cantidad, motivo, usuario_id }) {
  const { data: producto } = await supabase.from("productos").select("*").eq("id", producto_id).single();
  if (!producto) return { ok: false, error: "Producto no encontrado." };
  if (cantidad <= 0) return { ok: false, error: "Cantidad inválida." };
  if (producto.stock < cantidad) return { ok: false, error: `Stock insuficiente. Disponible: ${producto.stock}` };

  const nuevoStock = producto.stock - cantidad;
  const { error } = await supabase
    .from("productos")
    .update({ stock: nuevoStock })
    .eq("id", producto_id);

  if (error) return { ok: false, error: error.message };

  await supabase.from("movimientos").insert({
    producto_id,
    tipo: "salida",
    cantidad,
    stock_resultante: nuevoStock,
    motivo: motivo || null,
    usuario_id,
    creado_en: new Date().toISOString()
  });

  await registrarAccion(usuario_id, "salida", { producto_id, cantidad, nuevoStock });

  return { ok: true, producto: producto.nombre, stockAnterior: producto.stock, stockNuevo: nuevoStock };
}

/**
 * Ejecutar transferencia entre almacenes
 */
export async function ejecutarTransferencia({ producto_id, cantidad, destino, usuario_id }) {
  const { data: producto } = await supabase.from("productos").select("*").eq("id", producto_id).single();
  if (!producto) return { ok: false, error: "Producto no encontrado." };
  if (cantidad <= 0) return { ok: false, error: "Cantidad inválida." };
  if (producto.stock < cantidad) return { ok: false, error: `Stock insuficiente. Disponible: ${producto.stock}` };

  const nuevoStock = producto.stock - cantidad;
  const { error } = await supabase
    .from("productos")
    .update({ stock: nuevoStock })
    .eq("id", producto_id);

  if (error) return { ok: false, error: error.message };

  await supabase.from("movimientos").insert({
    producto_id,
    tipo: "transferencia",
    cantidad,
    stock_resultante: nuevoStock,
    destino: destino || null,
    usuario_id,
    creado_en: new Date().toISOString()
  });

  await registrarAccion(usuario_id, "transferencia", { producto_id, cantidad, destino, nuevoStock });

  return { ok: true, producto: producto.nombre, stockAnterior: producto.stock, stockNuevo: nuevoStock, destino };
}

/**
 * Registrar acción en auditoría de Alex
 */
async function registrarAccion(userId, tipo, detalles) {
  await supabase.from("alex_acciones").insert({
    user_id: userId,
    tipo,
    detalles,
    ejecutado_por: "alex",
    created_at: new Date().toISOString()
  });
}

export default { ejecutarEntrada, ejecutarSalida, ejecutarTransferencia };
