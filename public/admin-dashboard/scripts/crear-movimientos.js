/**
 * Crear movimientos de entrada para productos con existencia > 0
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://billwldqxupcavzurljo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbGx3bGRxeHVwY2F2enVybGpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI0MDM4MiwiZXhwIjoyMDkxODE2MzgyfQ.lwQEaaYrjPa8S7w41MFzZrIiNKbNXnZdxG9wPBGZ7kU'
);

async function main() {
  console.log('📥 Obteniendo productos con existencia > 0...');

  // Obtener todos los productos (paginado porque son 987)
  let allProds = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('productos')
      .select('id, codigo, existencia, costo_prom_dolares, unidad')
      .range(from, from + pageSize - 1);
    
    if (error) { console.error('Error:', error.message); break; }
    if (!data || data.length === 0) break;
    allProds = allProds.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`  Total productos en DB: ${allProds.length}`);

  const conExistencia = allProds.filter(p => p.existencia > 0);
  console.log(`  Con existencia > 0: ${conExistencia.length}`);

  if (conExistencia.length === 0) {
    console.log('❌ No hay productos con existencia > 0');
    return;
  }

  // Crear movimientos en lotes
  const LOTE = 50;
  let creados = 0;
  let errores = 0;

  for (let i = 0; i < conExistencia.length; i += LOTE) {
    const lote = conExistencia.slice(i, i + LOTE).map(p => ({
      producto_id: p.id,
      tipo: 'entrada',
      cantidad: Math.floor(p.existencia),
      motivo: 'Carga inicial inventario real',
      observacion: `${p.existencia} ${p.unidad} @ $${p.costo_prom_dolares || 0} - Fecha: 2025-05-29`,
    }));

    const { data, error } = await supabase
      .from('movimientos')
      .insert(lote)
      .select('id');

    if (error) {
      console.error(`  ❌ Lote ${Math.floor(i/LOTE)+1}: ${error.message}`);
      errores++;
    } else {
      creados += data.length;
      process.stdout.write(`  ✓ ${creados}/${conExistencia.length}\r`);
    }
  }

  console.log(`\n\n✅ Movimientos de entrada creados: ${creados}`);
  if (errores > 0) console.log(`❌ Lotes con error: ${errores}`);
}

main().catch(e => console.error('Fatal:', e.message));
