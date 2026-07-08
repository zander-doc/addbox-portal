/**
 * ============================================================
 * ADDBOX — IMPORTAR INVENTARIO REAL COMPLETO
 * ============================================================
 * Script Node.js para importar el CSV completo del inventario real
 * directamente a Supabase usando el Service Role Key.
 * 
 * USO (desde la carpeta del servidor de Alex que ya tiene las dependencias):
 *   cd d:\alexander\arte\addbox_a5grafic\Addbox\frontend\public\src\ai\alex\server
 *   node ../../../../../../admin-dashboard/scripts/importar-inventario-real.js
 * 
 * O ALTERNATIVA (instalar dependencia local):
 *   cd d:\alexander\arte\addbox_a5grafic\Addbox\frontend\public\admin-dashboard\scripts
 *   npm init -y && npm install @supabase/supabase-js
 *   node importar-inventario-real.js
 * 
 * FECHA: 2025-05-29
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══ CONFIGURACIÓN SUPABASE ═══
const SUPABASE_URL = 'https://billwldqxupcavzurljo.supabase.co';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbGx3bGRxeHVwY2F2enVybGpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI0MDM4MiwiZXhwIjoyMDkxODE2MzgyfQ.lwQEaaYrjPa8S7w41MFzZrIiNKbNXnZdxG9wPBGZ7kU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// ═══ RUTA AL CSV ═══
// Busca el CSV en varias ubicaciones posibles
const posiblesRutas = [
  path.join(__dirname, '..', 'data', 'CSV-COMPLETO.csv'),
  path.join(__dirname, '..', 'data', 'CSV COMPLETO.csv'),
  path.join(__dirname, 'CSV-COMPLETO.csv'),
  path.join(__dirname, 'CSV COMPLETO.csv'),
];
const CSV_PATH = posiblesRutas.find(r => fs.existsSync(r)) || posiblesRutas[0];

// ═══ FECHA DE ENTRADA ═══
const FECHA_ENTRADA = '2025-05-29';
const MOTIVO_ENTRADA = 'Carga inicial de inventario real';

// ═══ FUNCIONES ═══

/**
 * Parsear línea CSV respetando comillas y punto y coma como separador
 */
function parsearLineaCSV(linea) {
  const valores = [];
  let valorActual = '';
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
      } else if (char === ';') {
        valores.push(valorActual.trim());
        valorActual = '';
      } else {
        valorActual += char;
      }
    }
  }
  valores.push(valorActual.trim());
  return valores;
}

/**
 * Leer y parsear el CSV completo
 */
