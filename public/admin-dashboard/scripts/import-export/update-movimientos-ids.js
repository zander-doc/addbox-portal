/* ============================================================
   ACTUALIZAR IDS EN MOVIMIENTOS — ADDBOX
   Script para actualizar los producto_id en movimientos.csv con UUIDs reales
============================================================ */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://billwldqxupcavzurljo.supabase.co";
const SUPABASE_KEY = "sb_publishable_riaS1JVqOgTmIXvVMcuMGQ_TLKmbqob";

const CSV_DIR = path.join(__dirname, 'sample-data');
const INPUT_FILE = path.join(CSV_DIR, 'movimientos.csv');
const OUTPUT_FILE = path.join(CSV_DIR, 'movimientos-updated.csv');

// Mapeo de código a UUID
const codigoToId = new Map();

async function fetchProductIds() {
    console.log('Fetching product IDs from Supabase...\n');
    
    let offset = 0;
    const limit = 1000;
    
    while (true) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=codigo,id&limit=${limit}&offset=${offset}`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error(`❌ Error obteniendo productos:`, error);
            throw new Error('Failed to fetch products');
        }
        
        const products = await response.json();
        
        if (products.length === 0) break;
        
        for (const product of products) {
            if (product.codigo) {
                codigoToId.set(product.codigo, product.id);
            }
        }
        
        offset += limit;
        console.log(`Obtenidos ${codigoToId.size} productos...`);
    }
}

async function updateMovimientos() {
    console.log('\nUpdating movimientos.csv with UUIDs...\n');
    
    const content = fs.readFileSync(INPUT_FILE, 'utf-8');
    const lines = content.split('\n');
    
    // Separar header del resto
    const header = lines[0];
    const dataLines = lines.slice(1);
    
    const updatedLines = [header];
    
    for (const line of dataLines) {
        if (!line.trim()) continue;
        
        const [cantidad, tipo, creado_en, sitio, producto_id] = line.split(',');
        
        // Buscar el UUID correspondiente al producto_id
        const productId = codigoToId.get(producto_id?.trim());
        
        if (productId) {
            updatedLines.push(`${cantidad},${tipo},${creado_en},${sitio},${productId}`);
        } else {
            console.log(`⚠️  Producto con código ${producto_id} no encontrado`);
            updatedLines.push(line); // Mantener el original
        }
    }
    
    const outputContent = updatedLines.join('\n');
    fs.writeFileSync(OUTPUT_FILE, outputContent);
    
    console.log(`\n✅ Archivo actualizado: ${OUTPUT_FILE}`);
}

async function main() {
    await fetchProductIds();
    await updateMovimientos();
}

main();