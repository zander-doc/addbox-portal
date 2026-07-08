/**
 * importService.js
 * Servicio para importar productos desde archivos CSV con estructura del cliente.
 * Soporta ambos formatos: cvs-1.csv y cvs-2.csv
 *
 * Requirements: 6.5, 6.6, 7.4, 9.4
 */

import { supabase } from "./supabase-client.js";
import { showToast } from "./toastService.js";

// Columnas esperadas para cvs-1.csv (COSTO_PROMEDIO_BS primero)
const COLUMNAS_CSV1 = [
  "codigo",
  "descripcion",
  "unidad",
  "costo_promedio_bs",
  "costo_promedio_$",
  "entrada",
  "salida",
  "existencia",
  "categoria",
  "estado"
];

// Columnas esperadas para cvs-2.csv (COSTO_PROMEDIO_$ primero)
const COLUMNAS_CSV2 = [
  "codigo",
  "descripcion",
  "unidad",
  "costo_promedio_$",
  "costo_promedio_bs",
  "entrada",
  "salida",
  "existencia",
  "categoria",
  "estado"
];

/**
 * Parsear archivo CSV y convertir a array de productos.
 * @param {File} archivo - Archivo CSV seleccionado por el usuario
 * @returns {Promise<{ productos: object[], errores: Array<{ fila: number, motivo: string }> }>}
 */
export async function importarCSV(archivo) {
  if (!archivo || !archivo.name) {
    throw new Error("No se proporcionó un archivo válido");
  }

  const contenido = await archivo.text();
  const { filas, errores } = parsearCSV(contenido);

  if (errores.length > 0) {
    return { productos: [], errores };
  }

  // Convertir filas a productos con formato de Supabase
  const productos = filas.map((fila) => ({
    codigo: fila.codigo?.trim(),
    descripcion: fila.descripcion?.trim(),
    unidad: fila.unidad?.trim() || "UND",
    costo_prom: parseFloat(fila.costo_promedio_bs) || 0,
    costo_prom_dolares: parseFloat(fila.costo_promedio_$) || 0,
    categoria: fila.categoria?.trim() || "OTROS",
    estado: fila.estado?.trim() || "ACTIVO",
    umbral_critico: 5,
    umbral_alerta: 9,
  }));

  return { productos, errores: [] };
}

/**
 * Importar productos a Supabase.
 * @param {object[]} productos - Array de productos a insertar
 * @returns {Promise<{ success: boolean, insertados: number, errores: string[] }>}
 */
export async function guardarProductos(productos) {
  const errores = [];
  let insertados = 0;

  // Dividir en lotes de 100 para evitar timeouts
  const LOTE_TAMANO = 100;

  for (let i = 0; i < productos.length; i += LOTE_TAMANO) {
    const lote = productos.slice(i, i + LOTE_TAMANO);

    try {
      const { data, error } = await supabase
        .from("productos")
        .upsert(lote, {
          onConflict: "codigo",
          ignoreDuplicates: false,
        });

      if (error) {
        errores.push(`Error en lote ${Math.floor(i / LOTE_TAMANO) + 1}: ${error.message}`);
      } else {
        insertados += data?.length || 0;
      }
    } catch (err) {
      errores.push(`Error inesperado en lote ${Math.floor(i / LOTE_TAMANO) + 1}: ${err.message}`);
    }
  }

  return {
    success: errores.length === 0,
    insertados,
    errores,
  };
}

/**
 * Crear stock_obra para todos los productos en todas las obras activas.
 * @returns {Promise<{ success: boolean, errores: string[] }>}
 */
export async function crearStockInicial() {
  const errores = [];

  // Obtener todas las obras activas
  const { data: obras, error: errorObras } = await supabase
    .from("obras")
    .select("id, nombre")
    .eq("estado", "activa");

  if (errorObras) {
    errores.push(`Error obteniendo obras: ${errorObras.message}`);
    return { success: false, errores };
  }

  if (!obras || obras.length === 0) {
    errores.push("No hay obras activas para crear stock inicial");
    return { success: false, errores };
  }

  // Obtener todos los productos
  const { data: productos, error: errorProductos } = await supabase
    .from("productos")
    .select("id, codigo, descripcion");

  if (errorProductos) {
    errores.push(`Error obteniendo productos: ${errorProductos.message}`);
    return { success: false, errores };
  }

  if (!productos || productos.length === 0) {
    errores.push("No hay productos para crear stock inicial");
    return { success: false, errores };
  }

  // Crear stock_obra para cada producto-obra
  const stockObra = [];
  for (const producto of productos) {
    for (const obra of obras) {
      stockObra.push({
        producto_id: producto.id,
        obra_id: obra.id,
        cantidad: 0, // Iniciar con 0, se actualizará después
      });
    }
  }

  // Insertar en lotes
  const LOTE_TAMANO = 100;
  for (let i = 0; i < stockObra.length; i += LOTE_TAMANO) {
    const lote = stockObra.slice(i, i + LOTE_TAMANO);

    try {
      const { error } = await supabase.from("stock_obra").upsert(lote, {
        onConflict: "producto_id,obra_id",
        ignoreDuplicates: true,
      });

      if (error) {
        errores.push(`Error en lote de stock_obra: ${error.message}`);
      }
    } catch (err) {
      errores.push(`Error inesperado en stock_obra: ${err.message}`);
    }
  }

  return {
    success: errores.length === 0,
    errores,
  };
}

