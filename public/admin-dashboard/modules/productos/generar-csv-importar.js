/**
 * Script para generar el CSV de importación con categorías asignadas automáticamente.
 * Ejecutar con: node generar-csv-importar.js
 */
const fs = require("fs");
const path = require("path");

// Leer el CSV original
const inputPath = path.join(__dirname, "inventario-completo.csv");

// Si no existe el archivo original, usar los datos embebidos
let lines;
try {
  const raw = fs.readFileSync(inputPath, "utf8");
  lines = raw.split(/\r?\n/).filter(l => l.trim());
} catch (e) {
  console.error("No se encontró inventario-completo.csv. Colócalo en la misma carpeta.");
  process.exit(1);
}

// Parsear encabezado
const header = lines[0].split(",").map(h => h.trim());
const iCodigo = header.indexOf("Codigo");
const iDesc = header.indexOf("Descripcion");
const iCosto = header.indexOf("Costo_Promedio");
const iStock = header.indexOf("Existencia_Final_Unidades");

if (iCodigo === -1 || iDesc === -1) {
  console.error("No se encontraron las columnas Codigo y Descripcion");
  process.exit(1);
}

// Función para parsear una línea CSV respetando comillas
function parseLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

// Reglas de categorización
function asignarCategoria(desc) {
  const d = desc.toUpperCase();

  // Herramientas
  if (/ALICATE|DESTORNILLADOR|MARTILLO|SIERRA|TALADRO|NIVEL|ESPATULA|PRENSA|TENAZA|PINZA|CAUTIN|PALA |PALA$|PIQUETA|MACHETE|BARRA[S ]|HACHA|MANDARRIA|CUCHARA|PALUSTRA|RASTRILLO|ESMERIL|CALADORA|LIJADORA|TROZADORA|REMACHADORA|SEGUETA|LIMA[S ]|FORMON|CORTAVIDRIO|ESCUADRA|TIJERA|MARCO DE SEGUETA|VIBRADOR|DOBLA TUBO|MOTOSIERRA|HIDROJET|PODADORA|ASPIRADORA|COMPRESOR|ESCALERA|GRAPADORA|SACA BUJIA|BATIDORA|RANA COMPACTADORA|MAQUINA.?DE SOLDAR|SEÑORITA|PATA DE CABRA|ARNES|CORTADORA|BANDEJA.?RODILLO|ESQUELETO.?RODILLO|EXTENSION.?RODILLO|CEPILLO|PISTOLA|RODILLO.*(GRANDE|PEQUEÑ|USAD|NUEV)|ESTRUCTURA DE RODILLO/.test(d)) {
    // Excluir si es pintura-related
    if (/PINTURA|BARNIZ|LACA|ESMALTE|SELLADOR|THINNER|TINTA|DEKORAL|LOXON|MONTAFIX|SOFITO|CROMATO|FONDO ANTICORROSIVO|EPOMOM|POLIURETANO|COBERTEX|IMPERMEABILIZANTE|ELASTOMERICA|SPRAY|STUC KOLOR|PASTA PROFESIONAL/.test(d)) {
      return "Pintura";
    }
    return "Herramientas";
  }

  // Electricidad
  if (/CABLE|CONDUCTOR|CONECTOR(?! BNC)|ADAPTADOR|ANTENA|ARDUINO|BORNE|ETHERNET|HDMI|VGA|USB|NVR|DVR|CAMARA|WIFI|GSM|BNC|BOMBILLO|LAMPARA|REFLECTOR|BREAKER|BALASTRO|DRIVER|APAGADOR|TOMA.?CORRIENTE|ENCHUFE|FOTOCELDA|SENSOR|ALARMA|CINTA LED|PANEL LED|ROUTER|ELECTROD|CAJETIN|TUBO.*(ELECTRICIDAD|EMT|METAL)|CURVA.*(EMT|METAL|PLASTICA)|ANILLO.*(EMT|\d)|TAPA CIEGA|CANALETA|REGLETA|SIRENA|CONTACTOR|CONDENSADOR|CERCHA|BANDEJAS? PORTA|CONECTOR.*(EMT|MACHO|PRESION|RJ45)|ROCETA/.test(d)) {
    return "Electricidad";
  }

  // Plomería
  if (/CODO PVC|TUBO PVC|TUBO.?AGUA|VALVULA|TEFLON|ABRAZADERA|REDUCCION|UNION PVC|TEE.*(A\/F|PVC|\d)|NIPLE|SIFON|DESAGUE|CANILLA|REGILLA|BOLLA|BRAZO DE DUCHA|FREGADERO|GRIFERIA|BOMBA.*(SUMERGIBLE|1\/2 HP)|COLADOR DE ENTRADA|FILTRO.*(ATLAS|SECADOR)|MANGUERA.*(RIEGO|NIVEL)|REGADERA/.test(d)) {
    return "Plomeria";
  }

  // Pintura
  if (/PINTURA|BARNIZ|LACA|ESMALTE|SELLADOR|THINNER|TINTA|DEKORAL|LOXON|MONTAFIX|SOFITO|CROMATO|FONDO ANTICORROSIVO|EPOMOM|POLIURETANO|COBERTEX|IMPERMEABILIZANTE|ELASTOMERICA|SPRAY|STUC KOLOR|PASTA PROFESIONAL|END ZONE|ZONE PERFECT|PARQUET SATINADO|BRILLO DE SEDA|MONTADUR|PEGA.*(SOLD|AMARILLA|COLA)|SILICON.*(ANTI|TRASPAR)|MASILLA|PUTTY/.test(d)) {
    return "Pintura";
  }

  // Consumibles
  if (/CINTA ADHESIVA|CINTA MASKING|TIRRO|LIJA[S ]|LANILLA|GUANTE|LENTE.?DE|CASCO[S ]|TAPA.?OIDO|BOLSA[S ]|CLAVO[S ]|TORNILLO|RAMPLUS|REMACHE|GRAPA[S ]|TEIPE|DISCO.*(CORTE|FLAP|MORADO|SIERRA|TRONZADORA)|MECHA[S ]|ESTAÑO|CALIBRE|OMEGA[S ]|TACHUELA|MANTO|CERAMICA|CEMENTO|ARENA|YESO|PIEDRA|POLVILLO|SACO[S ]|FERTILIZANTE|BISAGRA|CERRADURA|CERROJO|TIRADOR|PASADOR|VISAGRA|CAMISA.*(NEGRA|RODILLO)|BRAGA|LANILLA|PAÑO|LIMPIA|DESENGRASANTE|CLORO|AMBIENTADOR|DISPENSADOR/.test(d)) {
    return "Consumibles";
  }

  return "Materiales";
}