function leerCSV(rutaArchivo) {
  const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
  // Remover BOM
  const textoLimpio = contenido.replace(/^\uFEFF/, '');
  const lineas = textoLimpio.split(/\r?\n/).filter(l => l.trim() !== '');

  if (lineas.length < 2) {
    throw new Error('El CSV está vacío o solo tiene encabezado');
  }

  // Encabezado
  const encabezado = parsearLineaCSV(lineas[0]);
  console.log('📋 Encabezado detectado:', encabezado.join(' | '));

  // Mapear índices
  const idx = {
    codigo: encabezado.findIndex(h => h.toUpperCase() === 'CODIGO'),
    descripcion: encabezado.findIndex(h => h.toUpperCase() === 'DESCRIPCION'),
    unidad: encabezado.findIndex(h => h.toUpperCase() === 'UNIDAD'),
    costo_bs: encabezado.findIndex(h => h.toUpperCase().includes('COSTO_PROMEDIO_BS')),
    costo_usd: encabezado.findIndex(h => h.toUpperCase().includes('COSTO_PROMEDIO_$')),
    entrada: encabezado.findIndex(h => h.toUpperCase() === 'ENTRADA'),
    salida: encabezado.findIndex(h => h.toUpperCase() === 'SALIDA'),
    existencia: encabezado.findIndex(h => h.toUpperCase() === 'EXISTENCIA'),
    categoria: encabezado.findIndex(h => h.toUpperCase() === 'CATEGORIA'),
    estado: encabezado.findIndex(h => h.toUpperCase() === 'ESTADO'),
  };

  console.log('🔍 Índices de columnas:', idx);

  const productos = [];
  const errores = [];

  for (let i = 1; i < lineas.length; i++) {
    const valores = parsearLineaCSV(lineas[i]);
    
    // Saltar líneas vacías o con pocos campos
    if (valores.length < 5 || !valores[idx.codigo]) continue;

    const codigo = valores[idx.codigo]?.trim();
    if (!codigo) continue;

    const existencia = parseFloat(valores[idx.existencia]) || 0;
    const costoUsd = parseFloat(valores[idx.costo_usd]) || 0;
    const costoBs = parseFloat(valores[idx.costo_bs]) || 0;

    productos.push({
      codigo,
      descripcion: valores[idx.descripcion]?.trim() || '',
      unidad: valores[idx.unidad]?.trim() || 'UND',
      costo_prom: costoBs,
      costo_prom_dolares: costoUsd,
      categoria: valores[idx.categoria]?.trim() || 'OTROS',
      estado: valores[idx.estado]?.trim() || 'ACTIVO',
      existencia: existencia,
      umbral_critico: 5,
      umbral_alerta: 9,
    });
  }

  console.log(`✅ Productos parseados: ${productos.length}`);
  if (errores.length > 0) {
    console.log(`⚠️  Errores de parsing: ${errores.length}`);
  }

  return productos;
}

/**
 * Insertar productos en Supabase (insert directo, borra existentes primero)
 */
async function insertarProductos(productos) {
  console.log('\n📦 Insertando productos en Supabase...');
  
  // Primero verificar si hay productos existentes
  const { count } = await supabase.from('productos').select('*', { count: 'exact', head: true });
  if (count > 0) {
    console.log(`  ⚠️  Ya existen ${count} productos. Insertando sin duplicar...`);
  }

  const LOTE = 50;
  let insertados = 0;
  let errores = 0;

  for (let i = 0; i < productos.length; i += LOTE) {
    const lote = productos.slice(i, i + LOTE).map(p => ({
      codigo: p.codigo,
      descripcion: p.descripcion,
      unidad: p.unidad,
      costo_prom: p.costo_prom,
      costo_prom_dolares: p.costo_prom_dolares,
      categoria: p.categoria,
      estado: p.estado.toLowerCase(),
      existencia: p.existencia,
      stock: Math.floor(p.existencia),
      umbral_critico: p.umbral_critico,
      umbral_alerta: p.umbral_alerta,
    }));

    const { data, error } = await supabase
      .from('productos')
      .insert(lote)
      .select('id, codigo');

    if (error) {
      // Si falla por duplicado, intentar uno por uno
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        for (const item of lote) {
          const { data: d2, error: e2 } = await supabase
            .from('productos')
            .insert(item)
            .select('id, codigo');
          if (!e2) insertados++;
        }
      } else {
        console.error(`  ❌ Error en lote ${Math.floor(i/LOTE)+1}:`, error.message);
        errores += lote.length;
      }
    } else {
      insertados += data?.length || lote.length;
      process.stdout.write(`  ✓ Lote ${Math.floor(i/LOTE)+1}/${Math.ceil(productos.length/LOTE)} (${insertados} productos)\r`);
    }
  }

  console.log(`\n✅ Productos insertados: ${insertados}`);
  if (errores > 0) console.log(`❌ Errores: ${errores}`);
  
  return insertados;
}

/**
 * Crear movimientos de entrada para productos con existencia > 0
 */
