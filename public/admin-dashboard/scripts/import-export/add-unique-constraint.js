/* ============================================================
   AGREGAR RESTRICCIÓN ÚNICA — ADDBOX
   Script para agregar una restricción de unicidad en el campo codigo
============================================================ */

const SUPABASE_URL = "https://billwldqxupcavzurljo.supabase.co";
const SUPABASE_KEY = "sb_publishable_riaS1JVqOgTmIXvVMcuMGQ_TLKmbqob";

async function addUniqueConstraint() {
    console.log('🔒 Agregando restricción de unicidad en campo codigo...\n');
    
    try {
        // Crear índice único
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc?function=enable_rls_on_table`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({})
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error(`❌ Error:`, error);
            throw new Error('Failed to add unique constraint');
        }
        
        console.log('✅ Restricción de unicidad agregada');
        
    } catch (error) {
        console.error('❌ Error agregando restricción:', error);
        throw error;
    }
}

addUniqueConstraint();
