/* ============================================================
   LIMPIAR TABLAS — ADDBOX
   Script para eliminar todos los datos de las tablas
============================================================ */

const SUPABASE_URL = "https://billwldqxupcavzurljo.supabase.co";
const SUPABASE_KEY = "sb_publishable_riaS1JVqOgTmIXvVMcuMGQ_TLKmbqob";

const TABLES = ['movimientos', 'notificaciones', 'obras', 'productos', 'usuarios'];

async function clearTable(tableName) {
    console.log(`\n🗑️  Limpiando tabla ${tableName}...`);
    
    try {
        // Primero eliminar todos los registros
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?id=gt.0`, {
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
            console.error(`❌ Error limpiando ${tableName}:`, error);
            return false;
        }
        
        console.log(`✅ Tabla ${tableName} limpiada`);
        return true;
        
    } catch (error) {
        console.error(`❌ Error limpiando ${tableName}:`, error);
        return false;
    }
}

async function main() {
    console.log('🧹 Limpiando todas las tablas...\n');
    
    for (const table of TABLES) {
        await clearTable(table);
    }
    
    console.log('\n✅ ¡Todas las tablas se han limpiado correctamente!');
}

main();