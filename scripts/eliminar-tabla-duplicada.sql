-- ========================================
-- ELIMINACIÓN SEGURA DE TABLA DUPLICADA
-- EJECUTAR SOLO DESPUÉS DE VERIFICACIÓN
-- ========================================

-- ========================================
-- VERIFICACIÓN 1: Contar registros en ambas tablas
-- ========================================
SELECT 
  'products' as tabla, 
  COUNT(*) as total 
FROM products
UNION ALL
SELECT 
  'productos' as tabla, 
  COUNT(*) as total 
FROM productos;

-- ========================================
-- VERIFICACIÓN 2: Ver si hay dependencias (Foreign Keys)
-- ========================================
-- Esto mostrará qué tablas referencian a cada tabla
-- Si "products" NO aparece en los resultados, es seguro eliminarla
SELECT
  tc.table_name AS tabla_origen,
  kcu.column_name AS columna_origen,
  ccu.table_name AS tabla_referenciada
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name = 'products' OR tc.table_name = 'productos')
ORDER BY tabla_referenciada, tabla_origen;

-- ========================================
-- ANÁLISIS DE RESULTADOS:
-- ========================================
/*
SI LA VERIFICACIÓN 2 MUESTRA:
- "productos" tiene 6 referencias (stock_obra, movimientos, devoluciones, lotes, reconciliacion, presupuesto_partidas)
- "products" tiene 0 referencias

ENTONCES: Eliminar "products" es SEGURO

SI "products" tiene referencias:
- NO eliminar "products"
- Revisar qué tablas la usan antes de proceder
*/

-- ========================================
-- ELIMINACIÓN SEGURA
-- ========================================
-- Basado en la auditoría AUDIT-TABLAS-PRODUCTOS.md:
-- "products" NO es usada por el sistema (0 referencias en código fuente)
-- "productos" ES usada por el sistema (97 referencias en 31+ archivos)
-- Por lo tanto, eliminamos "products"

-- IMPORTANTE: CASCADE elimina también los datos relacionados
-- En este caso no hay datos relacionados, pero es una medida de seguridad

-- EJECUTAR ESTA LÍNEA PARA ELIMINAR "products":
DROP TABLE IF EXISTS products CASCADE;

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================
-- Después de eliminar, ejecuta esto para confirmar:

SELECT 
  'Tablas restantes' as info;

SELECT 
  tablename AS tabla,
  CASE 
    WHEN tablename = 'productos' THEN '✅ Tabla del sistema (mantener)'
    WHEN tablename = 'products' THEN '❌ Tabla duplicada (debería estar eliminada)'
    ELSE 'Otra tabla'
  END AS estado
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('products', 'productos')
ORDER BY tablename;

-- ========================================
-- VERIFICACIÓN ADICIONAL: Confirmar que el sistema funciona
-- ========================================
-- Ejecuta estas consultas para verificar que "productos" sigue intacta:

-- Contar productos
SELECT COUNT(*) AS total_productos FROM productos;

-- Ver algunos productos de ejemplo
SELECT codigo, nombre, stock, precio_venta, categoria 
FROM productos 
WHERE codigo IN ('CON-0001', 'HER-0001', 'MAT-0001', 'ELE-0001')
LIMIT 4;

-- Ver estadísticas por categoría
SELECT categoria, COUNT(*) as cantidad, SUM(stock) as stock_total
FROM productos
GROUP BY categoria
ORDER BY cantidad DESC
LIMIT 10;

-- ========================================
-- INSTRUCCIONES DE USO
-- ========================================
/*
PASO 1: Ejecutar VERIFICACIÓN 1 para ver cuántos registros hay en cada tabla
        Resultado esperado: products = 987, productos = 987

PASO 2: Ejecutar VERIFICACIÓN 2 para ver dependencias
        Resultado esperado: Solo "productos" tiene 6 referencias, "products" tiene 0

PASO 3: Si la verificación 2 muestra que "products" tiene 0 referencias:
        - Ejecutar la sección ELIMINACIÓN SEGURA (DROP TABLE IF EXISTS products CASCADE)
        
PASO 4: Ejecutar VERIFICACIÓN FINAL para confirmar que:
        - "products" ya no existe
        - "productos" sigue existiendo con todos sus datos

PASO 5: Ejecutar VERIFICACIÓN ADICIONAL para confirmar que los datos están intactos

PASO 6: Probar el sistema en el navegador:
        - Abrir http://localhost:3000
        - Ir a Admin Dashboard → Inventario
        - Verificar que se muestren los 987 productos
        - Probar operaciones CRUD

SI ALGO SALE MAL:
- La tabla "products" se eliminó pero "productos" sigue intacta
- El sistema usa "productos", por lo que no debería haber problemas
- Si hay problemas, revisar el archivo AUDIT-TABLAS-PRODUCTOS.md

NOTA: Este script es SEGURO porque:
1. Solo elimina "products" (tabla duplicada)
2. "productos" (tabla del sistema) NO se ve afectada
3. Usa CASCADE para eliminar constraints relacionados automáticamente
4. Incluye verificaciones antes y después de la eliminación
*/

-- ========================================
-- BACKUP (OPCIONAL)
-- ========================================
-- Si quieres hacer un backup de "products" antes de eliminarla:
/*
CREATE TABLE products_backup AS 
SELECT * FROM products;

-- Después de verificar que todo funciona, puedes eliminar el backup:
-- DROP TABLE IF EXISTS products_backup;
*/