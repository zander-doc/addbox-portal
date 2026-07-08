-- ============================================================
-- SCRIPT PARA LIMPIAR LA TABLA PRODUCTOS
-- ============================================================

-- 1. Verificar la estructura actual
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'productos'
ORDER BY ordinal_position;

-- 2. Verificar si hay columnas duplicadas
SELECT 
  column_name,
  COUNT(*) as count
FROM information_schema.columns
WHERE table_name = 'productos'
GROUP BY column_name
HAVING COUNT(*) > 1;

-- 3. Si hay columnas duplicadas, eliminarlas
-- Descomentar las líneas según sea necesario

-- Eliminar columna id (integer) si existe
-- ALTER TABLE productos DROP COLUMN IF EXISTS id;

-- Eliminar columnas duplicadas
-- ALTER TABLE productos DROP COLUMN IF EXISTS nombre;
-- ALTER TABLE productos DROP COLUMN IF EXISTS codigo;
-- ALTER TABLE productos DROP COLUMN IF EXISTS ubicacion;
-- ALTER TABLE productos DROP COLUMN IF EXISTS unidad;
-- ALTER TABLE productos DROP COLUMN IF EXISTS estado;
-- ALTER TABLE productos DROP COLUMN IF EXISTS categoria;
-- ALTER TABLE productos DROP COLUMN IF EXISTS updated_at;

-- 4. Verificar la estructura final
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'productos'
ORDER BY ordinal_position;
