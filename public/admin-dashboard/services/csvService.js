/**
 * csvService.js
 * Servicio para parsing, generación y descarga de archivos CSV.
 * Compatible con Excel (BOM UTF-8) y caracteres especiales.
 *
 * Requirements: 6.5, 6.6, 7.4, 9.4
 */

/**
 * Parsear contenido CSV a array de objetos.
 * Valida columnas requeridas y reporta errores por fila.
 *
 * @param {string} texto - Contenido CSV como string
 * @param {string[]} columnasEsperadas - Nombres de columnas requeridas
 * @returns {{ filas: object[], errores: Array<{ fila: number, motivo: string }> }}
 */
export function parsearCSV(texto, columnasEsperadas) {
  const errores = [];
  const filas = [];

  if (!texto || typeof texto !== "string") {
    errores.push({ fila: 0, motivo: "El contenido CSV está vacío o no es válido" });
    return { filas, errores };
  }

  // Remover BOM si existe
  const textoLimpio = texto.replace(/^\uFEFF/, "");

  // Separar líneas (soportar \r\n y \n)
  const lineas = textoLimpio.split(/\r?\n/).filter((linea) => linea.trim() !== "");

  if (lineas.length === 0) {
    errores.push({ fila: 0, motivo: "El archivo CSV está vacío" });
    return { filas, errores };
  }

  // Parsear encabezado
  const encabezado = parsearLineaCSV(lineas[0]).map((col) => col.trim().toLowerCase());

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
    const numFila = i + 1; // Fila 1-indexed (encabezado es fila 1)
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

      // Validar que columnas requeridas no estén vacías
      if (columnasEsperadas.map((c) => c.toLowerCase()).includes(columna) && valor === "") {
        errores.push({
          fila: numFila,
          motivo: `Valor vacío en columna requerida "${columna}"`,
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
 * Generar string CSV desde datos con BOM para compatibilidad con Excel.
 *
 * @param {object[]} datos - Array de objetos con los datos
 * @param {Array<{ key: string, label: string }>} columnas - Definición de columnas (key del objeto, label para encabezado)
 * @param {{ titulo?: string, fecha?: string }} [metadata] - Metadata opcional (título del reporte, fecha de generación)
 * @returns {string} Contenido CSV con BOM UTF-8
 */
export function generarCSV(datos, columnas, metadata) {
  const BOM = "\uFEFF";
  const lineas = [];

  // Agregar metadata si existe
  if (metadata) {
    if (metadata.titulo) {
      lineas.push(escaparValorCSV(metadata.titulo));
    }
    if (metadata.fecha) {
      lineas.push(escaparValorCSV(`Fecha de generación: ${metadata.fecha}`));
    }
    if (metadata.titulo || metadata.fecha) {
      lineas.push(""); // Línea vacía separadora
    }
  }

  // Encabezado
  const encabezado = columnas.map((col) => escaparValorCSV(col.label));
  lineas.push(encabezado.join(","));

  // Filas de datos
  for (const item of datos) {
    const valores = columnas.map((col) => {
      const valor = item[col.key];
      return escaparValorCSV(valor != null ? String(valor) : "");
    });
    lineas.push(valores.join(","));
  }

  return BOM + lineas.join("\r\n");
}

/**
 * Descargar contenido CSV como archivo en el navegador.
 *
 * @param {string} contenido - String CSV a descargar
 * @param {string} nombreArchivo - Nombre del archivo (debe incluir .csv)
 */
export function descargarCSV(contenido, nombreArchivo) {
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo.endsWith(".csv") ? nombreArchivo : `${nombreArchivo}.csv`;
  enlace.style.display = "none";

  document.body.appendChild(enlace);
  enlace.click();

  // Limpiar
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

// --- Funciones internas ---

/**
 * Parsear una línea CSV respetando comillas y comas dentro de valores entrecomillados.
 *
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
        // Comilla doble escapada
        if (i + 1 < linea.length && linea[i + 1] === '"') {
          valorActual += '"';
          i++; // Saltar la siguiente comilla
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

  // Agregar último valor
  valores.push(valorActual);

  return valores;
}

/**
 * Escapar un valor para CSV: envolver en comillas si contiene coma, comillas o salto de línea.
 *
 * @param {string} valor - Valor a escapar
 * @returns {string} Valor escapado para CSV
 */
function escaparValorCSV(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }
  const str = String(valor);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
