/* ============================================================
   LIMPIAR DATOS DE PRODUCTOS — ADDBOX
   Script para eliminar duplicados del CSV de productos
============================================================ */

const fs = require('fs');
const path = require('path');

const CSV_DIR = path.join(__dirname, 'sample-data');
const INPUT_FILE = path.join(CSV_DIR, 'productos.csv');
const OUTPUT_FILE = path.join(CSV_DIR, 'productos-limpio.csv');

console.log('🧹 Limpiando datos de productos...\n');

const content = fs.readFileSync(INPUT_FILE, 'utf-8');
const lines = content.split('\n');

// Separar header del resto
const header = lines[0];
const dataLines = lines.slice(1);

// Usar un Set para rastrear códigos únicos
const seenCodes = new Set();
const uniqueLines = [];

for (const line of dataLines) {
    if (!line.trim()) continue; // Saltar líneas vacías
    
    const [codigo] = line.split(';');
    const code = codigo?.trim();
    
    if (!seenCodes.has(code)) {
        seenCodes.add(code);
        uniqueLines.push(line);
    } else {
        console.log(`Duplicado eliminado: ${code}`);
    }
}

// Crear archivo limpio
const outputContent = [header, ...uniqueLines].join('\n');
fs.writeFileSync(OUTPUT_FILE, outputContent);

console.log(`\n✅ Archivo limpio creado: ${OUTPUT_FILE}`);
console.log(`Total de productos originales: ${dataLines.length}`);
console.log(`Total de productos únicos: ${uniqueLines.length}`);
console.log(`Duplicados eliminados: ${dataLines.length - uniqueLines.length}`);