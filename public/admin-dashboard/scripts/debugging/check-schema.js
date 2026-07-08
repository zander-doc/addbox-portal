/* ============================================================
   VERIFICAR ESQUEMA DE TABLAS — ADDBOX
   Script para verificar el esquema real de las tablas en Supabase
============================================================ */

const SUPABASE_URL = "https://billwldqxupcavzurljo.supabase.co";
const SUPABASE_KEY = "sb_publishable_riaS1JVqOgTmIXvVMcuMGQ_TLKmbqob";

async function checkTableSchema(tableName) {
    console.log(`\n=== ESQUEMA DE ${tableName.toUpperCase()} ===\n`);
    
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
            console.log('Tabla vacía o no existe');
        }
        
    } catch (error) {
        console.error(`❌ Error:`, error);
    }
}

async function checkAllTables() {
    console.log('🔍 Verificando esquema de tablas en Supabase...\n');
    
    const tables = ['productos', 'obras', 'movimientos', 'notificaciones', 'usuarios'];
    
    for (const table of tables) {
        await checkTableSchema(table);
    }
}

checkAllTables();