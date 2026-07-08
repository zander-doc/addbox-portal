/* ============================================================
   LIMPIAR PRODUCTOS — ADDBOX
   Script para eliminar todos los datos de la tabla productos
============================================================ */

const SUPABASE_URL = "https://billwldqxupcavzurljo.supabase.co";
const SUPABASE_KEY = "sb_publishable_riaS1JVqOgTmIXvVMcuMGQ_TLKmbqob";

async function clearProducts() {
    console.log('\n🗑️  Limpiando tabla de productos...');
    
    try {
        // Primero obtener todos los IDs
        console.log('Obteniendo IDs de productos...');
        let offset = 0;
        const limit = 1000;
        const allIds = [];
        
        while (true) {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=id&limit=${limit}&offset=${offset}`, {
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
            
            allIds.push(...products.map(p => p.id));
            offset += limit;
        }
        
        console.log(`Total de productos a eliminar: ${allIds.length}`);
        
        // Eliminar en lotes de 100
        const BATCH_SIZE = 100;
        const batches = Math.ceil(allIds.length / BATCH_SIZE);
        
        for (let batch = 0; batch < batches; batch++) {
            const start = batch * BATCH_SIZE;
            const end = start + BATCH_SIZE;
            const batchIds = allIds.slice(start, end);
            
            console.log(`\nBATCH ${batch + 1}/${batches}: Eliminando ${batchIds.length} productos...`);
            
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=in.(${batchIds.join(',')})`, {
                    method: 'DELETE',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    }
                });
                
                if (!response.ok) {
                    const error = await response.text();
                    console.error(`❌ Error en batch ${batch + 1}:`, error);
                    throw new Error(`Failed to delete batch ${batch + 1}`);
                }
                
                console.log(`✅ Batch ${batch + 1} eliminado correctamente`);
                
            } catch (error) {
                console.error(`❌ Error eliminando batch ${batch + 1}:`, error);
                throw error;
            }
        }
        
        console.log('✅ Tabla de productos limpiada');
        
    } catch (error) {
        console.error('❌ Error limpiando productos:', error);
        throw error;
    }
}

async function main() {
    console.log('🔄 Limpiando productos en Supabase...\n');
    
    try {
        await clearProducts();
        console.log('\n✅ ¡PRODUCTOS LIMPIADOS CORRECTAMENTE!');
    } catch (error) {
        console.error('\n❌ Error durante la limpieza:', error);
        process.exit(1);
    }
}

main();
