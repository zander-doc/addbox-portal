/* ============================================================
   DESCRIBIR TABLA MOVIMIENTOS — ADDBOX
   Script para describir el esquema real de la tabla movimientos
============================================================ */

const SUPABASE_URL = "https://billwldqxupcavzurljo.supabase.co";
const SUPABASE_KEY = "sb_publishable_riaS1JVqOgTmIXvVMcuMGQ_TLKmbqob";

async function describeTable(tableName) {
    console.log(`\n=== DESCRIBIENDO TABLA ${tableName.toUpperCase()} ===\n`);
    
    try {
        // Hacer una consulta LIMIT 1 para ver las columnas
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?limit=1`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.log(`❌ Error:`, error);
            return;
        }
        
        const result = await response.json();
        
        if (result.length > 0) {
            console.log('Columnas encontradas:');
            console.log(Object.keys(result[0]));
        } else {
            console.log('Tabla vacía. Intentando obtener esquema...');
            
            // Intentar obtener el esquema desde information_schema
            const schemaResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_table_metadata`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ table_name: tableName })
            });
            
            if (!schemaResponse.ok) {
                console.log(`❌ Error obteniendo esquema:`, await schemaResponse.text());
                return;
            }
            
            const schema = await schemaResponse.json();
            console.log('Esquema:', JSON.stringify(schema, null, 2));
        }
        
    } catch (error) {
        console.error(`❌ Error:`, error);
    }
}

describeTable('movimientos');