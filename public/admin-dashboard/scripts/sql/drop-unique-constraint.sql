-- ============================================================
-- ELIMINAR RESTRICCIÓN UNIQUE — ADDBOX
-- Script para eliminar la restricción UNIQUE en productos.sku
-- ============================================================

-- Eliminar la restricción UNIQUE en sku
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_sku_key;

-- Verificar que la restricción fue eliminada
SELECT * FROM information_schema.table_constraints 
WHERE table_name = 'productos' AND constraint_type = 'UNIQUE';