/**
 * Actualizar tasa de cambio.
 * @param {number} tasa - Nueva tasa de cambio
 * @param {string} fuente - Fuente de la tasa (opcional)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function actualizarTasaCambio(tasa, fuente = "BCV") {
  const { error } = await supabase
    .from("tasas_cambio")
    .upsert({
      fecha: new Date().toISOString().split("T")[0],
      tasa: parseFloat(tasa),
      fuente,
    }, {
      onConflict: "fecha,fuente",
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Obtener tasa de cambio actual.
 * @returns {Promise<{ tasa: number, fecha: string }>}
 */
export async function obtenerTasaCambio() {
  const { data, error } = await supabase.rpc("obtener_tasa_del_dia");

  if (error) {
    // Fallback: obtener manualmente
    const { data: tasaData, error: tasaError } = await supabase
      .from("tasas_cambio")
      .select("tasa, fecha")
      .order("fecha", { ascending: false })
      .limit(1)
      .single();

    if (tasaError || !tasaData) {
      return { tasa: 36.50, fecha: new Date().toISOString().split("T")[0] };
    }

    return { tasa: tasaData.tasa, fecha: tasaData.fecha };
  }

  return { tasa: data, fecha: new Date().toISOString().split("T")[0] };
}

/**
 * Convertir USD a BS usando la tasa actual.
 * @param {number} montoUsd - Monto en dólares
 * @returns {Promise<number>} - Monto en bolívares
 */
export async function convertirUsdABs(montoUsd) {
  const { tasa } = await obtenerTasaCambio();
  return montoUsd * tasa;
}

// --- Funciones internas ---

/**
 * Parsear contenido CSV a array de objetos.
 * @param {string} texto - Contenido CSV
 * @returns {{ filas: object[], errores: Array<{ fila: number, motivo: string }> }}
 */
function parsearCSV(texto) {
  const errores = [];
  const filas = [];

  if (!texto || typeof texto !== "string") {
    errores.push({ fila: 0, motivo: "El contenido CSV está vacío o no es válido" });
    return { filas, errores };
  }

  // Remover BOM si existe
  const textoLimpio = texto.replace(/^\uFEFF/, "");

  // Separar líneas
  const lineas = textoLimpio.split(/\r?\n/).filter((linea) => linea.trim() !== "");

  if (lineas.length === 0) {
    errores.push({ fila: 0, motivo: "El archivo CSV está vacío" });
    return { filas, errores };
  }

  // Parsear encabezado
  const encabezado = parsearLineaCSV(lineas[0]).map((col) => col.trim().toLowerCase());

  // Determinar qué formato es (cvs-1 o cvs-2)
  const columnasEsperadas = encabezado.includes("costo_promedio_$")
    ? COLUMNAS_CSV2
    : COLUMNAS_CSV1;

  // Validar columnas requeridas
  const columnasFaltantes = columnasEsperadas.filter(
    (col) => !encabezado.includes(col.toLowerCase())
  );

  if (columnasFaltantes.length > 0) {
    errores.push({
      fila: 1,
      motivo: `Columnas faltantes: ${columnasFaltantes.join(", ")}`,
    });
    return { filas, errores };
  }

  // Parsear filas de datos
  for (let i = 1; i < lineas.length; i++) {
    const numFila = i + 1;
    const valores = parsearLineaCSV(lineas[i]);

    if (valores.length !== encabezado.length) {
      errores.push({
        fila: numFila,
        motivo: `Número de columnas incorrecto: esperado ${encabezado.length}, encontrado ${valores.length}`,
      });
      continue;
    }

    const fila = {};
    let filaValida = true;

    for (let j = 0; j < encabezado.length; j++) {
      const columna = encabezado[j];
      const valor = valores[j].trim();

      if (columnasEsperadas.map((c) => c.toLowerCase()).includes(columna) && valor === "") {
        errores.push({
          fila: numFila,
          motivo: `Valor vacío en columna "${columna}"`,
        });
        filaValida = false;
        break;
      }

      fila[columna] = valor;
    }

    if (filaValida) {
      filas.push(fila);
    }
  }

  return { filas, errores };
}

/**
 * Parsear una línea CSV respetando comillas y comas dentro de valores entrecomillados.
 * @param {string} linea - Línea CSV
 * @returns {string[]} Array de valores
 */
function parsearLineaCSV(linea) {
  const valores = [];
  let valorActual = "";
  let dentroComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const char = linea[i];

    if (dentroComillas) {
      if (char === '"') {
        if (i + 1 < linea.length && linea[i + 1] === '"') {
          valorActual += '"';
          i++;
        } else {
          dentroComillas = false;
        }
      } else {
        valorActual += char;
      }
    } else {
      if (char === '"') {
        dentroComillas = true;
      } else if (char === ",") {
        valores.push(valorActual);
        valorActual = "";
      } else {
        valorActual += char;
      }
    }
  }

  valores.push(valorActual);
  return valores;
}
