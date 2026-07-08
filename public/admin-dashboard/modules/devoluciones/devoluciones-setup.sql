-- ============================================================
-- SETUP: Módulo de Devoluciones basado en Documentos de Inventario
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Agregar columna de estado al documento (abierto/cerrado)
ALTER TABLE documentos_inventario
  ADD COLUMN IF NOT EXISTS estado text DEFAULT 'abierto';

-- 2. Agregar columnas de devolución a la tabla de detalle de documentos
ALTER TABLE documentos_inventario_detalle
  ADD COLUMN IF NOT EXISTS cantidad_devuelta numeric DEFAULT 0;

ALTER TABLE documentos_inventario_detalle
  ADD COLUMN IF NOT EXISTS fecha_devolucion date;

-- 2b. Agregar columnas de motivo de cierre (feature: motivo-cierre-materiales)
ALTER TABLE documentos_inventario_detalle
  ADD COLUMN IF NOT EXISTS motivo_cierre text;

ALTER TABLE documentos_inventario_detalle
  ADD COLUMN IF NOT EXISTS estado_especial text;

-- 3. Crear política RLS para UPDATE en documentos_inventario
DROP POLICY IF EXISTS "devoluciones_update_documentos" ON documentos_inventario;
CREATE POLICY "devoluciones_update_documentos"
ON documentos_inventario
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Crear política RLS para UPDATE en documentos_inventario_detalle
DROP POLICY IF EXISTS "devoluciones_update_detalle" ON documentos_inventario_detalle;
CREATE POLICY "devoluciones_update_detalle"
ON documentos_inventario_detalle
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Verificar estructura
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'documentos_inventario_detalle'
ORDER BY ordinal_position;
