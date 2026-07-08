/**
 * lote.service.js
 * Servicio para operaciones de inventario por lote.
 * Permite validar, procesar y parsear lotes de movimientos.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { supabase } from "../../services/supabase-client.js";
import { parsearCSV as csvParsear } from "../../services/csvService.js";

/** Límite máximo de líneas por lote */
const LIMITE_LINEAS = 500;

/** Tipos de movimiento válidos para operaciones por lote */
const TIPOS_VALIDOS = ["entrada", "salida", "ajuste", "transferencia_salida"];

/**
 * Validar un lote completo de líneas de movimiento.
 * Valida cada línea individualmente y reporta errores por línea con motivo específico.
 *
 * @param {Array<{codigo_producto?: string, producto_id?: string, cantidad: number, tipo: string, obra?: string, obra_id?: string, motivo?: string, obra_destino_id?: string}>} lineas
 * @returns {{ valido: boolean, errores: Array<{ linea: number, motivo: string }> }}
 */
export function validarLote(lineas) {
  const errores = [];

  // Validar que el lote no esté vacío
  if (!Array.isArray(lineas) || lineas.length === 0) {
    errores.push({ linea: 0, motivo: "El lote no contiene líneas de movimiento" });
    return { valido: false, errores };
  }

  // Validar límite de 500 líneas
  if (lineas.length > LIMITE_LINEAS) {
    errores.push({ linea: 0, motivo: `El lote excede el límite de ${LIMITE_LINEAS} líneas` });
    return { valido: false, errores };
  }

  // Validar cada línea individualmente
  for (let i = 0; i < lineas.length; i++) {
    const numLinea = i + 1;
    const linea = lineas[i];

    if (!linea || typeof linea !== "object") {
      errores.push({ linea: numLinea, motivo: "Línea vacía o formato inválido" });
      continue;
    }

    // Validar producto (debe tener producto_id o codigo_producto)
    if (!linea.producto_id && !linea.codigo_producto) {
      errores.push({ linea: numLinea, motivo: "Producto no especificado (falta producto_id o codigo_producto)" });
    }

    // Validar tipo de movimiento
    if (!linea.tipo) {
      errores.push({ linea: numLinea, motivo: "Tipo de movimiento no especificado" });
    } else if (!TIPOS_VALIDOS.includes(linea.tipo)) {
      errores.push({ linea: numLinea, motivo: `Tipo de movimiento inválido: "${linea.tipo}". Valores permitidos: ${TIPOS_VALIDOS.join(", ")}` });
    }

    // Validar cantidad
    const cantidad = Number(linea.cantidad);
    if (linea.cantidad === undefined || linea.cantidad === null || linea.cantidad === "") {
      errores.push({ linea: numLinea, motivo: "Cantidad no especificada" });
    } else if (isNaN(cantidad) || !Number.isInteger(cantidad)) {
      errores.push({ linea: numLinea, motivo: "La cantidad debe ser un número entero" });
    } else if (linea.tipo === "ajuste") {
      // Ajustes permiten negativos pero no cero
      if (cantidad === 0) {
        errores.push({ linea: numLinea, motivo: "La cantidad no puede ser cero para ajustes" });
      } else if (cantidad < -999999 || cantidad > 999999) {
        errores.push({ linea: numLinea, motivo: "Cantidad fuera de rango permitido (-999,999 a 999,999)" });
      }
    } else {
      // Entradas, salidas y transferencias: solo positivos
      if (cantidad < 1 || cantidad > 999999) {
        errores.push({ linea: numLinea, motivo: "Cantidad fuera de rango permitido (1 a 999,999)" });
      }
    }

    // Validar obra (debe tener obra_id o obra)
    if (!linea.obra_id && !linea.obra) {
      errores.push({ linea: numLinea, motivo: "Obra no especificada (falta obra_id o obra)" });
    }

    // Validar obra destino para transferencias
    if (linea.tipo === "transferencia_salida" && !linea.obra_destino_id) {
      errores.push({ linea: numLinea, motivo: "Obra destino no especificada para transferencia" });
    }

    // Validar motivo para ajustes (mínimo 10 caracteres)
    if (linea.tipo === "ajuste") {
      if (!linea.motivo || typeof linea.motivo !== "string" || linea.motivo.trim().length < 10) {
        errores.push({ linea: numLinea, motivo: "El motivo del ajuste debe tener al menos 10 caracteres" });
      }
    }
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}

/**
 * Procesar un lote de movimientos de forma atómica via RPC.
 * Todas las líneas se procesan como una transacción: si una falla, ninguna se aplica.
 *
 * @param {Array<{producto_id: string, obra_id: string, cantidad: number, tipo: string, motivo?: string, observacion?: string, obra_destino_id?: string}>} lineas
 * @returns {Promise<{success: boolean, movimientos_creados?: number, lote_id?: string, error?: string}>}
 */
export async function procesarLote(lineas) {
  // Validar antes de enviar al servidor
  const validacion = validarLote(lineas);
  if (!validacion.valido) {
    return {
      success: false,
      error: `El lote tiene ${validacion.errores.length} error(es) de validación`,
      errores: validacion.errores,
    };
  }

  const usuario = supabase.auth.user();
  if (!usuario) {
    return { success: false, error: "Usuario no autenticado" };
  }

  // Preparar líneas para el RPC
  const lineasRPC = lineas.map((linea) => ({
    producto_id: linea.producto_id,
    obra_id: linea.obra_id,
    cantidad: Number(linea.cantidad),
    tipo: linea.tipo,
    motivo: linea.motivo || null,
    observacion: linea.observacion || null,
    obra_destino_id: linea.obra_destino_id || null,
  }));

  const { data, error } = await supabase.rpc("procesar_lote", {
    p_lineas: lineasRPC,
    p_usuario_id: usuario.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data && data.success === false) {
    return { success: false, error: data.error };
  }

  return {
    success: true,
    movimientos_creados: data.movimientos_creados,
    lote_id: data.lote_id,
  };
}

/**
 * Parsear contenido CSV a líneas de lote.
 * Usa csvService para parsear y mapea las columnas al formato esperado por el lote.
 * Columnas esperadas: codigo_producto, cantidad, tipo, obra
 *
 * @param {string} contenidoCSV - Contenido del archivo CSV como string
 * @returns {{ lineas: Array<{codigo_producto: string, cantidad: number, tipo: string, obra: string}>, errores: Array<{fila: number, motivo: string}> }}
 */
export function parsearCSV(contenidoCSV) {
  const columnasEsperadas = ["codigo_producto", "cantidad", "tipo", "obra"];

  const resultado = csvParsear(contenidoCSV, columnasEsperadas);
  const lineas = [];
  const errores = [...resultado.errores];

  // Si hubo errores de estructura (columnas faltantes, archivo vacío), retornar
  if (errores.length > 0 && resultado.filas.length === 0) {
    return { lineas, errores };
  }

  // Validar límite de 500 líneas
  if (resultado.filas.length > LIMITE_LINEAS) {
    errores.push({
      fila: 0,
      motivo: `El archivo excede el límite de ${LIMITE_LINEAS} líneas de movimiento`,
    });
    return { lineas, errores };
  }

  // Mapear y validar cada fila parseada
  for (let i = 0; i < resultado.filas.length; i++) {
    const fila = resultado.filas[i];
    const numFila = i + 2; // +2 porque fila 1 es encabezado y el array es 0-indexed

    // Validar tipo de movimiento
    const tipo = fila.tipo ? fila.tipo.trim().toLowerCase() : "";
    if (!TIPOS_VALIDOS.includes(tipo)) {
      errores.push({
        fila: numFila,
        motivo: `Tipo de movimiento inválido: "${fila.tipo}". Valores permitidos: ${TIPOS_VALIDOS.join(", ")}`,
      });
      continue;
    }

    // Validar cantidad numérica
    const cantidad = Number(fila.cantidad);
    if (isNaN(cantidad) || !Number.isInteger(cantidad)) {
      errores.push({
        fila: numFila,
        motivo: `Cantidad no es un número entero válido: "${fila.cantidad}"`,
      });
      continue;
    }

    if (tipo === "ajuste") {
      if (cantidad === 0) {
        errores.push({ fila: numFila, motivo: "La cantidad no puede ser cero para ajustes" });
        continue;
      }
      if (cantidad < -999999 || cantidad > 999999) {
        errores.push({ fila: numFila, motivo: "Cantidad fuera de rango permitido (-999,999 a 999,999)" });
        continue;
      }
    } else {
      if (cantidad < 1 || cantidad > 999999) {
        errores.push({ fila: numFila, motivo: "Cantidad fuera de rango permitido (1 a 999,999)" });
        continue;
      }
    }

    lineas.push({
      codigo_producto: fila.codigo_producto.trim(),
      cantidad: cantidad,
      tipo: tipo,
      obra: fila.obra.trim(),
    });
  }

  return { lineas, errores };
}
