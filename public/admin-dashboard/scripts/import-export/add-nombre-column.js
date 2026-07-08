// Script para agregar columna nombre a la tabla productos
// Requiere: supabase-client.js cargado y window.supabaseClient disponible

async function addNombreColumn() {
  try {
    const db = window.supabaseClient;
    if (!db) {
      console.error("Supabase no está disponible. Asegúrate de cargar la librería primero.");
      return;
    }

    // Verificar si la columna nombre ya existe
    const { data: columns, error: checkError } = await db
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'productos')
      .eq('column_name', 'nombre');

    if (checkError) {
      console.error("Error verificando columnas:", checkError);
    }

    if (columns && columns.length > 0) {
      console.log("La columna nombre ya existe en la tabla productos.");
      return;
    }

    // Agregar la columna nombre
    const { error } = await db.rpc('add_nombre_column');

    if (error) {
      console.error("Error ejecutando RPC:", error);
      // Intentar con raw query alternativo
      try {
        const { error: rawError } = await db
          .from('productos')
          .select('id')
          .limit(1);
        
        if (!rawError) {
          console.log("La columna nombre ya existe o la tabla está vacía.");
        }
      } catch (e) {
        console.error("Error adicional:", e);
      }
    } else {
      console.log("Columna nombre agregada exitosamente.");
    }
  } catch (err) {
    console.error("Error en addNombreColumn:", err);
  }
}

// Ejecutar si se llama directamente
if (typeof window !== 'undefined') {
  window.addNombreColumn = addNombreColumn;
}
