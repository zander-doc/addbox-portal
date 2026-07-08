import { db } from "./neon-client.js";

const UMBRAL_CRITICO_DEFAULT = 5;
const UMBRAL_ALERTA_DEFAULT = 9;

export function clasificarAlerta(cantidad, umbralCritico, umbralAlerta) {
  if (cantidad < umbralCritico) return "critico";
  if (cantidad <= umbralAlerta) return "alerta";
  return "normal";
}

export function validarUmbrales(umbralCritico, umbralAlerta) {
  if (!Number.isInteger(umbralCritico) || umbralCritico < 1 || umbralCritico > 9999) {
    return { valido: false, error: "El umbral crítico debe ser un entero entre 1 y 9999" };
  }
  if (!Number.isInteger(umbralAlerta) || umbralAlerta < 2 || umbralAlerta > 9999) {
    return { valido: false, error: "El umbral de alerta debe ser un entero entre 2 y 9999" };
  }
  if (umbralCritico >= umbralAlerta) {
    return { valido: false, error: "El umbral crítico debe ser estrictamente menor que el umbral de alerta" };
  }
  return { valido: true };
}

export async function obtenerUmbrales(productoId) {
  try {
    const { data, error } = await db
      .from("productos")
      .select("umbral_critico, umbral_alerta")
      .eq("id", productoId)
      .single();

    if (error) {
      return { umbral_critico: UMBRAL_CRITICO_DEFAULT, umbral_alerta: UMBRAL_ALERTA_DEFAULT };
    }

    return {
      umbral_critico: data.umbral_critico ?? UMBRAL_CRITICO_DEFAULT,
      umbral_alerta: data.umbral_alerta ?? UMBRAL_ALERTA_DEFAULT
    };
  } catch (err) {
    return { umbral_critico: UMBRAL_CRITICO_DEFAULT, umbral_alerta: UMBRAL_ALERTA_DEFAULT };
  }
}

export async function configurarUmbrales(productoId, umbralCritico, umbralAlerta) {
  const validacion = validarUmbrales(umbralCritico, umbralAlerta);
  if (!validacion.valido) {
    return { success: false, error: validacion.error };
  }

  try {
    const { error } = await db
      .from("productos")
      .update({ umbral_critico: umbralCritico, umbral_alerta: umbralAlerta })
      .eq("id", productoId);

    if (error) {
      return { success: false, error: "Error al guardar los umbrales" };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: "Error inesperado" };
  }
}

export async function obtenerProductosCriticos(obraId) {
  try {
    let query = db
      .from("stock_obra")
      .select("*");

    if (obraId) {
      query = query.eq("obra_id", obraId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error obteniendo stock:", error);
      return [];
    }

    // Obtener detalles de productos
    const productosCriticos = [];
    
    for (const item of data || []) {
      const { data: producto } = await db
        .from("productos")
        .select("descripcion, umbral_critico, umbral_alerta")
        .eq("id", item.producto_id)
        .single();

      const umbralCritico = producto?.umbral_critico ?? UMBRAL_CRITICO_DEFAULT;
      
      if (item.cantidad < umbralCritico) {
        const { data: obra } = await db
          .from("obras")
          .select("nombre")
          .eq("id", item.obra_id)
          .single();

        productosCriticos.push({
          producto_id: item.producto_id,
          descripcion: producto?.descripcion ?? "Sin descripción",
          obra: obra?.nombre ?? "Sin obra",
          cantidad: item.cantidad,
          umbral_critico: umbralCritico
        });
      }
    }

    return productosCriticos.sort((a, b) => a.cantidad - b.cantidad);
  } catch (err) {
    console.error("Error obteniendo productos críticos:", err);
    return [];
  }
}