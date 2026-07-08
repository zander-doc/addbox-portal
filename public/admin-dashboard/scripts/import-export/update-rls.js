/* ============================================================
   ACTUALIZAR POLÍTICAS RLS — ADDBOX
   Script para actualizar las políticas RLS usando la API de Supabase
============================================================ */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://billwldqxupcavzurljo.supabase.co";
const SUPABASE_KEY = "sb_publishable_riaS1JVqOgTmIXvVMcuMGQ_TLKmbqob";

const SQL_FILE = path.join(__dirname, 'update-rls-policies.sql');

console.log('🔄 Actualizando políticas RLS...\n');

const sqlContent = fs.readFileSync(SQL_FILE, 'utf-8');

// Dividir el SQL en statements individuales
const statements = sqlContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

console.log(`Total de statements a ejecutar: ${statements.length}\n`);

async function executeStatement(statement) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ sql: statement })
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error(`❌ Error ejecutando statement:`, error);
            return false;
        }
        
        console.log('✅ Statement ejecutado correctamente');
        return true;
        
    } catch (error) {
        console.error(`❌ Error ejecutando statement:`, error);
        return false;
    }
}

async function main() {
    let successCount = 0;
    let failCount = 0;
    
    for (const statement of statements) {
        console.log(`Ejecutando: ${statement.substring(0, 50)}...`);
        if (await executeStatement(statement)) {
            successCount++;
        } else {
            failCount++;
        }
        console.log();
    }
    
    console.log(`\n✅ Total exitosos: ${successCount}`);
    console.log(`❌ Total fallidos: ${failCount}`);
    
    if (failCount > 0) {
        console.log('\n⚠️  Algunos statements fallaron. Revisa los errores arriba.');
        process.exit(1);
    } else {
        console.log('\n✅ ¡Todas las políticas RLS se han actualizado correctamente!');
    }
}

main();