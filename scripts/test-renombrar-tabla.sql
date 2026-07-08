-- ========================================
-- PRUEBA DE RENOMBRADO SEGURO
-- ========================================
-- Este script permite probar si el sistema funciona
-- sin la tabla "products" antes de eliminarla
-- ========================================

-- PASO 1: Verificar que AMBAS tablas existen
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
-- IMPORTANTE: Ejecuta los siguientes pasos
-- MANUALMENTE desde Neon SQL Editor
-- ========================================

-- PASO 2: Renombrar TEMPORALMENTE "productos" a "productos_backup"
-- (Esto NO elimina datos, solo cambia el nombre)
-- DESCOMENTA LA SIGUIENTE LÍNEA PARA EJECUTAR:
-- ALTER TABLE productos RENAME TO productos_backup;

-- ========================================
-- PASO 3: Probar el sistema
-- ========================================
-- El usuario debe probar:
-- 1. Abrir dashboard en: http://localhost:3000
-- 2. Navegar a: Admin Dashboard → Inventario
-- 3. Verificar que se muestren los productos
-- 4. Probar crear/editar/eliminar productos
-- 5. Probar movimientos de entrada/salida
-- 6. Verificar reportes
--
-- SI FUNCIONA → "productos_backup" NO se usa → se puede eliminar
-- SI FALLA → "productos_backup" SÍ se usa → restaurar

-- ========================================
-- PASO 4: Si el sistema funciona, eliminar definitivamente
-- ========================================
-- DESCOMENTA LAS SIGUIENTES LÍNEAS SI TODO FUNCIONA:
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS productos_backup CASCADE;

-- ========================================
-- PASO 5: Si el sistema falla, restaurar
-- ========================================
-- DESCOMENTA LA SIGUIENTE LÍNEA SI HAY PROBLEMAS:
-- ALTER TABLE productos_backup RENAME TO productos;

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================
-- Después de probar, ejecuta esto para ver el estado:
SELECT 
  'Estado actual de tablas' as info;
  
SELECT 
  table_name as tabla,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name AND table_schema = 'public') as columnas
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('products', 'productos', 'productos_backup')
ORDER BY table_name;

-- ========================================
-- INSTRUCCIONES DE USO
-- ========================================
/*
1. Abre Neon Dashboard: https://console.neon.tech
2. Selecciona tu proyecto
3. Ve a "SQL Editor"
4. Copia y pega este script
5. Ejecuta el PASO 1 para ver el estado actual
6. Ejecuta el PASO 2 para renombrar (descomenta la línea)
7. Prueba el sistema en el navegador
8. Si funciona → Ejecuta PASO 4 para eliminar
9. Si falla → Ejecuta PASO 5 para restaurar
10. Ejecuta la VERIFICACIÓN FINAL

NOTA: Solo descomenta UNA sección a la vez
*/