// Escapar valor CSV
function escCSV(val) {
  if (!val) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// Procesar filas
const output = ["codigo,descripcion,categoria,costo,stock"];
const seen = new Set();

for (let i = 1; i < lines.length; i++) {
  const values = parseLine(lines[i]);
  const codigo = (values[iCodigo] || "").trim();
  const descripcion = (values[iDesc] || "").trim();
  
  if (!codigo && !descripcion) continue;
  
  // Evitar duplicados por código
  if (seen.has(codigo)) continue;
  seen.add(codigo);

  let costo = (values[iCosto] || "").trim();
  if (!costo || costo === "-" || costo === "##########") costo = "0";
  costo = parseFloat(costo.replace(",", ".")) || 0;

  let stock = (values[iStock] || "").trim();
  stock = Math.round(parseFloat(stock) || 0);

  const categoria = asignarCategoria(descripcion);

  output.push(`${escCSV(codigo)},${escCSV(descripcion)},${categoria},${costo},${stock}`);
}

// Escribir archivo
const outputPath = path.join(__dirname, "inventario-importar.csv");
fs.writeFileSync(outputPath, output.join("\n"), "utf8");

console.log(`✅ Archivo generado: inventario-importar.csv`);
console.log(`   Total productos: ${output.length - 1}`);

// Contar por categoría
const cats = {};
output.slice(1).forEach(line => {
  const parts = line.split(",");
  const cat = parts[2];
  cats[cat] = (cats[cat] || 0) + 1;
});
console.log("\n📊 Distribución por categoría:");
Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`   ${cat}: ${count}`);
});