async function crearMovimientosEntrada(productos) {
  console.log('\n📥 Creando movimientos de entrada...');

  // Obtener IDs de productos desde Supabase
  const { data: productosDB, error: errProd } = await supabase
    .from('productos')
    .select('id, codigo');

  if (errProd) {
    console.error('❌ Error obteniendo productos:', errProd.message);
    return;
  }

  // Crear mapa código → id
  const mapaIds = {};
  productosDB.forEach(p => { mapaIds[p.codigo] = p.id; });

  // Filtrar solo productos con existencia > 0
  const conExistencia = productos.filter(p => p.existencia > 0 && mapaIds[p.codigo]);
  console.log(`  📊 Productos con existencia > 0: ${conExistencia.length}`);

  const LOTE = 50;
  let creados = 0;
  let errores = 0;

  for (let i = 0; i < conExistencia.length; i += LOTE) {
    const lote = conExistencia.slice(i, i + LOTE).map(p => ({
      producto_id: mapaIds[p.codigo],
      tipo: 'entrada',
      cantidad: p.existencia,
      fecha: FECHA_ENTRADA,
      motivo: MOTIVO_ENTRADA,
      observacion: `Carga inicial: ${p.existencia} ${p.unidad} @ $${p.costo_prom_dolares}`,
    }));

    const { data, error } = await supabase
      .from('movimientos')
      .insert(lote)
      .select('id');

    if (error) {
      console.error(`  ❌ Error en lote movimientos ${Math.floor(i/LOTE)+1}:`, error.message);
      errores += lote.length;
    } else {
      creados += data?.length || lote.length;
      process.stdout.write(`  ✓ Movimientos: ${creados}/${conExistencia.length}\r`);
    }
  }

  console.log(`\n✅ Movimientos de entrada creados: ${creados}`);
  if (errores > 0) console.log(`❌ Errores: ${errores}`);
}

/**
 * Actualizar campo existencia en la tabla productos
 */
async function actualizarExistencias(productos) {
  console.log('\n📊 Actualizando existencias en tabla productos...');

  const LOTE = 50;
  let actualizados = 0;

  for (let i = 0; i < productos.length; i += LOTE) {
    const lote = productos.slice(i, i + LOTE);
    
    for (const p of lote) {
      const { error } = await supabase
        .from('productos')
        .update({ existencia: p.existencia, stock: Math.floor(p.existencia) })
        .eq('codigo', p.codigo);

      if (!error) actualizados++;
    }
    
    process.stdout.write(`  ✓ Actualizados: ${actualizados}/${productos.length}\r`);
  }

  console.log(`\n✅ Existencias actualizadas: ${actualizados}`);
}

// ═══ EJECUCIÓN PRINCIPAL ═══
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  ADDBOX — IMPORTACIÓN INVENTARIO REAL');
  console.log('  Fecha: ' + FECHA_ENTRADA);
  console.log('═══════════════════════════════════════════════════\n');

  // 1. Verificar que el CSV existe
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ No se encontró el archivo CSV.`);
    console.log('   Rutas buscadas:');
    posiblesRutas.forEach(r => console.log(`   - ${r}`));
    console.log('\n   Copia tu archivo "CSV COMPLETO.csv" a una de esas rutas.');
    process.exit(1);
  }

  console.log(`📄 CSV encontrado: ${CSV_PATH}`);

  // 2. Leer y parsear CSV
  const productos = leerCSV(CSV_PATH);

  // 3. Insertar productos
  await insertarProductos(productos);

  // 4. Crear movimientos de entrada
  await crearMovimientosEntrada(productos);

  // 5. Actualizar existencias
  await actualizarExistencias(productos);

  // 6. Resumen final
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  ✅ IMPORTACIÓN COMPLETADA');
  console.log(`  📦 Productos: ${productos.length}`);
  console.log(`  📥 Con existencia: ${productos.filter(p => p.existencia > 0).length}`);
  console.log(`  📅 Fecha entrada: ${FECHA_ENTRADA}`);
  console.log('═══════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('\n❌ Error fatal:', err.message);
  process.exit(1);
});
