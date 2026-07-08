/**
 * excelExport.js
 * Utilidad para exportar datos a Excel (.xlsx) usando SheetJS (CDN global).
 * Requiere: <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
 */

/**
 * Exporta datos a un archivo Excel (.xlsx).
 * @param {string} nombreArchivo - Nombre del archivo sin extensión
 * @param {Array<object>} datos - Array de objetos con los datos
 * @param {Array<{key: string, label: string}>} columnas - Definición de columnas
 */
export function exportToExcel(nombreArchivo, datos, columnas) {
  if (typeof XLSX === "undefined") {
    throw new Error("SheetJS (XLSX) no está disponible. Asegúrate de cargar la librería.");
  }

  if (!datos || datos.length === 0) {
    throw new Error("No hay datos para exportar");
  }

  // Transformar datos según columnas definidas
  const datosFormateados = datos.map((row) => {
    const obj = {};
    columnas.forEach((col) => {
      obj[col.label] = row[col.key] ?? "";
    });
    return obj;
  });

  // Crear hoja de cálculo
  const hoja = XLSX.utils.json_to_sheet(datosFormateados);

  // Ajustar ancho de columnas automáticamente
  const anchos = columnas.map((col) => {
    const maxLen = Math.max(
      col.label.length,
      ...datosFormateados.map((row) => String(row[col.label] || "").length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  hoja["!cols"] = anchos;

  // Crear libro y agregar hoja
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Datos");

  // Descargar archivo
  XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
}

/**
 * Exporta datos a CSV con BOM UTF-8 (fallback si XLSX no está disponible).
 * @param {string} nombreArchivo - Nombre del archivo sin extensión
 * @param {Array<object>} datos - Array de objetos con los datos
 * @param {Array<{key: string, label: string}>} columnas - Definición de columnas
 */
export function exportToCSV(nombreArchivo, datos, columnas) {
  if (!datos || datos.length === 0) {
    throw new Error("No hay datos para exportar");
  }

  const headers = columnas.map((c) => c.label);
  const rows = datos.map((row) =>
    columnas.map((col) => {
      const val = row[col.key] ?? "";
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(",")
  );

  const csvContent = [headers.map(h => `"${h}"`).join(","), ...rows].join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombreArchivo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta datos al mejor formato disponible (XLSX si SheetJS cargado, CSV como fallback).
 * @param {string} nombreArchivo - Nombre del archivo sin extensión
 * @param {Array<object>} datos - Array de objetos con los datos
 * @param {Array<{key: string, label: string}>} columnas - Definición de columnas
 * @returns {string} Formato usado: "xlsx" o "csv"
 */
export function exportarDatos(nombreArchivo, datos, columnas) {
  if (typeof XLSX !== "undefined") {
    exportToExcel(nombreArchivo, datos, columnas);
    return "xlsx";
  } else {
    exportToCSV(nombreArchivo, datos, columnas);
    return "csv";
  }
}
