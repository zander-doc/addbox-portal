/* ============================================================
   LISTAR TABLAS — ADDBOX
   Script para listar todas las tablas y sus columnas
============================================================ */

const SUPABASE_URL = "https://billwldqxupcavzurljo.supabase.co";
const SUPABASE_KEY = "sb_publishable_riaS1JVqOgTmIXvVMcuMGQ_TLKmbqob";

async function listTables() {
    console.log('📋 Listando tablas y columnas en Supabase...\n');
    
    try {
        // Obtener todas las tablas del schema public
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc?function=get_tables`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({ schema: 'public' })
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error(`❌ Error:`, error);
            return;
        }
        
        const tables = await response.json();
        
        console.log(`✅ Total de tablas: ${tables.length}\n`);
        
        for (const table of tables) {
            console.log(`📊 Tabla: ${table.table_name}`);
            console.log(`   Columnas:`);
            
            // Obtener columnas de la tabla
            const columnsResponse = await fetch(`${SUPABASE_URL}/rest/v1/${table.table_name}?select=*`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            if (columnsResponse.ok) {
                // Obtener una fila para ver las columnas
                const data = await columnsResponse.json();
                if (data.length > 0) {
                    const columns = Object.keys(data[0]);
                    columns.forEach(col => console.log(`     - ${col}`));
                } else {
                    console.log(`     (No hay datos en la tabla)`);
                }
            } else {
                console.log(`     (Error obteniendo columnas)`);
            }
            
            console.log('');
        }
        
    } catch (error) {
        console.error('❌ Error listando tablas:', error);
    }
}

listTables();
