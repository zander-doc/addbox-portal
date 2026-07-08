import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import csv from 'csv-parser';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Ruta del archivo CSV
const CSV_PATH = 'D:\\alexander\\arte\\addbox_a5grafic\\Addbox\\frontend\\ADDBOX_SISTEM\\INVENTARIO_LIMPIO_SENIAT.csv';

// Conexión a Neon
const sql = neon(process.env.NEON_DATABASE_URL);

const productos = [];
let errores = 0;
let lineasSaltadas = 0;

console.log('📖 Leyendo archivo CSV...\n');
console.log(`📍 Ruta: ${CSV_PATH}\n`);

fs.createReadStream(CSV_PATH, { encoding: 'utf-8' })
  .pipe(csv({ separator: ';' }))
  .on('data', (row) => {
    try {
      // Validar que tenga código y descripción
      if (!row.CODIGO || !row.DESCRIPCION) {
        lineasSaltadas++;
        return;
      }

      const producto = {
        codigo: row.CODIGO.trim(),
        sku: row.CODIGO.trim(),
        nombre: row.DESCRIPCION.trim(),
        descripcion: row.DESCRIPCION.trim(),
        unidad: row.UNIDAD?.trim() || 'UND',
        categoria: row.CATEGORIA?.trim() || 'GENERAL',
        precio: parseFloat(row.COSTO_PROMEDIO_$) || 0,
        costo_bs: parseFloat(row.COSTO_PROMEDIO_BS) || 0,
        stock: parseInt(row.EXISTENCIA) || 0,
        entrada: parseInt(row.ENTRADA) || 0,
        salida: parseInt(row.SALIDA) || 0,
        estado: row.ESTADO?.trim() || 'ACTIVO',
        created_at: new Date().toISOString()
      };

      // Validar datos mínimos
      if (producto.codigo && producto.nombre) {
        productos.push(producto);
      } else {
        lineasSaltadas++;
      }
    } catch (error) {
      console.error(`❌ Error procesando línea:`, error.message);
      errores++;
    }
  })
  .on('end', async () => {
    console.log('✅ CSV leído correctamente\n');
    console.log(`📦 Total de productos válidos: ${productos.length}`);
    console.log(`⚠️  Líneas saltadas/inválidas: ${lineasSaltadas}`);
    console.log(`⚠️  Errores de procesamiento: ${errores}\n`);

    if (productos.length === 0) {
      console.log('❌ No hay productos para importar');
      process.exit(1);
    }

    try {
      console.log('🚀 Iniciando importación a Neon...\n');

      // Verificar conexión
      const testResult = await sql`SELECT 1 as test`;
      console.log('✅ Conexión a Neon verificada');

      // Verificar cuántos productos existen actualmente
      const countResult = await sql`SELECT COUNT(*) as total FROM productos`;
      const totalActual = parseInt(countResult[0].total);
      console.log(`📊 Productos actuales en BD: ${totalActual}\n`);

      // Insertar en lotes de 100 para mejor rendimiento
      const batchSize = 100;
      let insertados = 0;
      let actualizados = 0;
      let erroresInsert = 0;

      for (let i = 0; i < productos.length; i += batchSize) {
        const batch = productos.slice(i, i + batchSize);
        const numeroLote = Math.floor(i / batchSize) + 1;
        const totalLotes = Math.ceil(productos.length / batchSize);

        console.log(`\n🔄 Procesando lote ${numeroLote}/${totalLotes} (${batch.length} productos)...`);

        for (const producto of batch) {
          try {
            // Intentar insertar, si existe el SKU, actualizar
            const result = await sql`
              INSERT INTO productos (
                codigo, sku, nombre, descripcion, unidad, categoria,
                precio, costo_bs, stock, entrada, salida, estado, created_at
              ) VALUES (
                ${producto.codigo},
                ${producto.sku},
                ${producto.nombre},
                ${producto.descripcion},
                ${producto.unidad},
                ${producto.categoria},
                ${producto.precio},
                ${producto.costo_bs},
                ${producto.stock},
                ${producto.entrada},
                ${producto.salida},
                ${producto.estado},
                ${producto.created_at}
              )
              ON CONFLICT (sku) DO UPDATE SET
                stock = EXCLUDED.stock,
                precio = EXCLUDED.precio,
                costo_bs = EXCLUDED.costo_bs,
                entrada = EXCLUDED.entrada,
                salida = EXCLUDED.salida,
                updated_at = NOW()
              RETURNING id
            `;

            if (result.length > 0) {
              insertados++;
            } else {
              actualizados++;
            }

            // Mostrar progreso cada 100 productos
            if ((insertados + actualizados) % 100 === 0) {
              console.log(`   ⏳ Progreso: ${insertados + actualizados}/${productos.length} productos procesados`);
            }

          } catch (error) {
            console.error(`   ❌ Error con producto ${producto.codigo}:`, error.message);
            erroresInsert++;
          }
        }
      }

      console.log('\n' + '='.repeat(70));
      console.log('🎉 ¡IMPORTACIÓN COMPLETADA!');
      console.log('='.repeat(70));
      console.log(`✅ Productos insertados: ${insertados}`);
      console.log(`🔄 Productos actualizados: ${actualizados}`);
      console.log(`❌ Errores en inserción: ${erroresInsert}`);

      // Verificación final
      const finalResult = await sql`SELECT COUNT(*) as total FROM productos`;
      console.log(`📊 Total en base de datos: ${finalResult[0].total}`);

      // Mostrar algunos ejemplos
      const ejemplos = await sql`
        SELECT codigo, nombre, stock, precio, categoria 
        FROM productos 
        ORDER BY created_at DESC 
        LIMIT 10
      `;

      console.log('\n📋 Últimos 10 productos importados:');
      ejemplos.forEach(p => {
        console.log(`   • ${p.codigo} - ${p.nombre}`);
        console.log(`     Stock: ${p.stock}, Precio: $${p.precio}, Categoría: ${p.categoria}`);
      });

      // Mostrar estadísticas por categoría
      const statsCategoria = await sql`
        SELECT categoria, COUNT(*) as cantidad, SUM(stock) as stock_total
        FROM productos
        GROUP BY categoria
        ORDER BY cantidad DESC
        LIMIT 10
      `;

      console.log('\n📊 Top 10 categorías por cantidad de productos:');
      statsCategoria.forEach(c => {
        console.log(`   • ${c.categoria}: ${c.cantidad} productos (Stock total: ${c.stock_total})`);
      });

      console.log('\n✨ Proceso finalizado correctamente');

    } catch (error) {
      console.error('\n❌ Error fatal en la importación:', error);
      console.error('Detalles:', error.message);
      process.exit(1);
    }
  })
  .on('error', (error) => {
    console.error('❌ Error leyendo el CSV:', error.message);
    console.error('Verifica que el archivo exista en la ruta especificada');
    process.exit(1);
  });