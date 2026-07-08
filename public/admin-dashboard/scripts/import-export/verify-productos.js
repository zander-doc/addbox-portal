/* ============================================================
   VERIFICAR PRODUCTOS — ADDBOX
   Script para verificar el conteo de productos en Supabase
============================================================ */

const SUPABASE_URL = "https://billwldqxupcavzurljo.supabase.co";
const SUPABASE_KEY = "sb_publishable_riaS1JVqOgTmIXvVMcuMGQ_TLKmbqob";

async function verifyProducts() {
    console.log('🔍 Verificando productos en Supabase...\n');
    
    try {
        // Obtener todos los productos
        let offset = 0;
        const limit = 1000;
        const allProducts = [];
        
        while (true) {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=codigo&limit=${limit}&offset=${offset}`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const error = await response.text();
                console.error(`❌ Error:`, error);
                return;
            }
            
            const products = await response.json();
            
            if (products.length === 0) break;
            
            allProducts.push(...products);
            offset += limit;
        }
        
        console.log(`✅ Total de productos en Supabase: ${allProducts.length}`);
        
        // Verificar duplicados
        const codeCounts = {};
        allProducts.forEach(p => {
            const code = p.codigo;
            codeCounts[code] = (codeCounts[code] || 0) + 1;
        });
        
        const duplicates = Object.entries(codeCounts).filter(([code, count]) => count > 1);
        
        if (duplicates.length > 0) {
            console.log(`\n⚠️  ¡Se encontraron ${duplicates.length} códigos duplicados!`);
            console.log('Primeros 10 duplicados:');
            duplicates.slice(0, 10).forEach(([code, count]) => {
                console.log(`  - ${code}: ${count} veces`);
            });
        } else {
            console.log('\n✅ No se encontraron códigos duplicados');
        }
        
    } catch (error) {
        console.error('❌ Error verificando productos:', error);
    }
}

verifyProducts();
